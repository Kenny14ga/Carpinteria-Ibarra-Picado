import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { hasOfflineAuthFallback } from "@/lib/authOffline";
import type { Database } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Determinar el tipo de ruta
  const isLoginPath = pathname === "/login";
  const isRootPath = pathname === "/";
  const isAdminPath = pathname.startsWith("/admin");
  const isPosPath = pathname.startsWith("/pos") || pathname.startsWith("/dashboard");

  // Si no corresponde a una ruta de interés, omitir ejecuciones
  if (!isLoginPath && !isRootPath && !isAdminPath && !isPosPath) {
    return NextResponse.next();
  }

  // 2. Comprobar configuración de Supabase
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[middleware] Supabase no está configurado para la validación de sesión.");
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // 3. Inicializar el cliente Supabase SSR
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  try {
    // 4. Obtener usuario de Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      // Si es un error normal de sesión faltante (no de red), redirigir o continuar
      if (userError.name === "AuthSessionMissingError" || userError.message?.includes("Auth session missing")) {
        if (isAdminPath || isPosPath) {
          return redirectToLogin(request);
        }
        return response;
      }
      throw userError;
    }

    if (user) {
      // Usuario autenticado
      let role = user.user_metadata?.role || 
                 user.app_metadata?.role || 
                 user.user_metadata?.app_role || 
                 user.app_metadata?.app_role || 
                 user.user_metadata?.rol || 
                 user.app_metadata?.rol;

      // Si no está en el token JWT (metadatos), buscar en base de datos
      if (!role) {
        const { data: profile } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", user.id)
          .single();
        role = profile?.rol;
      }

      const normalizedRole = (role || "CLIENTE").toUpperCase();

      // Redirección si intenta entrar a login o raíz pública estando autenticado
      if (isLoginPath || isRootPath) {
        if (normalizedRole === "SUPERADMIN" || normalizedRole === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
        if (normalizedRole === "EMPLEADO" || normalizedRole === "VENDEDOR") {
          return NextResponse.redirect(new URL("/pos", request.url));
        }
      }

      // Proteger rutas de administración (/admin)
      if (isAdminPath) {
        if (normalizedRole !== "SUPERADMIN" && normalizedRole !== "ADMIN") {
          if (normalizedRole === "EMPLEADO" || normalizedRole === "VENDEDOR") {
            return NextResponse.redirect(new URL("/pos", request.url));
          }
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }

      // Proteger rutas del punto de venta (/pos o /dashboard)
      if (isPosPath) {
        if (
          normalizedRole !== "SUPERADMIN" &&
          normalizedRole !== "ADMIN" &&
          normalizedRole !== "EMPLEADO" &&
          normalizedRole !== "VENDEDOR"
        ) {
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }

      return response;
    } else {
      // Usuario no autenticado intentando acceder a zonas restringidas
      if (isAdminPath || isPosPath) {
        return redirectToLogin(request);
      }
      return response;
    }
  } catch (error) {
    // 5. MANEJO DE CAÍDA DE RED / OFFLINE (Bypass de validación remota)
    console.warn("[middleware] Error de red o Supabase inalcanzable. Activando validación offline...", error);

    const requestCookies = request.cookies.getAll();
    // Supabase almacena los tokens con el formato sb-[project-ref]-auth-token
    const hasSupabaseSessionCookie = requestCookies.some(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );
    // Verificar si existe cookie de fallback offline nativo del POS
    const hasLocalOfflineCookie = hasOfflineAuthFallback(request);

    const isSessionStored = hasSupabaseSessionCookie || hasLocalOfflineCookie;

    if (isSessionStored) {
      // Si hay sesión local o cookie offline, permitimos el paso a rutas restringidas
      if (isPosPath || isAdminPath) {
        return NextResponse.next();
      }

      // Si intenta ingresar a login estando logueado local/offline, lo enviamos al dashboard del POS
      if (isLoginPath) {
        return NextResponse.redirect(new URL("/pos", request.url));
      }

      return NextResponse.next();
    }

    // Si de plano no tiene cookies ni sesión local, expulsar al login
    if (isAdminPath || isPosPath) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  }
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto archivos estáticos del navegador, service worker,
     * manifiestos e imágenes para un alto rendimiento del middleware.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|LOGOS/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
