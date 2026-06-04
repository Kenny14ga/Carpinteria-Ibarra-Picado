-- 1. Crear función para procesar el descuento de stock en vitrina
create or replace function public.procesar_descuento_venta()
returns trigger
language plpgsql
security definer
as $$
declare
  item jsonb;
  p_id uuid;
  p_qty numeric;
  items_array jsonb;
begin
  -- Detectamos si la transacción es del tipo venta (CREATE_SALE) de forma flexible
  if coalesce(NEW.tipo_accion, '') = 'CREATE_SALE' or coalesce(NEW.payload->>'saleId', '') <> '' then
    
    -- Seleccionamos el array de productos de forma flexible (soporta 'products' e 'items')
    if NEW.payload->'products' is not null then
      items_array := NEW.payload->'products';
    else
      items_array := NEW.payload->'items';
    end if;

    -- Si el array es válido, iteramos sobre cada producto vendido
    if items_array is not null and jsonb_typeof(items_array) = 'array' then
      for item in select * from jsonb_array_elements(items_array) loop
        
        -- Extraemos el ID del producto (soporta 'id' y 'producto_id') de manera segura
        begin
          p_id := coalesce(
            (item->>'id')::uuid,
            (item->>'producto_id')::uuid
          );
        exception when others then
          p_id := null;
        end;
        
        -- Extraemos la cantidad (soporta 'quantity' y 'cantidad') de manera segura
        begin
          p_qty := coalesce(
            (item->>'quantity')::numeric,
            (item->>'cantidad')::numeric,
            0
          );
        exception when others then
          p_qty := 0;
        end;

        -- Actualizamos el inventario local en la vitrina de la base de datos Supabase
        if p_id is not null and p_qty > 0 then
          update public.productos
          set stock_vitrina = coalesce(stock_vitrina, 0) - p_qty
          where id = p_id;
        end if;
        
      end loop;
    end if;

  end if;
  return NEW;
end;
$$;

-- 2. Crear trigger que se ejecuta AFTER INSERT en la tabla transacciones_sync
drop trigger if exists after_insert_transaccion on public.transacciones_sync;

create trigger after_insert_transaccion
after insert on public.transacciones_sync
for each row
execute function public.procesar_descuento_venta();
