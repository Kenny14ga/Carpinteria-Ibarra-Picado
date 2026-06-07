"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database, Json } from "@/lib/supabase";

export type RecetaActionResult = {
  ok: boolean;
  message: string;
};

type RecetaInsert = Database["public"]["Tables"]["recetas"]["Insert"];

type RecetaInsumoFormInput = {
  materia_prima_id: string;
  cantidad_insumo: number;
};

type RecetaInsumoRpcInput = RecetaInsumoFormInput;

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
    await assertAdminAccess();
    const nombre = readText(formData, "nombre");

    if (!nombre) {
      throw new Error("El nombre de la ficha es obligatorio.");
    }

    const recipeId = crypto.randomUUID();
    const payload: RecetaInsert = {
      id: recipeId,
      nombre,
      producto_id: readText(formData, "producto_id") || null,
      rendimiento: parseNumber(readText(formData, "rendimiento"), "El rendimiento"),
      rendimiento_unidades: parseNumber(readText(formData, "rendimiento"), "El rendimiento"),
      costo_estimado: parseNumber(readText(formData, "costo_estimado"), "El costo estimado"),
      estado: readText(formData, "estado") || "BORRADOR",
      instrucciones: readText(formData, "instrucciones") || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("recetas").insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    // Insertar receta_insumos si se provee el JSON de materiales.
    const insumosJson = readText(formData, "insumos_json");
    if (insumosJson) {
      const insumos = JSON.parse(insumosJson) as RecetaInsumoFormInput[];

      const validInsumos = insumos.filter(
        (ins) => ins.materia_prima_id.trim() !== "" && ins.cantidad_insumo > 0
      );

      if (validInsumos.length > 0) {
        const insumosPayload = validInsumos.map((ins) => ({
          id: crypto.randomUUID(),
          receta_id: recipeId,
          materia_prima_id: ins.materia_prima_id,
          cantidad_insumo: ins.cantidad_insumo
        }));

        const { error: insumosError } = await supabase.from("receta_insumos").insert(insumosPayload);
        if (insumosError) {
          throw new Error(`Ficha creada, pero falló al guardar materiales: ${insumosError.message}`);
        }
      }
    }

    revalidatePath("/admin/recetas");
    revalidatePath("/");

    return { ok: true, message: "Ficha técnica creada correctamente." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo crear la ficha técnica." };
  }
}

export async function updateRecetaAction(formData: FormData): Promise<RecetaActionResult> {
  try {
    await assertAdminAccess();
    const id = readText(formData, "id");
    const nombre = readText(formData, "nombre");

    if (!id) {
      throw new Error("El ID de la ficha es obligatorio.");
    }
    if (!nombre) {
      throw new Error("El nombre de la ficha es obligatorio.");
    }

    const producto_id = readText(formData, "producto_id") || null;
    const rendimiento = parseNumber(readText(formData, "rendimiento"), "El rendimiento");
    const estado = readText(formData, "estado") || "BORRADOR";
    const instrucciones = readText(formData, "instrucciones") || null;

    // Parsear el array de insumos
    const insumosJson = readText(formData, "insumos_json");
    let insumos: RecetaInsumoRpcInput[] = [];
    if (insumosJson) {
      const parsed = JSON.parse(insumosJson) as RecetaInsumoFormInput[];
      insumos = parsed
        .filter((ins) => ins.materia_prima_id.trim() !== "" && ins.cantidad_insumo > 0)
        .map((ins) => ({
          materia_prima_id: ins.materia_prima_id,
          cantidad_insumo: ins.cantidad_insumo
        }));
    }

    const supabase = await createSupabaseServerClient();
    // Llamar al RPC
    const { data, error } = await supabase.rpc("actualizar_receta_completa", {
      p_id: id,
      p_nombre: nombre,
      p_producto_id: producto_id,
      p_rendimiento: rendimiento,
      p_rendimiento_unidades: rendimiento,
      p_estado: estado,
      p_instrucciones: instrucciones,
      p_insumos: insumos as unknown as Json
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = data;
    if (!result.ok) {
      throw new Error(result.message || "Error al actualizar la ficha en la base de datos.");
    }

    revalidatePath("/admin/recetas");
    revalidatePath("/");

    return { ok: true, message: result.message || "Ficha técnica actualizada correctamente." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo actualizar la ficha técnica." };
  }
}

export async function deleteRecetaAction(id: string): Promise<RecetaActionResult> {
  try {
    await assertAdminAccess();

    if (!id) {
      throw new Error("El ID de la ficha es obligatorio.");
    }

    const supabase = await createSupabaseServerClient();
    // Llamar al RPC
    const { data, error } = await supabase.rpc("eliminar_receta_segura", {
      p_receta_id: id
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = data;
    if (!result.ok) {
      throw new Error(result.message || "Error al eliminar la ficha en la base de datos.");
    }

    revalidatePath("/admin/recetas");
    revalidatePath("/");

    return { ok: true, message: result.message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo eliminar la ficha técnica." };
  }
}
