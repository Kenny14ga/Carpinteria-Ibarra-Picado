import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { MateriaPrimaRow, ProductoRow } from "@/lib/supabase";
import { InventarioClient, type InventoryRow } from "./InventarioClient";

export const dynamic = "force-dynamic";

async function loadInventory() {
  try {
    const supabase = await createSupabaseServerClient();
    const [productos, materias] = await Promise.all([
      supabase.from("productos").select("*").order("nombre", { ascending: true }),
      supabase.from("materias_primas").select("*").order("nombre", { ascending: true })
    ]);

    const productRows = ((productos.data ?? []) as ProductoRow[]).map((product) => ({
      id: `producto-${product.id}`,
      sku: product.id.slice(0, 8),
      nombre: product.nombre,
      tipo: "Producto" as const,
      categoria: "Producto terminado",
      cantidad: product.stock_vitrina ?? 0,
      unidad: "unidad",
      minimo: 0,
      proveedor: "-",
      vencimiento: "-",
      costo: product.precio_venta,
      estado: (product.stock_vitrina ?? 0) <= 0 ? "AGOTADO" as const : "DISPONIBLE" as const
    }));

    const materiaRows = ((materias.data ?? []) as MateriaPrimaRow[]).map((item) => {
      let estado: InventoryRow["estado"] = "DISPONIBLE";
      const stock = item.stock_actual ?? 0;

      if (stock <= 0) {
        estado = "AGOTADO";
      } else if (item.stock_minimo !== null && stock <= item.stock_minimo) {
        estado = "STOCK_BAJO";
      }

      if (item.fecha_vencimiento) {
        const days = Math.ceil((new Date(item.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 7) {
          estado = "POR_VENCER";
        }
      }

      if (item.estado === "RESERVADO") {
        estado = "RESERVADO";
      }

      return {
        id: `materia-${item.id}`,
        sku: item.sku || item.id.slice(0, 8),
        nombre: item.nombre,
        tipo: "Ingrediente" as const,
        categoria: item.categoria || "Materia prima",
        cantidad: stock,
        unidad: item.unidad_medida,
        minimo: item.stock_minimo ?? 0,
        proveedor: item.proveedor || "-",
        vencimiento: item.fecha_vencimiento || "-",
        costo: item.costo_unitario,
        estado
      };
    });

    return {
      rows: [...productRows, ...materiaRows],
      error: productos.error?.message ?? materias.error?.message ?? null
    };
  } catch (error) {
    return {
      rows: [] as InventoryRow[],
      error: error instanceof Error ? error.message : "No se pudo cargar el inventario."
    };
  }
}

export default async function InventarioPage() {
  const { rows, error } = await loadInventory();

  return <InventarioClient rows={rows} error={error} />;
}
