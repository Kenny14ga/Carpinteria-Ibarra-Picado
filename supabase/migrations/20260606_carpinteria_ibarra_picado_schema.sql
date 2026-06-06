begin;

-- ============================================================================
-- Base nueva: Carpintería Ibarra Picado
-- Uso recomendado: ejecutar en una base Supabase nueva desde SQL Editor.
--
-- Nota de compatibilidad:
-- El sistema actual todavía consume nombres técnicos heredados como
-- productos, materias_primas, recetas, receta_insumos y produccion_lotes.
-- En esta base esos contratos se conservan, pero su significado operativo es:
-- - productos: puertas, muebles, piezas, herrajes y productos vendibles.
-- - materias_primas: madera, tableros, barnices, tornillería, bisagras, etc.
-- - recetas: fichas técnicas de fabricación.
-- - receta_insumos: materiales requeridos por ficha técnica.
-- - produccion_lotes: órdenes o ejecuciones de taller.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- Utilidades generales
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_app_role(raw_role text)
returns text
language sql
immutable
as $$
  select case
    when upper(coalesce(nullif(raw_role, ''), 'CLIENTE')) in ('SUPERADMIN', 'ADMIN') then 'SUPERADMIN'
    when upper(coalesce(nullif(raw_role, ''), 'CLIENTE')) in ('EMPLEADO', 'VENDEDOR') then 'EMPLEADO'
    else 'CLIENTE'
  end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Perfiles y roles
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  telefono text,
  rol text not null default 'EMPLEADO',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint perfiles_rol_check check (upper(rol) in ('SUPERADMIN', 'ADMIN', 'EMPLEADO', 'VENDEDOR', 'CLIENTE'))
);

create or replace function public.current_app_role()
returns text
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
declare
  jwt_role text;
  profile_role text;
begin
  jwt_role := coalesce(
    auth.jwt() ->> 'app_role',
    auth.jwt() ->> 'rol',
    auth.jwt() -> 'app_metadata' ->> 'app_role',
    auth.jwt() -> 'app_metadata' ->> 'rol',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'app_role',
    auth.jwt() -> 'user_metadata' ->> 'rol',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );

  if public.normalize_app_role(jwt_role) <> 'CLIENTE' then
    return public.normalize_app_role(jwt_role);
  end if;

  select p.rol
    into profile_role
    from public.perfiles as p
   where p.id = auth.uid()
   limit 1;

  return public.normalize_app_role(profile_role);
end;
$$;

grant execute on function public.normalize_app_role(text) to anon, authenticated;
grant execute on function public.current_app_role() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  extracted_role text;
  final_role text;
begin
  extracted_role := coalesce(
    new.raw_user_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'rol',
    new.raw_user_meta_data ->> 'app_role'
  );

  final_role := upper(coalesce(nullif(trim(extracted_role), ''), 'EMPLEADO'));

  if final_role not in ('SUPERADMIN', 'ADMIN', 'EMPLEADO', 'VENDEDOR', 'CLIENTE') then
    final_role := 'EMPLEADO';
  end if;

  insert into public.perfiles (id, nombre, telefono, rol, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'telefono',
    final_role,
    now(),
    now()
  )
  on conflict (id) do update
     set rol = excluded.rol,
         nombre = coalesce(excluded.nombre, public.perfiles.nombre),
         telefono = coalesce(excluded.telefono, public.perfiles.telefono),
         updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- Directorios: proveedores y clientes
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  tipo text not null default 'MATERIALES',
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proveedores_tipo_check check (tipo in ('MADERA', 'HERRAJES', 'ACABADOS', 'SERVICIOS', 'MATERIALES', 'OTRO'))
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  documento text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Productos vendibles
-- alergenos se conserva como contrato técnico y se usa como etiquetas:
-- madera, acabado, instalación, herraje, línea, etc.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  nombre text not null,
  descripcion text,
  categoria text,
  tipo_producto text not null default 'PRODUCTO',
  precio_venta numeric not null default 0 check (precio_venta >= 0),
  costo_estimado numeric not null default 0 check (costo_estimado >= 0),
  imagen_url text,
  alergenos text[] not null default '{}',
  requiere_produccion boolean not null default false,
  es_terminado boolean not null default true,
  en_vitrina boolean not null default true,
  stock_vitrina numeric not null default 0 check (stock_vitrina >= 0),
  unidad_medida text not null default 'unidad',
  medidas text,
  material_principal text,
  acabado text,
  tiempo_estimado_dias integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint productos_tipo_check check (tipo_producto in ('PUERTA', 'MUEBLE', 'VENTANA', 'CLOSET', 'HERRAJE', 'SERVICIO', 'PRODUCTO', 'OTRO'))
);

