begin;

-- 1. Función para eliminar receta de forma segura (Soft/Hard delete)
create or replace function public.eliminar_receta_segura(p_receta_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usado boolean := false;
begin
  -- Verificar si está en produccion_lotes
  select exists(
    select 1 
    from public.produccion_lotes 
    where receta_id = p_receta_id
  ) into v_usado;

  if v_usado then
    -- Soft delete: Actualizar el estado a ARCHIVADA
    update public.recetas 
    set estado = 'ARCHIVADA',
        updated_at = now()
    where id = p_receta_id;
    
    return json_build_object(
      'ok', true, 
      'action', 'ARCHIVED', 
      'message', 'La receta tiene histórico de producción y fue archivada de forma segura (cambió a ARCHIVADA).'
    );
  else
    -- Hard delete: Eliminar receta_insumos y luego la receta
    delete from public.receta_insumos where receta_id = p_receta_id;
    delete from public.recetas where id = p_receta_id;
    
    return json_build_object(
      'ok', true, 
      'action', 'DELETED', 
      'message', 'Receta eliminada físicamente de la base de datos con éxito.'
    );
  end if;
end;
$$;

-- 2. Función para actualizar receta y sus insumos atómicamente, recalculando costos
create or replace function public.actualizar_receta_completa(
  p_id uuid,
  p_nombre text,
  p_producto_id uuid,
  p_rendimiento numeric,
  p_rendimiento_unidades numeric,
  p_estado text,
  p_instrucciones text,
  p_insumos jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_mp_id uuid;
  v_cant numeric;
  v_costo_total numeric := 0;
  v_costo_unitario numeric;
begin
  -- 1. Actualizar campos básicos de la receta
  update public.recetas
  set nombre = p_nombre,
      producto_id = p_producto_id,
      rendimiento = p_rendimiento,
      rendimiento_unidades = p_rendimiento_unidades,
      estado = p_estado,
      instrucciones = p_instrucciones,
      updated_at = now()
  where id = p_id;

  -- 2. Eliminar ingredientes anteriores
  delete from public.receta_insumos where receta_id = p_id;

  -- 3. Insertar nuevos ingredientes y calcular costo
  if p_insumos is not null and jsonb_typeof(p_insumos) = 'array' then
    for item in select * from jsonb_array_elements(p_insumos) loop
      v_mp_id := (item->>'materia_prima_id')::uuid;
      v_cant := coalesce((item->>'cantidad_insumo')::numeric, 0);

      if v_mp_id is not null and v_cant > 0 then
        -- Insertar insumo usando gen_random_uuid()
        insert into public.receta_insumos (id, receta_id, materia_prima_id, cantidad_insumo)
        values (gen_random_uuid(), p_id, v_mp_id, v_cant);

        -- Obtener costo unitario de la materia prima
        select coalesce(costo_unitario, 0) into v_costo_unitario
        from public.materias_primas
        where id = v_mp_id;

        v_costo_total := v_costo_total + (v_cant * coalesce(v_costo_unitario, 0));
      end if;
    end loop;
  end if;

  -- 4. Actualizar el costo estimado recalculado
  update public.recetas
  set costo_estimado = v_costo_total
  where id = p_id;

  return json_build_object(
    'ok', true,
    'costo_estimado', v_costo_total,
    'message', 'Receta e insumos actualizados correctamente, costo recalculado.'
  );
exception when others then
  return json_build_object(
    'ok', false,
    'message', SQLERRM
  );
end;
$$;

commit;
