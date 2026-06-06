"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type ProcesarProduccionActionResult =
  | {
      success: true;
      data: {
        lote_id: string;
        receta_id: string;
        producto_id: string;
        lotes: number;
        unidades_producidas: number;
      };
    }
  | {
      success: false;
      error: string;
    };

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(formData: FormData, key: string) {
  const value = Number(readText(formData, key));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("La cantidad de órdenes debe ser un número entero mayor que cero.");
  }

  return value;
}

function formatRpcError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo procesar la fabricación.";
}

export async function procesarProduccionAction(formData: FormData): Promise<ProcesarProduccionActionResult> {
  try {
    const recetaId = readText(formData, "receta_id");

    if (!recetaId) {
      throw new Error("Debe seleccionar una ficha técnica.");
    }

    const lotes = readPositiveInteger(formData, "lotes");
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message ?? "Debe iniciar sesión para procesar fabricación.");
    }

    const usuarioId = readText(formData, "usuario_id") || user.id;

    const { data, error } = await supabase.rpc("procesar_produccion", {
      p_receta_id: recetaId,
      p_lotes: lotes,
      p_usuario_id: usuarioId
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/inventario");
    revalidatePath("/produccion");
    revalidatePath("/productos");
    revalidatePath("/reportes");
    revalidatePath("/");

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: formatRpcError(error)
    };
  }
}
