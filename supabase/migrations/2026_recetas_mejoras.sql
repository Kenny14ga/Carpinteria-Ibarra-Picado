begin;

-- 1. Agregar columna de instrucciones a recetas
alter table public.recetas add column if not exists instrucciones text;

commit;
