-- ============================================================================
-- MIGRACIÓN: Sincronización automática auth.users → public.perfiles
-- ============================================================================
-- Flujo: auth.users (fuente de verdad) ──► public.perfiles (tabla pública)
--
-- Este script crea dos funciones + dos triggers que garantizan que:
--   1. Al CREAR un usuario en auth.users, se cree automáticamente su perfil.
--   2. Al ACTUALIZAR raw_user_meta_data en auth.users, se sincronice el rol.
--
-- CÓMO SE MAPEA EL ROL:
--   auth.users.raw_user_meta_data es un campo JSONB. Cuando tu app crea un
--   usuario con `user_metadata: { role: "admin" }`, Supabase lo almacena en
--   raw_user_meta_data->>'role'.
--
--   Esta función lee ese valor, lo normaliza a MAYÚSCULAS y lo valida contra
--   los roles permitidos: SUPERADMIN, ADMIN, EMPLEADO, VENDEDOR, CLIENTE.
--   Si no existe la clave 'role' en el JSON, asigna 'EMPLEADO' por defecto.
--
-- SEGURIDAD:
--   Ambas funciones usan SECURITY DEFINER para ejecutarse con los privilegios
--   del owner (postgres/supabase_admin), pudiendo así leer auth.* y escribir
--   en public.perfiles sin interferencia de políticas RLS.
--
-- EJECUCIÓN:
--   Copiar TODO este SQL en el SQL Editor de Supabase Dashboard y ejecutar.
--   No requiere wrapping en BEGIN/COMMIT; cada CREATE OR REPLACE es atómico.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN 1: handle_new_user
-- Se dispara DESPUÉS de INSERT en auth.users.
-- Crea un registro en public.perfiles con el rol extraído de raw_user_meta_data.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER                              -- Ejecuta con privilegios del owner
SET search_path = public, auth, pg_temp       -- Aislamiento de search_path
AS $$
DECLARE
  _extracted_role TEXT;
  _final_role     TEXT;
