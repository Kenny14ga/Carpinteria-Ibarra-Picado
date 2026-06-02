begin;

-- 1. Crear tabla de perfiles (requisito de RLS y roles de negocio)
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null default 'CLIENTE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint perfiles_rol_check check (upper(rol) in ('SUPERADMIN', 'ADMIN', 'EMPLEADO', 'VENDEDOR', 'CLIENTE'))
);

-- 2. Crear funciones de normalización y resolución de roles
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

-- 3. Crear o actualizar tablas operativas
create table if not exists public.productos (
  id uuid primary key,
  nombre text not null,
  descripcion text,
  precio_venta numeric not null default 0,
  imagen_url text,
  alergenos text[] not null default '{}',
  requiere_produccion boolean not null default false,
  es_terminado boolean not null default true,
  en_vitrina boolean not null default true,
  stock_vitrina numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Asegurar que las columnas existan si la tabla ya existía
alter table public.productos add column if not exists descripcion text;
alter table public.productos add column if not exists precio_venta numeric not null default 0;
alter table public.productos add column if not exists imagen_url text;
alter table public.productos add column if not exists alergenos text[] not null default '{}';
alter table public.productos add column if not exists requiere_produccion boolean not null default false;
alter table public.productos add column if not exists es_terminado boolean not null default true;
alter table public.productos add column if not exists en_vitrina boolean not null default true;
alter table public.productos add column if not exists stock_vitrina numeric not null default 0;
alter table public.productos add column if not exists created_at timestamptz not null default now();
alter table public.productos add column if not exists updated_at timestamptz not null default now();

create table if not exists public.materias_primas (
  id uuid primary key,
  sku text,
  nombre text not null,
  categoria text,
  unidad_medida text not null default 'unidad',
  stock_actual numeric not null default 0,
  stock_minimo numeric not null default 0,
  proveedor text,
  fecha_vencimiento date,
  costo_unitario numeric not null default 0,
  estado text not null default 'DISPONIBLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Si recetas ya existía pero con la estructura de ingredientes anterior, la actualizamos.
-- Eliminamos restricciones y columnas viejas de recetas para transformarla en recetas maestras.
do $$
begin
  if exists (
    select 1 
    from information_schema.columns 
    where table_name = 'recetas' and column_name = 'materia_prima_id'
  ) then
    -- Respaldamos o limpiamos la tabla vieja que era de relación (join table de ingredientes)
    truncate table public.recetas cascade;
    alter table public.recetas drop column if exists materia_prima_id;
    alter table public.recetas drop column if exists cantidad_necesaria;
    alter table public.recetas drop column if exists sync_status;
  end if;
end $$;

create table if not exists public.recetas (
  id uuid primary key,
  producto_id uuid references public.productos(id) on delete set null,
  nombre text not null,
  rendimiento numeric not null default 1,
  costo_estimado numeric not null default 0,
  estado text not null default 'BORRADOR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recetas add column if not exists nombre text;
alter table public.recetas add column if not exists rendimiento numeric not null default 1;
alter table public.recetas add column if not exists costo_estimado numeric not null default 0;
alter table public.recetas add column if not exists estado text not null default 'BORRADOR';

create table if not exists public.produccion_lotes (
  id uuid primary key,
  receta_id uuid references public.recetas(id) on delete set null,
  producto_id uuid references public.productos(id) on delete set null,
  nombre text not null,
  cantidad_planificada numeric not null default 0,
  cantidad_terminada numeric not null default 0,
  estado text not null default 'PLANIFICADO',
  fecha_programada date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Activar políticas RLS en todas las tablas
alter table public.productos enable row level security;
alter table public.materias_primas enable row level security;
alter table public.recetas enable row level security;
alter table public.produccion_lotes enable row level security;

-- Limpieza de políticas previas para evitar duplicidad o colisión
drop policy if exists productos_select_all on public.productos;
drop policy if exists materias_primas_staff_all on public.materias_primas;
drop policy if exists recetas_staff_all on public.recetas;
drop policy if exists produccion_lotes_staff_all on public.produccion_lotes;

-- Crear políticas seguras basadas en roles normalized
create policy productos_select_all on public.productos for select to anon, authenticated using (true);
create policy materias_primas_staff_all on public.materias_primas for all to authenticated using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO')) with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));
create policy recetas_staff_all on public.recetas for all to authenticated using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO')) with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));
create policy produccion_lotes_staff_all on public.produccion_lotes for all to authenticated using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO')) with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

-- 5. Dar privilegios a los roles de Supabase
grant select on public.productos to anon, authenticated;
grant insert, update, delete on public.productos to authenticated;
grant select, insert, update, delete on public.materias_primas to authenticated;
grant select, insert, update, delete on public.recetas to authenticated;
grant select, insert, update, delete on public.produccion_lotes to authenticated;

commit;
