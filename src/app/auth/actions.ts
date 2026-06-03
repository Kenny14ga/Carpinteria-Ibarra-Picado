"use server";

import { cookies } from "next/headers";
import { POS_OFFLINE_AUTH_COOKIE } from "@/lib/authOffline";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type LogoutActionResult = {
  ok: boolean;
  message?: string;
};

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

async function clearLocalAuthCookies() {
  const cookieStore = await cookies();
  const expireCookie = (name: string) => {
    cookieStore.set(name, "", {
      path: "/",
      maxAge: 0
    });
  };

  const authCookieNames = cookieStore
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name === POS_OFFLINE_AUTH_COOKIE || isSupabaseAuthCookie(name));

  authCookieNames.forEach(expireCookie);
  expireCookie(POS_OFFLINE_AUTH_COOKIE);
}

export async function logoutAction(): Promise<LogoutActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    await clearLocalAuthCookies();

    return {
      ok: true
    };
  } catch (error) {
    await clearLocalAuthCookies();

    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo cerrar la sesion en Supabase."
    };
  }
}
