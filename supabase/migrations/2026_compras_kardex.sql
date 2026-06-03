begin;

-- 1. Tabla de compras
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null,
  factura text not null,
  total numeric not null default 0 check (total >= 0),
  estado text not null default 'COMPLETADA',
  fecha_compra date not null default current_date,
  created_at timestamptz not null default now(),
  constraint compras_estado_check check (estado in ('COMPLETADA', 'PENDIENTE', 'CANCELADA'))
);

-- 2. Tabla de detalles de compra
create table if not exists public.compra_detalles (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  materia_prima_id uuid not null references public.materias_primas(id) on delete restrict,
  cantidad numeric not null check (cantidad > 0),
  costo_unitario numeric not null check (costo_unitario >= 0),
  fecha_vencimiento date,
  created_at timestamptz not null default now()
);

-- 3. Tabla de movimientos de inventario (Kardex)
create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null, -- ID de materias_primas o productos terminados
  tipo_movimiento text not null check (tipo_movimiento in ('ENTRADA_COMPRA', 'SALIDA_PRODUCCION', 'AJUSTE')),
  cantidad numeric not null, -- positivo para entradas, negativo para salidas
  costo_transaccion numeric not null check (costo_transaccion >= 0),
  referencia_id uuid, -- ID de la compra o lote
  created_at timestamptz not null default now()
);

-- 4. Habilitar Row Level Security (RLS) en las tablas nuevas
alter table public.compras enable row level security;
alter table public.compras force row level security;

alter table public.compra_detalles enable row level security;
alter table public.compra_detalles force row level security;

alter table public.movimientos_inventario enable row level security;
alter table public.movimientos_inventario force row level security;

-- Limpiar políticas anteriores por seguridad
drop policy if exists compras_staff_all on public.compras;
drop policy if exists compra_detalles_staff_all on public.compra_detalles;
drop policy if exists movimientos_inventario_staff_all on public.movimientos_inventario;

-- Crear políticas seguras basadas en roles
create policy compras_staff_all on public.compras
  for all to authenticated
  using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
  with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

create policy compra_detalles_staff_all on public.compra_detalles
  for all to authenticated
  using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
  with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

create policy movimientos_inventario_staff_all on public.movimientos_inventario
  for all to authenticated
  using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
  with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

-- Otorgar privilegios de acceso
grant select, insert, update, delete on public.compras to authenticated;
grant select, insert, update, delete on public.compra_detalles to authenticated;
grant select, insert, update, delete on public.movimientos_inventario to authenticated;

