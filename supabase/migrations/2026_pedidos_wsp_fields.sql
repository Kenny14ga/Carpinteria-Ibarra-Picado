begin;

-- 1. Crear la tabla de pedidos de clientes si no existe (con las nuevas columnas)
create table if not exists public.pedidos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  telefono text,
  direccion text,
  detalles_personalizados text,
  items jsonb not null,
  total numeric not null,
  estado text not null default 'ESPERANDO_WSP',
  created_at timestamptz not null default now(),
  constraint pedidos_clientes_estado_check check (estado in ('ESPERANDO_WSP', 'ACEPTADO', 'RECHAZADO'))
);

-- 2. Agregar nuevas columnas si la tabla ya existía
alter table public.pedidos_clientes add column if not exists telefono text;
alter table public.pedidos_clientes add column if not exists direccion text;
alter table public.pedidos_clientes add column if not exists detalles_personalizados text;

-- 3. Habilitar la tabla en la publicación de Realtime de Supabase
alter publication supabase_realtime add table public.pedidos_clientes;

-- 4. Recargar el esquema para PostgREST
notify pgrst, 'reload schema';

commit;
