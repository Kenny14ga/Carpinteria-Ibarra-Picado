"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/supabase";

export type RecetaActionResult = {
  ok: boolean;
  message: string;
};

type RecetaInsert = Database["public"]["Tables"]["recetas"]["Insert"];

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseNumber(rawValue: string, label: string) {
  const value = Number(rawValue || 0);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un numero igual o mayor que cero.`);
  }
  return value;
}

export async function createRecetaAction(formData: FormData): Promise<RecetaActionResult> {
  try {
    const nombre = readText(formData, "nombre");

    if (!nombre) {
      throw new Error("El nombre de la receta es obligatorio.");
    }

    const payload: RecetaInsert = {
      id: crypto.randomUUID(),
      nombre,
      producto_id: readText(formData, "producto_id") || null,
      rendimiento: parseNumber(readText(formData, "rendimiento"), "El rendimiento"),
      rendimiento_unidades: parseNumber(readText(formData, "rendimiento"), "El rendimiento"),
      costo_estimado: parseNumber(readText(formData, "costo_estimado"), "El costo estimado"),
      estado: readText(formData, "estado") || "BORRADOR",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("recetas").insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/recetas");
    revalidatePath("/");

    return { ok: true, message: "Receta creada correctamente." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo crear la receta." };
  }
}
