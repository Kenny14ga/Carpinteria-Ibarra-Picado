"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type LoginActionResult = {
  ok: boolean;
  message: string;
  redirectTo?: string;
};

export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return {
      ok: false,
      message: "Por favor complete todos los campos obligatorios."
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (authError) {
      return {
        ok: false,
        message: "Credenciales inválidas. Verifique su correo y contraseña."
      };
    }

    if (!user) {
      return {
        ok: false,
        message: "Ocurrió un error inesperado al autenticar al usuario."
      };
    }

    // Resolver el rol del usuario:
    // 1. Revisar metadatos del usuario (user_metadata o app_metadata)
    let role = user.user_metadata?.role || 
               user.app_metadata?.role || 
               user.user_metadata?.app_role || 
               user.app_metadata?.app_role || 
               user.user_metadata?.rol || 
               user.app_metadata?.rol;

    // 2. Si no viene en metadatos, consultar la tabla de perfiles en base de datos
    if (!role) {
      const { data: profile, error: profileError } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (!profileError && profile) {
        role = profile.rol;
      }
    }

    // Normalizar rol
    const normalizedRole = (role || "CLIENTE").toUpperCase();

    // Determinar redirección basada en rol de negocio
    let redirectTo = "";
    if (normalizedRole === "SUPERADMIN" || normalizedRole === "ADMIN") {
      redirectTo = "/admin";
    } else if (normalizedRole === "EMPLEADO" || normalizedRole === "VENDEDOR") {
      redirectTo = "/pos";
    } else {
      // Si el rol es CLIENTE o no tiene privilegios operativos, expulsamos
      await supabase.auth.signOut();
      return {
        ok: false,
        message: "Acceso no autorizado. Este portal es exclusivo para empleados."
      };
    }

    return {
      ok: true,
      message: "Sesión iniciada correctamente.",
      redirectTo
    };
  } catch (error) {
    console.error("[loginAction] Error en autenticación:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Error al conectar con el servidor de autenticación."
    };
  }
}