-- ────────────────────────────────────────────────────────────────────────────
-- Materiales / inventario de taller
-- fecha_vencimiento se conserva como contrato técnico y se usa como
-- fecha de lote, revisión o control de insumo.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.materias_primas (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  nombre text not null,
  categoria text,
  tipo_material text not null default 'MATERIAL',
  unidad_medida text not null default 'unidad',
  stock_actual numeric not null default 0 check (stock_actual >= 0),
  stock_minimo numeric not null default 0 check (stock_minimo >= 0),
  proveedor text,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  fecha_vencimiento date,
  costo_unitario numeric not null default 0 check (costo_unitario >= 0),
  estado text not null default 'DISPONIBLE',
  ubicacion text,
  lote text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materias_tipo_check check (tipo_material in ('MADERA', 'TABLERO', 'HERRAJE', 'ACABADO', 'PEGAMENTO', 'CONSUMIBLE', 'SERVICIO', 'MATERIAL', 'OTRO')),
  constraint materias_estado_check check (estado in ('DISPONIBLE', 'STOCK_BAJO', 'AGOTADO', 'RESERVADO', 'REVISION'))
);

-- ────────────────────────────────────────────────────────────────────────────
-- Fichas técnicas de fabricación
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.recetas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references public.productos(id) on delete set null,
  nombre text not null,
  rendimiento numeric not null default 1 check (rendimiento > 0),
  rendimiento_unidades numeric not null default 1 check (rendimiento_unidades > 0),
  costo_estimado numeric not null default 0 check (costo_estimado >= 0),
  estado text not null default 'BORRADOR',
  instrucciones text,
  tiempo_estimado_horas numeric,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recetas_estado_check check (estado in ('BORRADOR', 'REVISION', 'ACTIVA', 'ARCHIVADA'))
);