BEGIN
  -- ┌───────────────────────────────────────────────────────────────────┐
  -- │ EXTRACCIÓN DEL ROL desde raw_user_meta_data (JSONB)              │
  -- │                                                                   │
  -- │ Supabase almacena user_metadata en la columna                     │
  -- │ auth.users.raw_user_meta_data. Al crear un usuario con:           │
  -- │   user_metadata: { role: "admin", nombre: "Juan" }               │
  -- │                                                                   │
  -- │ El JSONB resultante es: {"role":"admin","nombre":"Juan"}          │
  -- │                                                                   │
  -- │ Usamos el operador ->> para extraer el valor como TEXT:           │
  -- │   NEW.raw_user_meta_data->>'role'  → 'admin'                     │
  -- │                                                                   │
  -- │ También revisamos la clave 'rol' (español) como fallback.        │
  -- └───────────────────────────────────────────────────────────────────┘
  _extracted_role := COALESCE(
    NEW.raw_user_meta_data->>'role',     -- Clave en inglés (prioridad)
    NEW.raw_user_meta_data->>'rol',      -- Clave en español (fallback)
    NEW.raw_user_meta_data->>'app_role'  -- Clave alternativa
  );

  -- ┌───────────────────────────────────────────────────────────────────┐
  -- │ NORMALIZACIÓN Y VALIDACIÓN                                        │
  -- │                                                                   │
  -- │ Si se extrajo un rol, lo convertimos a MAYÚSCULAS para que        │
  -- │ coincida con el CHECK constraint de public.perfiles:              │
  -- │   CHECK (upper(rol) IN ('SUPERADMIN','ADMIN','EMPLEADO',          │
  -- │                         'VENDEDOR','CLIENTE'))                     │
  -- │                                                                   │
  -- │ Si el valor no es válido o es NULL, asignamos 'EMPLEADO'.         │
  -- └───────────────────────────────────────────────────────────────────┘
  IF _extracted_role IS NOT NULL AND TRIM(_extracted_role) <> '' THEN
    _final_role := UPPER(TRIM(_extracted_role));
    -- Validar que sea un rol conocido
    IF _final_role NOT IN ('SUPERADMIN', 'ADMIN', 'EMPLEADO', 'VENDEDOR', 'CLIENTE') THEN
      _final_role := 'EMPLEADO';  -- Rol por defecto si el valor no es reconocido
    END IF;
  ELSE
    _final_role := 'EMPLEADO';    -- Rol por defecto si no existe la clave
  END IF;

  -- ┌───────────────────────────────────────────────────────────────────┐
  -- │ INSERCIÓN EN public.perfiles                                      │
  -- │                                                                   │
  -- │ ON CONFLICT: Si por alguna razón ya existe el perfil (e.g.,       │
  -- │ inserción manual previa), actualizamos el rol en vez de fallar.   │
  -- └───────────────────────────────────────────────────────────────────┘
  INSERT INTO public.perfiles (id, rol, created_at, updated_at)
  VALUES (NEW.id, _final_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
    SET rol        = EXCLUDED.rol,
        updated_at = NOW();

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- ⚠️ No propagamos la excepción para no bloquear el registro del
    -- usuario en auth.users. El perfil se puede crear manualmente después.
    RAISE WARNING '[handle_new_user] Error al crear perfil para usuario %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Comentario descriptivo para documentación en el catálogo de PostgreSQL
COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function: crea automáticamente un registro en public.perfiles '
  'cuando se inserta un nuevo usuario en auth.users. Extrae el rol desde '
  'raw_user_meta_data->>''role'' y lo normaliza a MAYÚSCULAS.';


-- ────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN 2: handle_update_user
-- Se dispara DESPUÉS de UPDATE en auth.users.
-- Sincroniza el rol en public.perfiles cuando cambia raw_user_meta_data.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  _extracted_role TEXT;
  _final_role     TEXT;
BEGIN
  -- ┌───────────────────────────────────────────────────────────────────┐
  -- │ OPTIMIZACIÓN: Solo actuar si raw_user_meta_data realmente cambió │
  -- │                                                                   │
  -- │ Comparamos OLD vs NEW para evitar actualizaciones innecesarias    │
  -- │ cuando se modifiquen otros campos de auth.users (ej. last_sign_in)│
  -- └───────────────────────────────────────────────────────────────────┘
  IF OLD.raw_user_meta_data IS NOT DISTINCT FROM NEW.raw_user_meta_data THEN
    -- raw_user_meta_data no cambió, no hacemos nada
    RETURN NEW;
  END IF;

  -- Extraer el rol del JSONB actualizado (misma lógica que handle_new_user)
  _extracted_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'rol',
    NEW.raw_user_meta_data->>'app_role'
  );

  -- Si no hay clave de rol en los metadatos actualizados, no modificamos perfiles
  IF _extracted_role IS NULL OR TRIM(_extracted_role) = '' THEN
    RETURN NEW;
  END IF;

  -- Normalizar y validar
  _final_role := UPPER(TRIM(_extracted_role));
  IF _final_role NOT IN ('SUPERADMIN', 'ADMIN', 'EMPLEADO', 'VENDEDOR', 'CLIENTE') THEN
    -- Si el valor no es válido, no actualizamos para no romper datos existentes
    RAISE WARNING '[handle_update_user] Rol no reconocido "%" para usuario %. Se ignora la actualización.',
      _extracted_role, NEW.id;
    RETURN NEW;
  END IF;

  -- ┌───────────────────────────────────────────────────────────────────┐
  -- │ ACTUALIZACIÓN EN public.perfiles                                  │
  -- │                                                                   │
  -- │ Solo actualiza si el perfil ya existe (no crea uno nuevo aquí).   │
  -- │ Si el perfil no existe, handle_new_user debió haberlo creado.     │
  -- │ En caso de que no exista, lo insertamos como medida de seguridad. │
  -- └───────────────────────────────────────────────────────────────────┘
  INSERT INTO public.perfiles (id, rol, created_at, updated_at)
  VALUES (NEW.id, _final_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
    SET rol        = EXCLUDED.rol,
        updated_at = NOW();

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_update_user] Error al sincronizar perfil para usuario %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_update_user() IS
  'Trigger function: sincroniza el rol en public.perfiles cuando se actualiza '
  'raw_user_meta_data en auth.users. Solo actúa si los metadatos cambiaron.';


-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGERS en auth.users
-- ────────────────────────────────────────────────────────────────────────────

-- Eliminar triggers previos si existen (idempotencia)
DROP TRIGGER IF EXISTS on_auth_user_created  ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated  ON auth.users;

-- Trigger 1: Nuevo usuario → crear perfil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger 2: Usuario actualizado → sincronizar rol
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_user();

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional): Ejecutar después para confirmar que los triggers
-- están registrados correctamente.
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'auth'
--   AND event_object_table = 'users';
