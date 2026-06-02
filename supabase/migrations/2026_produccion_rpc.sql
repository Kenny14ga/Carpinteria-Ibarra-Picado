begin;

create extension if not exists pgcrypto;

-- Tabla puente: cada fila indica cuanto de una materia prima consume una receta por lote.
create table if not exists public.receta_insumos (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas(id) on delete cascade,
  materia_prima_id uuid not null references public.materias_primas(id) on delete restrict,
  cantidad_insumo numeric not null check (cantidad_insumo > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receta_id, materia_prima_id)
);

create index if not exists receta_insumos_receta_id_idx on public.receta_insumos(receta_id);
create index if not exists receta_insumos_materia_prima_id_idx on public.receta_insumos(materia_prima_id);

-- La receta necesita declarar el producto terminado que genera y el rendimiento por lote.
alter table public.recetas add column if not exists producto_id uuid references public.productos(id) on delete set null;
alter table public.recetas add column if not exists rendimiento_unidades numeric not null default 1;

-- Compatibilidad con la columna previa "rendimiento": si existe, se usa para poblar rendimiento_unidades.
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'recetas'
       and column_name = 'rendimiento'
  ) then
    update public.recetas
       set rendimiento_unidades = coalesce(nullif(rendimiento, 0), rendimiento_unidades, 1)
     where rendimiento_unidades is null or rendimiento_unidades = 1;
  end if;
end $$;

-- El log de produccion conserva quien ejecuto la operacion y cuantos lotes se procesaron.
alter table public.produccion_lotes add column if not exists usuario_id uuid references auth.users(id) on delete set null;
alter table public.produccion_lotes add column if not exists lotes integer not null default 1;

alter table public.receta_insumos enable row level security;
drop policy if exists receta_insumos_staff_all on public.receta_insumos;
create policy receta_insumos_staff_all
on public.receta_insumos
for all
to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

grant select, insert, update, delete on public.receta_insumos to authenticated;

create or replace function public.procesar_produccion(
  p_receta_id uuid,
  p_lotes integer,
  p_usuario_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_receta record;
  v_insumo record;
  v_total_requerido numeric;
  v_total_producido numeric;
  v_lote_id uuid := gen_random_uuid();
  v_insumos_count integer;
begin
  if p_receta_id is null then
    raise exception 'Debe seleccionar una receta para procesar produccion.';
  end if;

  if p_lotes is null or p_lotes <= 0 then
    raise exception 'La cantidad de lotes debe ser mayor que cero.';
  end if;

  if p_usuario_id is null then
    raise exception 'No se recibio el usuario que procesa la produccion.';
  end if;

  if auth.uid() is not null and auth.uid() <> p_usuario_id then
    raise exception 'El usuario de la sesion no coincide con el usuario enviado.';
  end if;

  if public.current_app_role() not in ('SUPERADMIN', 'EMPLEADO') then
    raise exception 'No tiene permisos para procesar produccion.';
  end if;

  -- Bloquea la receta para estabilizar producto_id y rendimiento durante la operacion.
  select r.id,
         r.nombre,
         r.producto_id,
         r.rendimiento_unidades
    into v_receta
    from public.recetas as r
   where r.id = p_receta_id
   for update;

  if not found then
    raise exception 'La receta indicada no existe.';
  end if;

  if v_receta.producto_id is null then
    raise exception 'La receta % no tiene producto terminado asociado.', v_receta.nombre;
  end if;

  if coalesce(v_receta.rendimiento_unidades, 0) <= 0 then
    raise exception 'La receta % no tiene rendimiento valido.', v_receta.nombre;
  end if;

  select count(*)
    into v_insumos_count
    from public.receta_insumos
   where receta_id = p_receta_id;

  if v_insumos_count = 0 then
    raise exception 'La receta % no tiene insumos configurados.', v_receta.nombre;
  end if;

  -- Bloquea el producto terminado antes de sumar stock para evitar carreras entre producciones.
  perform 1
    from public.productos as p
   where p.id = v_receta.producto_id
   for update;

  if not found then
    raise exception 'El producto terminado asociado a la receta no existe.';
  end if;

  -- Paso 1: bloquear y validar todos los ingredientes involucrados.
  -- Matematica por ingrediente: cantidad requerida = cantidad_insumo_por_lote * numero_de_lotes.
  for v_insumo in
    select ri.materia_prima_id,
           ri.cantidad_insumo,
           mp.nombre,
           mp.stock_actual
      from public.receta_insumos as ri
      join public.materias_primas as mp on mp.id = ri.materia_prima_id
     where ri.receta_id = p_receta_id
     order by ri.materia_prima_id
     for update of mp
  loop
    v_total_requerido := v_insumo.cantidad_insumo * p_lotes;

    if v_insumo.stock_actual < v_total_requerido then
      raise exception 'Stock insuficiente para %. Disponible: %, requerido: %.',
        v_insumo.nombre,
        v_insumo.stock_actual,
        v_total_requerido;
    end if;
  end loop;

  -- Paso 2: descontar materias primas.
  -- Matematica: nuevo_stock = stock_actual - (cantidad_insumo_por_lote * numero_de_lotes).
  update public.materias_primas as mp
     set stock_actual = mp.stock_actual - (ri.cantidad_insumo * p_lotes),
         estado = case
           when mp.stock_actual - (ri.cantidad_insumo * p_lotes) <= 0 then 'AGOTADO'
           when mp.stock_actual - (ri.cantidad_insumo * p_lotes) <= coalesce(mp.stock_minimo, 0) then 'STOCK_BAJO'
           else 'DISPONIBLE'
         end,
         updated_at = now()
    from public.receta_insumos as ri
   where ri.receta_id = p_receta_id
     and mp.id = ri.materia_prima_id;

  -- Paso 3: sumar producto terminado a vitrina.
  -- Matematica: unidades_producidas = rendimiento_unidades_por_lote * numero_de_lotes.
  v_total_producido := v_receta.rendimiento_unidades * p_lotes;

  update public.productos
     set stock_vitrina = stock_vitrina + v_total_producido,
         es_terminado = true,
         en_vitrina = true,
         updated_at = now()
   where id = v_receta.producto_id;

  -- Paso 4: registrar auditoria de la produccion terminada.
  insert into public.produccion_lotes (
    id,
    receta_id,
    producto_id,
    usuario_id,
    nombre,
    lotes,
    cantidad_planificada,
    cantidad_terminada,
    estado,
    fecha_programada,
    created_at,
    updated_at
  )
  values (
    v_lote_id,
    p_receta_id,
    v_receta.producto_id,
    p_usuario_id,
    'Produccion: ' || v_receta.nombre,
    p_lotes,
    v_total_producido,
    v_total_producido,
    'TERMINADO',
    current_date,
    now(),
    now()
  );

  return jsonb_build_object(
    'lote_id', v_lote_id,
    'receta_id', p_receta_id,
    'producto_id', v_receta.producto_id,
    'lotes', p_lotes,
    'unidades_producidas', v_total_producido
  );
end;
$$;

grant execute on function public.procesar_produccion(uuid, integer, uuid) to authenticated;

commit;