-- 5. Stored Procedure: registrar_compra
create or replace function public.registrar_compra(p_compra jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_compra_id uuid := gen_random_uuid();
  v_proveedor text;
  v_factura text;
  v_fecha_compra date;
  v_total numeric;
  v_detalle record;
  v_materia record;
  v_nuevo_stock numeric;
  v_nuevo_cmp numeric;
  v_nuevo_estado text;
  v_nueva_fecha_vence date;
begin
  -- Validar rol de usuario
  if public.current_app_role() not in ('SUPERADMIN', 'EMPLEADO') then
    raise exception 'No tiene permisos para registrar compras.';
  end if;

  -- Extraer datos de la cabecera
  v_proveedor := p_compra ->> 'proveedor';
  v_factura := p_compra ->> 'factura';
  v_fecha_compra := coalesce((p_compra ->> 'fecha_compra')::date, current_date);
  v_total := coalesce((p_compra ->> 'total')::numeric, 0);

  if v_proveedor is null or v_proveedor = '' then
    raise exception 'El proveedor es un campo obligatorio.';
  end if;

  if v_factura is null or v_factura = '' then
    raise exception 'El número de factura es obligatorio.';
  end if;

  -- Insertar cabecera de compra
  insert into public.compras (
    id, proveedor, factura, total, estado, fecha_compra, created_at
  ) values (
    v_compra_id, v_proveedor, v_factura, v_total, 'COMPLETADA', v_fecha_compra, now()
  );

  -- Iterar sobre los detalles del JSONB
  for v_detalle in
    select (value ->> 'materia_prima_id')::uuid as materia_prima_id,
           (value ->> 'cantidad')::numeric as cantidad,
           (value ->> 'costo_unitario')::numeric as costo_unitario,
           (value ->> 'fecha_vencimiento')::date as fecha_vencimiento
      from jsonb_array_elements(p_compra -> 'detalles')
  loop
    -- Validar detalle
    if v_detalle.materia_prima_id is null then
      raise exception 'El id del insumo es nulo en uno de los detalles.';
    end if;
    if v_detalle.cantidad is null or v_detalle.cantidad <= 0 then
      raise exception 'La cantidad de insumos debe ser mayor que cero.';
    end if;
    if v_detalle.costo_unitario is null or v_detalle.costo_unitario < 0 then
      raise exception 'El costo unitario no puede ser negativo.';
    end if;

    -- Insertar en compra_detalles
    insert into public.compra_detalles (
      compra_id, materia_prima_id, cantidad, costo_unitario, fecha_vencimiento
    ) values (
      v_compra_id, v_detalle.materia_prima_id, v_detalle.cantidad, v_detalle.costo_unitario, v_detalle.fecha_vencimiento
    );

    -- Bloquear y leer registro del insumo para el cálculo de stock y costo promedio
    select id, stock_actual, costo_unitario, stock_minimo, fecha_vencimiento, estado
      into v_materia
      from public.materias_primas
     where id = v_detalle.materia_prima_id
       for update;

    if not found then
      raise exception 'La materia prima con ID % no existe.', v_detalle.materia_prima_id;
    end if;

    -- Calcular nuevo stock
    v_nuevo_stock := coalesce(v_materia.stock_actual, 0) + v_detalle.cantidad;

    -- Calcular Costo Medio Ponderado (CMP)
    if v_nuevo_stock > 0 then
      v_nuevo_cmp := ((coalesce(v_materia.stock_actual, 0) * coalesce(v_materia.costo_unitario, 0)) + (v_detalle.cantidad * v_detalle.costo_unitario)) / v_nuevo_stock;
    else
      v_nuevo_cmp := v_detalle.costo_unitario;
    end if;

    -- Determinar nuevo estado operativo
    v_nuevo_estado := case
      when v_nuevo_stock <= 0 then 'AGOTADO'
      when v_materia.stock_minimo is not null and v_nuevo_stock <= v_materia.stock_minimo then 'STOCK_BAJO'
      else 'DISPONIBLE'
    end;

    -- Resolver fecha de vencimiento más reciente
    v_nueva_fecha_vence := coalesce(
      greatest(v_materia.fecha_vencimiento, v_detalle.fecha_vencimiento),
      v_detalle.fecha_vencimiento,
      v_materia.fecha_vencimiento
    );

    -- Actualizar materia prima
    update public.materias_primas
       set stock_actual = v_nuevo_stock,
           costo_unitario = v_nuevo_cmp,
           estado = v_nuevo_estado,
           fecha_vencimiento = v_nueva_fecha_vence,
           updated_at = now()
     where id = v_materia.id;

    -- Registrar movimiento de kárdex (ENTRADA_COMPRA)
    insert into public.movimientos_inventario (
      item_id,
      tipo_movimiento,
      cantidad,
      costo_transaccion,
      referencia_id,
      created_at
    ) values (
      v_materia.id,
      'ENTRADA_COMPRA',
      v_detalle.cantidad,
      v_detalle.costo_unitario,
      v_compra_id,
      now()
    );
  end loop;

  return jsonb_build_object(
    'compra_id', v_compra_id,
    'total', v_total,
    'estado', 'COMPLETADA'
  );
end;
$$;

grant execute on function public.registrar_compra(jsonb) to authenticated;

-- 6. Actualizar procesar_produccion para integrar las salidas en movimientos_inventario
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
  for v_insumo in
    select ri.materia_prima_id,
           ri.cantidad_insumo,
           mp.nombre,
           mp.stock_actual,
           mp.costo_unitario
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

    -- Registrar movimiento de kárdex (SALIDA_PRODUCCION) - cantidad negativa
    insert into public.movimientos_inventario (
      item_id,
      tipo_movimiento,
      cantidad,
      costo_transaccion,
      referencia_id,
      created_at
    ) values (
      v_insumo.materia_prima_id,
      'SALIDA_PRODUCCION',
      -v_total_requerido,
      v_insumo.costo_unitario,
      v_lote_id,
      now()
    );
  end loop;

  -- Paso 2: descontar materias primas.
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
  v_total_producido := v_receta.rendimiento_unidades * p_lotes;

  update public.productos
     set stock_vitrina = stock_vitrina + v_total_producido,
         es_terminado = true,
         en_vitrina = true,
         updated_at = now()
   where id = v_receta.producto_id;

  -- Registrar movimiento de kárdex de entrada para el producto terminado producido
  insert into public.movimientos_inventario (
    item_id,
    tipo_movimiento,
    cantidad,
    costo_transaccion,
    referencia_id,
    created_at
  )
  select v_receta.producto_id,
         'AJUSTE',
         v_total_producido,
         p.precio_venta,
         v_lote_id,
         now()
    from public.productos p
   where p.id = v_receta.producto_id;

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
