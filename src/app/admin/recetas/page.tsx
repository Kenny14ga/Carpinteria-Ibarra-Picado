import { AdminSection } from "@/components/admin/AdminSection";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { RecetaRow, ProductoRow, MateriaPrimaRow, RecetaInsumoRow } from "@/lib/supabase";
import { RecetasClient } from "./RecetasClient";

export const dynamic = "force-dynamic";

async function loadRecetas() {
  try {
    const supabase = await createSupabaseServerClient();
    const [recetas, productos, materias, insumos] = await Promise.all([
      supabase.from("recetas").select("*").order("nombre", { ascending: true }),
      supabase.from("productos").select("*").order("nombre", { ascending: true }),
      supabase.from("materias_primas").select("*").order("nombre", { ascending: true }),
      supabase.from("receta_insumos").select("*")
    ]);

    return {
      rows: (recetas.data ?? []) as RecetaRow[],
      productos: (productos.data ?? []) as ProductoRow[],
      materiasPrimas: (materias.data ?? []) as MateriaPrimaRow[],
      recetaInsumos: (insumos.data ?? []) as RecetaInsumoRow[],
      error:
        recetas.error?.message ??
        productos.error?.message ??
        materias.error?.message ??
        insumos.error?.message ??
        null
    };
  } catch (error) {
    return {
      rows: [] as RecetaRow[],
      productos: [] as ProductoRow[],
      materiasPrimas: [] as MateriaPrimaRow[],
      recetaInsumos: [] as RecetaInsumoRow[],
      error: error instanceof Error ? error.message : "No se pudieron cargar las recetas y catálogo."
    };
  }
}

export default async function RecetasPage() {
  const { rows, productos, materiasPrimas, recetaInsumos, error } = await loadRecetas();

  return (
    <AdminSection
      eyebrow="Estandarizacion"
      title="Recetas"
      description="Documenta rendimientos, costos y estados para producir con consistencia."
    >
      <RecetasClient
        rows={rows}
        productos={productos}
        materiasPrimas={materiasPrimas}
        recetaInsumos={recetaInsumos}
        error={error}
      />
    </AdminSection>
  );
}
