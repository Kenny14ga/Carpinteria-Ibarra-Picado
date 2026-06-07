"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/supabase";

export type ProductActionResult = {
  ok: boolean;
  message: string;
};

type ProductInsert = Database["public"]["Tables"]["productos"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["productos"]["Update"];

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePrice(rawValue: string) {
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("El precio debe ser un número mayor que cero.");
  }

  return value;
}

function parseOptionalNumber(rawValue: string) {
  if (!rawValue) {
    return 0;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("El stock debe ser un número igual o mayor que cero.");
  }

  return value;
}

function parseAllergens(rawValue: string) {
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseBase64Image(dataUrl: string) {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Formato de imagen inválido.");
  }
  return {
    type: matches[1],
    buffer: Buffer.from(matches[2], "base64")
  };
}

function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(supabaseUrl && url.startsWith(`${supabaseUrl}/storage/v1/object/public/productos/`));
}

function readProductPayload(formData: FormData): ProductInsert {
  const nombre = readText(formData, "nombre");

  if (!nombre) {
    throw new Error("El nombre del producto es obligatorio.");
  }

  return {
    nombre,
    descripcion: readText(formData, "descripcion") || null,
    precio_venta: parsePrice(readText(formData, "precio_venta")),
    imagen_url: readText(formData, "imagen_url") || null,
    alergenos: parseAllergens(readText(formData, "alergenos")),
    requiere_produccion: formData.get("requiere_produccion") === "on",
    es_terminado: true,
    en_vitrina: formData.get("en_vitrina") === "on",
    stock_vitrina: parseOptionalNumber(readText(formData, "stock_vitrina")),
    updated_at: new Date().toISOString()
  };
}

export async function createProductAction(formData: FormData): Promise<ProductActionResult> {
  let uploadedFilePath: string | null = null;
  const supabase = await createSupabaseServerClient();
  try {
    const rawPayload = readProductPayload(formData);
    let imagenUrl = rawPayload.imagen_url;

    if (imagenUrl && imagenUrl.startsWith("data:image/")) {
      const { type, buffer } = parseBase64Image(imagenUrl);
      const fileExt = type.split("/")[1] || "jpg";
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      try {
        await supabase.storage.createBucket("productos", {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
        });
      } catch {
        // Ignorar si el bucket ya existe o no hay permisos de creación
      }

      const { error: uploadError } = await supabase.storage
        .from("productos")
        .upload(fileName, buffer, {
          contentType: type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir la imagen a Supabase Storage: ${uploadError.message}`);
      }

      uploadedFilePath = fileName;

      const { data: { publicUrl } } = supabase.storage
        .from("productos")
        .getPublicUrl(fileName);

      imagenUrl = publicUrl;
    }

    const payload: ProductInsert = {
      id: crypto.randomUUID(),
      ...rawPayload,
      imagen_url: imagenUrl,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from("productos").insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/productos");

    return {
      ok: true,
      message: "Producto creado correctamente."
    };
  } catch (error) {
    // Rollback: Eliminar imagen en storage si falla la base de datos
    if (uploadedFilePath) {
      await supabase.storage.from("productos").remove([uploadedFilePath]);
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo crear el producto."
    };
  }
}

export async function updateProductAction(formData: FormData): Promise<ProductActionResult> {
  let uploadedFilePath: string | null = null;
  const supabase = await createSupabaseServerClient();
  try {
    const id = readText(formData, "id");

    if (!id) {
      throw new Error("No se recibió el identificador del producto.");
    }

    // Obtener el producto actual para saber si tenía una imagen previa en storage
    const { data: currentProduct, error: fetchError } = await supabase
      .from("productos")
      .select("imagen_url")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error(`No se pudo consultar el producto actual: ${fetchError.message}`);
    }

    const rawPayload = readProductPayload(formData);
    let imagenUrl = rawPayload.imagen_url;
    let hasNewImage = false;

    if (imagenUrl && imagenUrl.startsWith("data:image/")) {
      const { type, buffer } = parseBase64Image(imagenUrl);
      const fileExt = type.split("/")[1] || "jpg";
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      try {
        await supabase.storage.createBucket("productos", {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
        });
      } catch {
        // Ignorar
      }

      const { error: uploadError } = await supabase.storage
        .from("productos")
        .upload(fileName, buffer, {
          contentType: type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir la nueva imagen: ${uploadError.message}`);
      }

      uploadedFilePath = fileName;
      hasNewImage = true;

      const { data: { publicUrl } } = supabase.storage
        .from("productos")
        .getPublicUrl(fileName);

      imagenUrl = publicUrl;
    }

    const payload: ProductUpdate = {
      ...rawPayload,
      imagen_url: imagenUrl
    };

    const { error: updateError } = await supabase
      .from("productos")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Si la actualización es exitosa, procedemos a borrar la imagen anterior de Supabase Storage
    const oldUrl = currentProduct?.imagen_url;
    const urlChanged = hasNewImage || (!imagenUrl && oldUrl);
    if (urlChanged && oldUrl && isSupabaseStorageUrl(oldUrl)) {
      const oldFileName = oldUrl.split("/").pop();
      if (oldFileName) {
        await supabase.storage.from("productos").remove([oldFileName]);
      }
    }

    revalidatePath("/productos");

    return {
      ok: true,
      message: "Producto actualizado correctamente."
    };
  } catch (error) {
    // Rollback: borrar archivo subido si falla la actualización
    if (uploadedFilePath) {
      await supabase.storage.from("productos").remove([uploadedFilePath]);
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo actualizar el producto."
    };
  }
}

export async function deleteProductAction(id: string): Promise<ProductActionResult> {
  try {
    if (!id) {
      throw new Error("No se recibió el identificador del producto.");
    }

    const supabase = await createSupabaseServerClient();

    // Obtener la imagen antes de eliminar el registro
    const { data: product, error: fetchError } = await supabase
      .from("productos")
      .select("imagen_url")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error(`No se pudo consultar el producto: ${fetchError.message}`);
    }

    const { error: deleteError } = await supabase.from("productos").delete().eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    // Si el producto se eliminó correctamente de la base de datos, borramos su imagen de Supabase Storage
    if (product?.imagen_url && isSupabaseStorageUrl(product.imagen_url)) {
      const oldFileName = product.imagen_url.split("/").pop();
      if (oldFileName) {
        await supabase.storage.from("productos").remove([oldFileName]);
      }
    }

    revalidatePath("/productos");

    return {
      ok: true,
      message: "Producto eliminado correctamente."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo eliminar el producto."
    };
  }
}
