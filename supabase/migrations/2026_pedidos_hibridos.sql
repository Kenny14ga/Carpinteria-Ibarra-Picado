begin;

-- 1. Crear la tabla de pedidos de clientes
create table if not exists public.pedidos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  items jsonb not null,
  total numeric not null,
  estado text not null default 'ESPERANDO_WSP',
  created_at timestamptz not null default now(),
  constraint pedidos_clientes_estado_check check (estado in ('ESPERANDO_WSP', 'ACEPTADO', 'RECHAZADO'))
);

-- 2. Habilitar Row Level Security (RLS)
alter table public.pedidos_clientes enable row level security;
alter table public.pedidos_clientes force row level security;

-- 3. Crear políticas RLS seguras
drop policy if exists pedidos_clientes_insert_public on public.pedidos_clientes;
drop policy if exists pedidos_clientes_select_staff on public.pedidos_clientes;
drop policy if exists pedidos_clientes_update_staff on public.pedidos_clientes;

-- Permitir a cualquier cliente (anon o authenticated) crear pedidos
create policy pedidos_clientes_insert_public
on public.pedidos_clientes
for insert
to anon, authenticated
with check (true);

-- Restringir la lectura de pedidos únicamente al personal de la tienda
create policy pedidos_clientes_select_staff
on public.pedidos_clientes
for select
to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

-- Restringir la actualización del estado de pedidos únicamente al personal de la tienda
create policy pedidos_clientes_update_staff
on public.pedidos_clientes
for update
to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

-- 4. Otorgar permisos a los roles de Supabase
grant insert, select, update on public.pedidos_clientes to anon, authenticated;

-- 5. Crear la función de limpieza anti-spam
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

-- 6. Intentar programar la ejecución por hora con pg_cron si está disponible
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Evitar duplicados si ya está programado
    perform cron.unschedule('clean-expired-wsp-pedidos');
    perform cron.schedule('clean-expired-wsp-pedidos', '0 * * * *', 'select public.clean_expired_pedidos_wsp()');
  end if;
exception
  when others then
    raise warning 'No se pudo configurar pg_cron automáticamente en la migración: %', sqlerrm;
end $$;

commit;
