"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Json } from "@/lib/supabase";

export type RegistrarCompraResult = {
  ok: boolean;
  message: string;
};

export type CompraDetalleInput = {
  materia_prima_id: string;
  cantidad: number;
  costo_unitario: number;
  fecha_vencimiento: string | null;
};

export type RegistrarCompraInput = {
  proveedor: string;
  factura: string;
  fecha_compra: string;
  total: number;
  detalles: CompraDetalleInput[];
};

export async function registrarCompraAction(
  payload: RegistrarCompraInput
): Promise<RegistrarCompraResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // Validaciones básicas de servidor
    if (!payload.proveedor.trim()) {
      return { ok: false, message: "El nombre del proveedor es obligatorio." };
    }
    if (!payload.factura.trim()) {
      return { ok: false, message: "El número de factura es obligatorio." };
    }
    if (!payload.detalles || payload.detalles.length === 0) {
      return { ok: false, message: "La compra debe tener al menos un material en el detalle." };
    }

    // Validar ítems del detalle
    for (const item of payload.detalles) {
      if (!item.materia_prima_id) {
        return { ok: false, message: "Todos los detalles deben seleccionar un material válido." };
      }
      if (item.cantidad <= 0) {
        return { ok: false, message: "La cantidad comprada debe ser mayor que cero." };
      }
      if (item.costo_unitario < 0) {
        return { ok: false, message: "El costo unitario no puede ser negativo." };
      }
    }

    // Invocar el stored procedure (RPC)
    const { error } = await supabase.rpc("registrar_compra", {
      p_compra: payload as unknown as Json
    });

    if (error) {
      throw error;
    }

    // Limpiar la caché de las páginas Next.js afectadas
    revalidatePath("/admin/compras");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/materias-primas");

    return {
      ok: true,
      message: "La compra se ha registrado y el Kárdex de inventario fue actualizado."
    };
  } catch (error) {
    console.error("[registrarCompraAction] Error al registrar compra:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo registrar la compra en el servidor."
    };
  }
}
