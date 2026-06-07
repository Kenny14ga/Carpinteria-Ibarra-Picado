"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type ReporteFinancieroData = {
  total_ingresos: number;
  total_costos: number;
  ganancia_neta: number;
  numero_ventas: number;
};

export type ReporteActionResult = {
  ok: boolean;
  message: string;
  data?: ReporteFinancieroData;
};

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

export async function obtenerReporteFinancieroAction(
  fechaInicio: string,
  fechaFin: string
): Promise<ReporteActionResult> {
  try {
    await assertAdminAccess();

    if (!fechaInicio || !fechaFin) {
      throw new Error("Debe proporcionar una fecha de inicio y una fecha de fin.");
    }

    const ssrClient = await createSupabaseServerClient();
    
    // Llamar al RPC obtener_reporte_financiero
    const { data, error } = await ssrClient.rpc("obtener_reporte_financiero", {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });

    if (error) {
      console.error("Error al ejecutar RPC obtener_reporte_financiero:", error);
      throw new Error(error.message);
    }

    return {
      ok: true,
      message: "Reporte generado correctamente.",
      data
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Error al procesar el reporte financiero."
    };
  }
}
