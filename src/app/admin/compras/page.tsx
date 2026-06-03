import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { MateriaPrimaRow } from "@/lib/supabase";
import { ComprasClient, type PurchaseRowWithDetails } from "./ComprasClient";

export const dynamic = "force-dynamic";

async function loadComprasPageData() {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Obtener el historial de compras con detalles e insumos
    const { data: purchasesData, error: purchasesErr } = await supabase
      .from("compras")
      .select("*, compra_detalles(*, materias_primas(nombre, unidad_medida))")
      .order("fecha_compra", { ascending: false })
      .order("created_at", { ascending: false });

    // 2. Obtener catálogo de materias primas para el combobox
    const { data: materialsData, error: materialsErr } = await supabase
      .from("materias_primas")
      .select("*")
      .order("nombre", { ascending: true });

    if (purchasesErr) throw purchasesErr;
    if (materialsErr) throw materialsErr;

    return {
      purchases: (purchasesData || []) as PurchaseRowWithDetails[],
      rawMaterials: (materialsData || []) as MateriaPrimaRow[],
      error: null
    };
  } catch (err) {
    console.error("[ComprasPage] Error al precargar datos:", err);
    return {
      purchases: [] as PurchaseRowWithDetails[],
      rawMaterials: [] as MateriaPrimaRow[],
      error: err instanceof Error ? err.message : "Error al consultar la base de datos de compras."
    };
  }
}

export default async function ComprasPage() {
  const { purchases, rawMaterials, error } = await loadComprasPageData();

  return (
    <ComprasClient
      purchases={purchases}
      rawMaterials={rawMaterials}
      initialError={error}
    />
  );
}