create table if not exists public.receta_insumos (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas(id) on delete cascade,
  materia_prima_id uuid not null references public.materias_primas(id) on delete restrict,
  cantidad_insumo numeric not null check (cantidad_insumo > 0),
  merma_porcentaje numeric not null default 0 check (merma_porcentaje >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receta_id, materia_prima_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Taller, cotizaciones y órdenes de trabajo
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.produccion_lotes (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid references public.recetas(id) on delete set null,
  producto_id uuid references public.productos(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  nombre text not null,
  lotes integer not null default 1 check (lotes > 0),
  cantidad_planificada numeric not null default 0 check (cantidad_planificada >= 0),
  cantidad_terminada numeric not null default 0 check (cantidad_terminada >= 0),
  estado text not null default 'PLANIFICADO',
  fecha_programada date default current_date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint produccion_estado_check check (estado in ('PLANIFICADO', 'EN_PROCESO', 'PAUSADO', 'TERMINADO', 'CANCELADO'))
);

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nombre text not null,
  telefono text,
  direccion text,
  estado text not null default 'BORRADOR',
  total numeric not null default 0 check (total >= 0),
  anticipo numeric not null default 0 check (anticipo >= 0),
  fecha_solicitud date not null default current_date,
  fecha_entrega_estimada date,
  notas text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cotizaciones_estado_check check (estado in ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA'))
);

create table if not exists public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  descripcion text not null,
  cantidad numeric not null default 1 check (cantidad > 0),
  precio_unitario numeric not null default 0 check (precio_unitario >= 0),
  subtotal numeric generated always as (cantidad * precio_unitario) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.ordenes_trabajo (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nombre text not null,
  telefono text,
  direccion text,
  titulo text not null,
  descripcion text,
  estado text not null default 'PLANIFICADA',
  prioridad text not null default 'NORMAL',
  fecha_inicio date,
  fecha_entrega date,
  responsable_id uuid references auth.users(id) on delete set null,
  total numeric not null default 0 check (total >= 0),
  anticipo numeric not null default 0 check (anticipo >= 0),
  saldo numeric generated always as (greatest(total - anticipo, 0)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ordenes_estado_check check (estado in ('PLANIFICADA', 'EN_PROCESO', 'PAUSADA', 'LISTA', 'ENTREGADA', 'CANCELADA')),
  constraint ordenes_prioridad_check check (prioridad in ('BAJA', 'NORMAL', 'ALTA', 'URGENTE'))
);

create table if not exists public.orden_trabajo_materiales (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_trabajo(id) on delete cascade,
  materia_prima_id uuid references public.materias_primas(id) on delete restrict,
  descripcion text,
  cantidad numeric not null check (cantidad > 0),
  costo_unitario numeric not null default 0 check (costo_unitario >= 0),
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Compras y kárdex
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  factura text not null,
  total numeric not null default 0 check (total >= 0),
  estado text not null default 'COMPLETADA',
  fecha_compra date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compras_estado_check check (estado in ('COMPLETADA', 'PENDIENTE', 'CANCELADA'))
);

create table if not exists public.compra_detalles (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  materia_prima_id uuid not null references public.materias_primas(id) on delete restrict,
  cantidad numeric not null check (cantidad > 0),
  costo_unitario numeric not null check (costo_unitario >= 0),
  fecha_vencimiento date,
  created_at timestamptz not null default now()
);

create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  tipo_item text not null default 'MATERIAL',
  tipo_movimiento text not null,
  cantidad numeric not null,
  costo_transaccion numeric not null default 0 check (costo_transaccion >= 0),
  referencia_id text,
  notas text,
  created_at timestamptz not null default now(),
  constraint movimientos_tipo_item_check check (tipo_item in ('MATERIAL', 'PRODUCTO')),
  constraint movimientos_tipo_check check (tipo_movimiento in ('ENTRADA_COMPRA', 'SALIDA_FABRICACION', 'ENTRADA_FABRICACION', 'SALIDA_VENTA', 'AJUSTE'))
);

-- ────────────────────────────────────────────────────────────────────────────
-- POS, pedidos públicos y sincronización offline
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.ventas (
  id text primary key,
  total numeric not null default 0 check (total >= 0),
  estado text not null default 'COMPLETADA',
  usuario_id uuid references auth.users(id) on delete set null,
  creado_en_cliente timestamptz,
  created_at timestamptz not null default now(),
  constraint ventas_estado_check check (estado in ('COMPLETADA', 'ANULADA'))
);

create table if not exists public.venta_detalles (
  id uuid primary key default gen_random_uuid(),
  venta_id text not null references public.ventas(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  nombre text not null,
  cantidad numeric not null check (cantidad > 0),
  precio_unitario numeric not null check (precio_unitario >= 0),
  subtotal numeric not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  unique (venta_id, producto_id)
);

create table if not exists public.transacciones_sync (
  id uuid primary key default gen_random_uuid(),
  tipo_accion text not null,
  payload jsonb not null,
  creado_en_cliente timestamptz not null,
  estado text not null default 'PENDING',
  procesado_en_servidor timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.pedidos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  telefono text,
  direccion text,
  detalles_personalizados text,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0 check (total >= 0),
  estado text not null default 'ESPERANDO_WSP',
  created_at timestamptz not null default now(),
  constraint pedidos_clientes_estado_check check (estado in ('ESPERANDO_WSP', 'ACEPTADO', 'RECHAZADO', 'CONVERTIDO'))
);

-- ────────────────────────────────────────────────────────────────────────────
-- Índices útiles
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists productos_nombre_idx on public.productos using gin (to_tsvector('spanish', coalesce(nombre, '') || ' ' || coalesce(descripcion, '')));
create index if not exists productos_catalogo_idx on public.productos (es_terminado, en_vitrina, stock_vitrina);
create index if not exists materias_nombre_idx on public.materias_primas using gin (to_tsvector('spanish', coalesce(nombre, '') || ' ' || coalesce(categoria, '')));
create index if not exists materias_estado_idx on public.materias_primas (estado, stock_actual);
create index if not exists receta_insumos_receta_id_idx on public.receta_insumos (receta_id);
create index if not exists compra_detalles_compra_id_idx on public.compra_detalles (compra_id);
create index if not exists pedidos_clientes_estado_idx on public.pedidos_clientes (estado, created_at desc);
create index if not exists ordenes_trabajo_estado_idx on public.ordenes_trabajo (estado, fecha_entrega);

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers updated_at
-- ────────────────────────────────────────────────────────────────────────────
drop trigger if exists set_perfiles_updated_at on public.perfiles;
create trigger set_perfiles_updated_at before update on public.perfiles for each row execute function public.set_updated_at();
drop trigger if exists set_proveedores_updated_at on public.proveedores;
create trigger set_proveedores_updated_at before update on public.proveedores for each row execute function public.set_updated_at();
drop trigger if exists set_clientes_updated_at on public.clientes;
create trigger set_clientes_updated_at before update on public.clientes for each row execute function public.set_updated_at();
drop trigger if exists set_productos_updated_at on public.productos;
create trigger set_productos_updated_at before update on public.productos for each row execute function public.set_updated_at();
drop trigger if exists set_materias_updated_at on public.materias_primas;
create trigger set_materias_updated_at before update on public.materias_primas for each row execute function public.set_updated_at();
drop trigger if exists set_recetas_updated_at on public.recetas;
create trigger set_recetas_updated_at before update on public.recetas for each row execute function public.set_updated_at();
drop trigger if exists set_receta_insumos_updated_at on public.receta_insumos;
create trigger set_receta_insumos_updated_at before update on public.receta_insumos for each row execute function public.set_updated_at();
drop trigger if exists set_produccion_updated_at on public.produccion_lotes;
create trigger set_produccion_updated_at before update on public.produccion_lotes for each row execute function public.set_updated_at();
drop trigger if exists set_cotizaciones_updated_at on public.cotizaciones;
create trigger set_cotizaciones_updated_at before update on public.cotizaciones for each row execute function public.set_updated_at();
drop trigger if exists set_ordenes_trabajo_updated_at on public.ordenes_trabajo;
create trigger set_ordenes_trabajo_updated_at before update on public.ordenes_trabajo for each row execute function public.set_updated_at();
drop trigger if exists set_compras_updated_at on public.compras;
create trigger set_compras_updated_at before update on public.compras for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Función: recalcular costo de ficha técnica
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.recalcular_costo_receta(p_receta_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_costo numeric;
begin
  select coalesce(sum(ri.cantidad_insumo * mp.costo_unitario * (1 + ri.merma_porcentaje / 100)), 0)
    into v_costo
    from public.receta_insumos ri
    join public.materias_primas mp on mp.id = ri.materia_prima_id
   where ri.receta_id = p_receta_id;

  update public.recetas
     set costo_estimado = v_costo,
         updated_at = now()
   where id = p_receta_id;

  return v_costo;
end;
$$;

create or replace function public.recalcular_costo_receta_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_receta_id uuid;
begin
  if tg_op = 'DELETE' then
    v_receta_id := old.receta_id;
    perform public.recalcular_costo_receta(v_receta_id);
    return old;
  end if;

  v_receta_id := new.receta_id;
  perform public.recalcular_costo_receta(v_receta_id);
  return new;
end;
$$;

drop trigger if exists receta_insumos_recalcular_costo on public.receta_insumos;
create trigger receta_insumos_recalcular_costo
after insert or update or delete on public.receta_insumos
for each row execute function public.recalcular_costo_receta_trigger();

-- ────────────────────────────────────────────────────────────────────────────
-- Función: compra de materiales
-- ────────────────────────────────────────────────────────────────────────────
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
  v_material record;
  v_nuevo_stock numeric;
  v_nuevo_cmp numeric;
  v_nuevo_estado text;
begin
  if public.current_app_role() not in ('SUPERADMIN', 'EMPLEADO') then
    raise exception 'No tiene permisos para registrar compras.';
  end if;

  v_proveedor := nullif(trim(p_compra ->> 'proveedor'), '');
  v_factura := nullif(trim(p_compra ->> 'factura'), '');
  v_fecha_compra := coalesce((p_compra ->> 'fecha_compra')::date, current_date);
  v_total := coalesce((p_compra ->> 'total')::numeric, 0);

  if v_proveedor is null then
    raise exception 'El proveedor es obligatorio.';
  end if;

  if v_factura is null then
    raise exception 'La factura o remisión es obligatoria.';
  end if;

  insert into public.compras (id, proveedor, factura, total, estado, fecha_compra, created_by)
  values (v_compra_id, v_proveedor, v_factura, v_total, 'COMPLETADA', v_fecha_compra, auth.uid());

  for v_detalle in
    select (value ->> 'materia_prima_id')::uuid as materia_prima_id,
           (value ->> 'cantidad')::numeric as cantidad,
           (value ->> 'costo_unitario')::numeric as costo_unitario,
           nullif(value ->> 'fecha_vencimiento', '')::date as fecha_vencimiento
      from jsonb_array_elements(coalesce(p_compra -> 'detalles', '[]'::jsonb))
  loop
    if v_detalle.materia_prima_id is null then
      raise exception 'Uno de los materiales no tiene ID.';
    end if;

    if v_detalle.cantidad is null or v_detalle.cantidad <= 0 then
      raise exception 'La cantidad comprada debe ser mayor que cero.';
    end if;

    if v_detalle.costo_unitario is null or v_detalle.costo_unitario < 0 then
      raise exception 'El costo unitario no puede ser negativo.';
    end if;

    select id, stock_actual, costo_unitario, stock_minimo
      into v_material
      from public.materias_primas
     where id = v_detalle.materia_prima_id
       for update;

    if not found then
      raise exception 'El material indicado no existe.';
    end if;

    insert into public.compra_detalles (compra_id, materia_prima_id, cantidad, costo_unitario, fecha_vencimiento)
    values (v_compra_id, v_detalle.materia_prima_id, v_detalle.cantidad, v_detalle.costo_unitario, v_detalle.fecha_vencimiento);

    v_nuevo_stock := coalesce(v_material.stock_actual, 0) + v_detalle.cantidad;

    if v_nuevo_stock > 0 then
      v_nuevo_cmp := (
        (coalesce(v_material.stock_actual, 0) * coalesce(v_material.costo_unitario, 0)) +
        (v_detalle.cantidad * v_detalle.costo_unitario)
      ) / v_nuevo_stock;
    else
      v_nuevo_cmp := v_detalle.costo_unitario;
    end if;

    v_nuevo_estado := case
      when v_nuevo_stock <= 0 then 'AGOTADO'
      when v_nuevo_stock <= coalesce(v_material.stock_minimo, 0) then 'STOCK_BAJO'
      else 'DISPONIBLE'
    end;

    update public.materias_primas
       set stock_actual = v_nuevo_stock,
           costo_unitario = v_nuevo_cmp,
           estado = v_nuevo_estado,
           fecha_vencimiento = coalesce(v_detalle.fecha_vencimiento, fecha_vencimiento),
           proveedor = v_proveedor,
           updated_at = now()
     where id = v_material.id;

    insert into public.movimientos_inventario (
      item_id, tipo_item, tipo_movimiento, cantidad, costo_transaccion, referencia_id, notas
    ) values (
      v_material.id, 'MATERIAL', 'ENTRADA_COMPRA', v_detalle.cantidad, v_detalle.costo_unitario, v_compra_id::text, v_factura
    );
  end loop;

  return jsonb_build_object('compra_id', v_compra_id, 'total', v_total, 'estado', 'COMPLETADA');
end;
$$;

grant execute on function public.registrar_compra(jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Función compatible: procesar_produccion = procesar fabricación
-- ────────────────────────────────────────────────────────────────────────────
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
  v_material record;
  v_total_requerido numeric;
  v_total_producido numeric;
  v_lote_id uuid := gen_random_uuid();
  v_materiales_count integer;
begin
  if p_receta_id is null then
    raise exception 'Debe seleccionar una ficha técnica.';
  end if;

  if p_lotes is null or p_lotes <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  if p_usuario_id is null then
    raise exception 'No se recibió el usuario que procesa la fabricación.';
  end if;

  if auth.uid() is not null and auth.uid() <> p_usuario_id then
    raise exception 'El usuario de la sesión no coincide con el usuario enviado.';
  end if;

  if public.current_app_role() not in ('SUPERADMIN', 'EMPLEADO') then
    raise exception 'No tiene permisos para procesar fabricación.';
  end if;

  select r.id, r.nombre, r.producto_id, r.rendimiento_unidades
    into v_receta
    from public.recetas r
   where r.id = p_receta_id
     for update;

  if not found then
    raise exception 'La ficha técnica indicada no existe.';
  end if;

  if v_receta.producto_id is null then
    raise exception 'La ficha % no tiene producto terminado asociado.', v_receta.nombre;
  end if;

  if coalesce(v_receta.rendimiento_unidades, 0) <= 0 then
    raise exception 'La ficha % no tiene rendimiento válido.', v_receta.nombre;
  end if;

  select count(*)
    into v_materiales_count
    from public.receta_insumos
   where receta_id = p_receta_id;

  if v_materiales_count = 0 then
    raise exception 'La ficha % no tiene materiales configurados.', v_receta.nombre;
  end if;

  perform 1
    from public.productos p
   where p.id = v_receta.producto_id
     for update;

  if not found then
    raise exception 'El producto terminado asociado a la ficha no existe.';
  end if;

  for v_material in
    select ri.materia_prima_id,
           ri.cantidad_insumo,
           mp.nombre,
           mp.stock_actual,
           mp.costo_unitario
      from public.receta_insumos ri
      join public.materias_primas mp on mp.id = ri.materia_prima_id
     where ri.receta_id = p_receta_id
     order by ri.materia_prima_id
     for update of mp
  loop
    v_total_requerido := v_material.cantidad_insumo * p_lotes;

    if v_material.stock_actual < v_total_requerido then
      raise exception 'Stock insuficiente para %. Disponible: %, requerido: %.',
        v_material.nombre,
        v_material.stock_actual,
        v_total_requerido;
    end if;

    insert into public.movimientos_inventario (
      item_id, tipo_item, tipo_movimiento, cantidad, costo_transaccion, referencia_id, notas
    ) values (
      v_material.materia_prima_id,
      'MATERIAL',
      'SALIDA_FABRICACION',
      -v_total_requerido,
      v_material.costo_unitario,
      v_lote_id::text,
      v_receta.nombre
    );
  end loop;

  update public.materias_primas mp
     set stock_actual = mp.stock_actual - (ri.cantidad_insumo * p_lotes),
         estado = case
           when mp.stock_actual - (ri.cantidad_insumo * p_lotes) <= 0 then 'AGOTADO'
           when mp.stock_actual - (ri.cantidad_insumo * p_lotes) <= coalesce(mp.stock_minimo, 0) then 'STOCK_BAJO'
           else 'DISPONIBLE'
         end,
         updated_at = now()
    from public.receta_insumos ri
   where ri.receta_id = p_receta_id
     and mp.id = ri.materia_prima_id;

  v_total_producido := v_receta.rendimiento_unidades * p_lotes;

  update public.productos
     set stock_vitrina = stock_vitrina + v_total_producido,
         es_terminado = true,
         en_vitrina = true,
         updated_at = now()
   where id = v_receta.producto_id;

  insert into public.movimientos_inventario (
    item_id, tipo_item, tipo_movimiento, cantidad, costo_transaccion, referencia_id, notas
  )
  select v_receta.producto_id,
         'PRODUCTO',
         'ENTRADA_FABRICACION',
         v_total_producido,
         coalesce(r.costo_estimado, 0),
         v_lote_id::text,
         v_receta.nombre
    from public.recetas r
   where r.id = p_receta_id;

  insert into public.produccion_lotes (
    id, receta_id, producto_id, usuario_id, nombre, lotes,
    cantidad_planificada, cantidad_terminada, estado, fecha_programada
  ) values (
    v_lote_id,
    p_receta_id,
    v_receta.producto_id,
    p_usuario_id,
    'Fabricación: ' || v_receta.nombre,
    p_lotes,
    v_total_producido,
    v_total_producido,
    'TERMINADO',
    current_date
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

-- ────────────────────────────────────────────────────────────────────────────
-- Trigger POS offline: transacciones_sync CREATE_SALE
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.procesar_descuento_venta()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  item jsonb;
  p_id uuid;
  p_qty numeric;
  p_price numeric;
  p_name text;
  p_subtotal numeric;
  items_array jsonb;
  sale_id text;
begin
  if coalesce(new.tipo_accion, '') <> 'CREATE_SALE' and coalesce(new.payload ->> 'saleId', '') = '' then
    return new;
  end if;

  sale_id := coalesce(nullif(new.payload ->> 'saleId', ''), new.id::text);
  items_array := coalesce(new.payload -> 'products', new.payload -> 'cart', new.payload -> 'items', '[]'::jsonb);

  insert into public.ventas (id, total, estado, usuario_id, creado_en_cliente)
  values (
    sale_id,
    coalesce((new.payload ->> 'total')::numeric, 0),
    'COMPLETADA',
    auth.uid(),
    new.creado_en_cliente
  )
  on conflict (id) do nothing;

  if jsonb_typeof(items_array) = 'array' then
    for item in select * from jsonb_array_elements(items_array) loop
      begin
        p_id := coalesce((item ->> 'id')::uuid, (item ->> 'producto_id')::uuid);
      exception when others then
        p_id := null;
      end;

      p_qty := coalesce((item ->> 'quantity')::numeric, (item ->> 'cantidad')::numeric, 0);
      p_price := coalesce((item ->> 'unitPrice')::numeric, (item ->> 'precio_unitario')::numeric, 0);
      p_name := coalesce(item ->> 'name', item ->> 'nombre', 'Producto');
      p_subtotal := coalesce((item ->> 'subtotal')::numeric, p_qty * p_price);

      if p_id is not null and p_qty > 0 then
        update public.productos
           set stock_vitrina = greatest(coalesce(stock_vitrina, 0) - p_qty, 0),
               updated_at = now()
         where id = p_id;

        insert into public.venta_detalles (
          venta_id, producto_id, nombre, cantidad, precio_unitario, subtotal
        ) values (
          sale_id, p_id, p_name, p_qty, p_price, p_subtotal
        )
        on conflict (venta_id, producto_id) do update
           set cantidad = excluded.cantidad,
               precio_unitario = excluded.precio_unitario,
               subtotal = excluded.subtotal;

        insert into public.movimientos_inventario (
          item_id, tipo_item, tipo_movimiento, cantidad, costo_transaccion, referencia_id, notas
        ) values (
          p_id, 'PRODUCTO', 'SALIDA_VENTA', -p_qty, p_price, sale_id, p_name
        );
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists after_insert_transaccion on public.transacciones_sync;
create trigger after_insert_transaccion
after insert on public.transacciones_sync
for each row execute function public.procesar_descuento_venta();

-- ────────────────────────────────────────────────────────────────────────────
-- Limpieza de pedidos públicos no confirmados
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.clean_expired_pedidos_wsp()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.pedidos_clientes
     set estado = 'RECHAZADO'
   where estado = 'ESPERANDO_WSP'
     and created_at < now() - interval '2 hours';
end;
$$;

grant execute on function public.clean_expired_pedidos_wsp() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────
alter table public.perfiles enable row level security;
alter table public.proveedores enable row level security;
alter table public.clientes enable row level security;
alter table public.productos enable row level security;
alter table public.materias_primas enable row level security;
alter table public.recetas enable row level security;
alter table public.receta_insumos enable row level security;
alter table public.produccion_lotes enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;
alter table public.ordenes_trabajo enable row level security;
alter table public.orden_trabajo_materiales enable row level security;
alter table public.compras enable row level security;
alter table public.compra_detalles enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_detalles enable row level security;
alter table public.transacciones_sync enable row level security;
alter table public.pedidos_clientes enable row level security;

drop policy if exists perfiles_self_or_staff on public.perfiles;
create policy perfiles_self_or_staff on public.perfiles
for all to authenticated
using (id = auth.uid() or public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
with check (id = auth.uid() or public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

drop policy if exists productos_select_public on public.productos;
create policy productos_select_public on public.productos
for select to anon, authenticated
using (true);

drop policy if exists productos_staff_all on public.productos;
create policy productos_staff_all on public.productos
for all to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

drop policy if exists pedidos_clientes_insert_public on public.pedidos_clientes;
create policy pedidos_clientes_insert_public on public.pedidos_clientes
for insert to anon, authenticated
with check (true);

drop policy if exists pedidos_clientes_select_staff on public.pedidos_clientes;
create policy pedidos_clientes_select_staff on public.pedidos_clientes
for select to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

drop policy if exists pedidos_clientes_update_staff on public.pedidos_clientes;
create policy pedidos_clientes_update_staff on public.pedidos_clientes
for update to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

drop policy if exists transacciones_sync_insert_authenticated on public.transacciones_sync;
create policy transacciones_sync_insert_authenticated on public.transacciones_sync
for insert to authenticated
with check (true);

drop policy if exists transacciones_sync_staff_read on public.transacciones_sync;
create policy transacciones_sync_staff_read on public.transacciones_sync
for select to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

-- Política genérica de personal para tablas internas
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'proveedores',
    'clientes',
    'materias_primas',
    'recetas',
    'receta_insumos',
    'produccion_lotes',
    'cotizaciones',
    'cotizacion_items',
    'ordenes_trabajo',
    'orden_trabajo_materiales',
    'compras',
    'compra_detalles',
    'movimientos_inventario',
    'ventas',
    'venta_detalles'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_staff_all', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_app_role() in (''SUPERADMIN'', ''EMPLEADO'')) with check (public.current_app_role() in (''SUPERADMIN'', ''EMPLEADO''))',
      tbl || '_staff_all',
      tbl
    );
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Grants
-- ────────────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on public.productos to anon, authenticated;
grant insert on public.pedidos_clientes to anon, authenticated;
grant select, update on public.pedidos_clientes to authenticated;

grant select, insert, update, delete on
  public.perfiles,
  public.proveedores,
  public.clientes,
  public.productos,
  public.materias_primas,
  public.recetas,
  public.receta_insumos,
  public.produccion_lotes,
  public.cotizaciones,
  public.cotizacion_items,
  public.ordenes_trabajo,
  public.orden_trabajo_materiales,
  public.compras,
  public.compra_detalles,
  public.movimientos_inventario,
  public.ventas,
  public.venta_detalles,
  public.transacciones_sync
to authenticated;

-- Realtime para el tablero de pedidos públicos, si la publicación existe.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'pedidos_clientes'
     ) then
    alter publication supabase_realtime add table public.pedidos_clientes;
  end if;
exception
  when others then
    raise warning 'No se pudo agregar pedidos_clientes a realtime: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';

commit;
