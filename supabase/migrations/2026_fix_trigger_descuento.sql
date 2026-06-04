begin;

-- 1. Crear o reemplazar la función con SECURITY DEFINER y search_path seguro
create or replace function public.procesar_descuento_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  p_id uuid;
  p_qty numeric;
  items_array jsonb;
begin
  raise notice '[Trigger Discount] Ingresó nueva transacción con ID: %, Acción: %', NEW.id, NEW.tipo_accion;

  -- Detectamos si la transacción es del tipo venta (CREATE_SALE) de forma flexible
  if coalesce(NEW.tipo_accion, '') = 'CREATE_SALE' or coalesce(NEW.payload->>'saleId', '') <> '' then
    raise notice '[Trigger Discount] Es una venta. Analizando payload...';
    
    -- Seleccionamos el array de productos de forma flexible (soporta 'products', 'cart' e 'items')
    if NEW.payload->'products' is not null then
      items_array := NEW.payload->'products';
      raise notice '[Trigger Discount] Usando array "products"';
    elsif NEW.payload->'cart' is not null then
      items_array := NEW.payload->'cart';
      raise notice '[Trigger Discount] Usando array "cart"';
    else
      items_array := NEW.payload->'items';
      raise notice '[Trigger Discount] Usando array "items" (o fallback)';
    end if;

    -- Si el array es válido, iteramos sobre cada producto vendido
    if items_array is not null and jsonb_typeof(items_array) = 'array' then
      raise notice '[Trigger Discount] Array de productos contiene % elementos', jsonb_array_length(items_array);
      
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

        raise notice '[Trigger Discount] Procesando producto_id: %, cantidad a descontar: %', p_id, p_qty;

        -- Actualizamos el inventario local en la vitrina de la base de datos Supabase
        if p_id is not null and p_qty > 0 then
          update public.productos
          set stock_vitrina = coalesce(stock_vitrina, 0) - p_qty
          where id = p_id;
          
          raise notice '[Trigger Discount] Stock actualizado con éxito para producto_id: %', p_id;
        else
          raise notice '[Trigger Discount] Omitido: ID de producto nulo o cantidad <= 0';
        end if;
        
      end loop;
    else
      raise notice '[Trigger Discount] Array de productos no es válido o está vacío';
    end if;

  else
    raise notice '[Trigger Discount] Acción omitida (no es CREATE_SALE)';
  end if;

  return NEW;
end;
$$;

-- 2. Asegurar que el trigger esté enlazado
drop trigger if exists after_insert_transaccion on public.transacciones_sync;

create trigger after_insert_transaccion
after insert on public.transacciones_sync
for each row
execute function public.procesar_descuento_venta();

commit;
