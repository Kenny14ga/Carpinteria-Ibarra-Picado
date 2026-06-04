begin;

-- 1. Asegurar que RLS esté habilitado en la tabla transacciones_sync
alter table public.transacciones_sync enable row level security;
alter table public.transacciones_sync force row level security;

-- 2. Eliminar políticas previas de inserción
drop policy if exists transacciones_sync_insert_staff on public.transacciones_sync;
drop policy if exists transacciones_sync_insert_authenticated on public.transacciones_sync;

-- 3. Crear una nueva política de INSERT que permita a cualquier usuario autenticado insertar registros
create policy transacciones_sync_insert_authenticated
on public.transacciones_sync
for insert
to authenticated
with check (true);

-- 4. Eliminar políticas previas de lectura y actualización
drop policy if exists transacciones_sync_select_superadmin on public.transacciones_sync;
drop policy if exists transacciones_sync_select_staff on public.transacciones_sync;
drop policy if exists transacciones_sync_update_superadmin on public.transacciones_sync;
drop policy if exists transacciones_sync_delete_superadmin on public.transacciones_sync;

-- 5. Crear política de lectura y actualización exclusivas para el personal (SUPERADMIN y EMPLEADO)
create policy transacciones_sync_select_staff
on public.transacciones_sync
for select
to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

create policy transacciones_sync_update_staff
on public.transacciones_sync
for update
to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'))
with check (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

create policy transacciones_sync_delete_staff
on public.transacciones_sync
for delete
to authenticated
using (public.current_app_role() in ('SUPERADMIN', 'EMPLEADO'));

-- 6. Recargar el esquema para PostgREST
notify pgrst, 'reload schema';

commit;
