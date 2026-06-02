"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/supabase";

export type MateriaPrimaActionResult = {
  ok: boolean;
  message: string;
};

type MateriaPrimaInsert = Database["public"]["Tables"]["materias_primas"]["Insert"];
type MateriaPrimaUpdate = Database["public"]["Tables"]["materias_primas"]["Update"];

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveOrZero(rawValue: string, label: string) {
  const value = Number(rawValue || 0);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un numero igual o mayor que cero.`);
  }

  return value;
}

function readMateriaPrimaPayload(formData: FormData): MateriaPrimaInsert {
  const nombre = readText(formData, "nombre");
  const unidad = readText(formData, "unidad_medida");

  if (!nombre) {
    throw new Error("El nombre de la materia prima es obligatorio.");
  }

  if (!unidad) {
    throw new Error("La unidad de medida es obligatoria.");
  }

  return {
    sku: readText(formData, "sku") || null,
    nombre,
    categoria: readText(formData, "categoria") || null,
    unidad_medida: unidad,
    stock_actual: parsePositiveOrZero(readText(formData, "stock_actual"), "El stock actual"),
    stock_minimo: parsePositiveOrZero(readText(formData, "stock_minimo"), "El stock minimo"),
    proveedor: readText(formData, "proveedor") || null,
    fecha_vencimiento: readText(formData, "fecha_vencimiento") || null,
    costo_unitario: parsePositiveOrZero(readText(formData, "costo_unitario"), "El costo unitario"),
    estado: readText(formData, "estado") || "DISPONIBLE",
    updated_at: new Date().toISOString()
  };
}

export async function createMateriaPrimaAction(formData: FormData): Promise<MateriaPrimaActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const payload: MateriaPrimaInsert = {
      id: crypto.randomUUID(),
      ...readMateriaPrimaPayload(formData),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from("materias_primas").insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/materias-primas");
    revalidatePath("/inventario");

    return {
      ok: true,
      message: "Materia prima guardada correctamente."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo guardar la materia prima."
    };
  }
}

export async function updateMateriaPrimaAction(formData: FormData): Promise<MateriaPrimaActionResult> {
  try {
    const id = readText(formData, "id");

    if (!id) {
      throw new Error("No se recibio el identificador de la materia prima.");
    }

    const supabase = await createSupabaseServerClient();
    const payload: MateriaPrimaUpdate = readMateriaPrimaPayload(formData);

    const { error } = await supabase.from("materias_primas").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/materias-primas");
    revalidatePath("/inventario");

    return {
      ok: true,
      message: "Materia prima actualizada correctamente."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo actualizar la materia prima."
    };
  }
}

export async function deleteMateriaPrimaAction(id: string): Promise<MateriaPrimaActionResult> {
  try {
    if (!id) {
      throw new Error("No se recibio el identificador de la materia prima.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("materias_primas").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/materias-primas");
    revalidatePath("/inventario");

    return {
      ok: true,
      message: "Materia prima eliminada correctamente."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo eliminar la materia prima."
    };
  }
}
