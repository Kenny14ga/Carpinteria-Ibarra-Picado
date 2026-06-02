"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

export type UserActionResult = {
  ok: boolean;
  message: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdminClient() {
  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes("replace-this")) {
    throw new Error("Supabase URL o Service Role Key no configurados en el servidor.");
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function assertAdminAccess() {
  const ssrClient = await createSupabaseServerClient();
  const { data: { user }, error } = await ssrClient.auth.getUser();

  if (error || !user) {
    throw new Error("No autorizado. Debe iniciar sesión.");
  }

  let role = user.user_metadata?.role || 
             user.app_metadata?.role || 
             user.user_metadata?.app_role || 
             user.app_metadata?.app_role || 
             user.user_metadata?.rol || 
             user.app_metadata?.rol;

  if (!role) {
    const { data: profile } = await ssrClient
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();
    role = profile?.rol;
  }

  const normalizedRole = (role || "CLIENTE").toUpperCase();
  if (normalizedRole !== "SUPERADMIN" && normalizedRole !== "ADMIN") {
    throw new Error("No autorizado. Privilegios de administrador requeridos.");
  }
}

export async function createUserAction(formData: FormData): Promise<UserActionResult> {
  try {
    await assertAdminAccess();

    const email = formData.get("email");
    const password = formData.get("password");
    const nombre = formData.get("nombre");
    const rol = formData.get("rol"); // 'admin' o 'vendedor'

    if (
      typeof email !== "string" || 
      typeof password !== "string" || 
      typeof nombre !== "string" || 
      typeof rol !== "string" ||
      !email || !password || !nombre || !rol
    ) {
      throw new Error("Por favor rellene todos los campos obligatorios.");
    }

    if (password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    const uppercaseRol = rol.toUpperCase();
    if (uppercaseRol !== "ADMIN" && uppercaseRol !== "VENDEDOR") {
      throw new Error("Rol inválido. Debe ser Administrador o Vendedor.");
    }

    const adminClient = getSupabaseAdminClient();

    // Crear usuario en Auth con confirmación automática de email
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre.trim(),
        role: rol.toLowerCase()
      }
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("No se pudo crear el registro de autenticación del usuario.");
    }

    // Insertar en la tabla pública de perfiles
    const { error: profileError } = await adminClient
      .from("perfiles")
      .insert({
        id: authData.user.id,
        rol: uppercaseRol
      });

    if (profileError) {
      // Rollback: Si falla la inserción del perfil, eliminamos el usuario de Auth para evitar huérfanos
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Error al crear el perfil del empleado: ${profileError.message}`);
    }

    revalidatePath("/admin/usuarios");

    return {
      ok: true,
      message: `Usuario ${nombre} creado correctamente.`
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Error al procesar la creación de usuario."
    };
  }
}

export async function deleteUserAction(id: string): Promise<UserActionResult> {
  try {
    await assertAdminAccess();

    if (!id) {
      throw new Error("Identificador del usuario no especificado.");
    }

    const adminClient = getSupabaseAdminClient();

    // Eliminar de Supabase Auth (dispara CASCADE delete en public.perfiles)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath("/admin/usuarios");

    return {
      ok: true,
      message: "Usuario dado de baja correctamente."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Error al dar de baja al usuario."
    };
  }
}
