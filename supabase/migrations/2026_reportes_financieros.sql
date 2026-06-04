begin;

-- Crear o reemplazar la función para obtener el reporte financiero
create or replace function public.obtener_reporte_financiero(
  p_fecha_inicio date,
  p_fecha_fin date
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_ingresos numeric := 0;
  v_total_costos numeric := 0;
  v_ganancia_neta numeric := 0;
  v_numero_ventas integer := 0;
begin
  -- 1. Calcular ingresos totales y número de ventas
  select 
    coalesce(sum(coalesce((payload->>'total')::numeric, 0)), 0),
    count(*)
  into 
    v_total_ingresos,
    v_numero_ventas
  from public.transacciones_sync
  where tipo_accion = 'CREATE_SALE'
    and creado_en_cliente >= p_fecha_inicio::timestamptz
    and creado_en_cliente < (p_fecha_fin::date + 1)::timestamptz;

  -- 2. Calcular costos de producción (COGS)
  with ventas as (
    select payload
    from public.transacciones_sync
    where tipo_accion = 'CREATE_SALE'
      and creado_en_cliente >= p_fecha_inicio::timestamptz
      and creado_en_cliente < (p_fecha_fin::date + 1)::timestamptz
  ),
  items_vendidos as (
    select 
      coalesce((item->>'id')::uuid, (item->>'producto_id')::uuid) as prod_id,
      coalesce((item->>'quantity')::numeric, (item->>'cantidad')::numeric, 0) as cant
    from ventas,
    lateral jsonb_array_elements(
      case 
        when payload->'products' is not null then payload->'products'
        when payload->'cart' is not null then payload->'cart'
        else payload->'items'
      end
    ) as item
  )
  select 
    coalesce(sum(iv.cant * coalesce(r.costo_estimado, 0)), 0)
  into 
    v_total_costos
  from items_vendidos iv
  left join public.productos p on p.id = iv.prod_id
  left join (
    -- Evitamos duplicación si un producto tiene varias recetas tomando el costo estimado máximo
    select producto_id, max(costo_estimado) as costo_estimado
    from public.recetas
    group by producto_id
  ) r on r.producto_id = p.id;

  -- 3. Calcular ganancia neta
  v_ganancia_neta := v_total_ingresos - v_total_costos;

  -- 4. Retornar el objeto JSON
  return json_build_object(
    'total_ingresos', v_total_ingresos,
    'total_costos', v_total_costos,
    'ganancia_neta', v_ganancia_neta,
    'numero_ventas', v_numero_ventas
  );
end;
$$;

commit;
