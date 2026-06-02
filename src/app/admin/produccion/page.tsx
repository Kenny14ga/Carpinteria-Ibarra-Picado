import { AdminSection } from "@/components/admin/AdminSection";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { ProduccionRow, RecetaRow, RecetaInsumoRow, MateriaPrimaRow } from "@/lib/supabase";
import { ProduccionClient } from "./ProduccionClient";

export const dynamic = "force-dynamic";

async function loadProduccion() {
  try {
    const supabase = await createSupabaseServerClient();
    const [produccion, recetas, recetaInsumos, materiasPrimas] = await Promise.all([
      supabase.from("produccion_lotes").select("*").order("fecha_programada", { ascending: false }),
      supabase.from("recetas").select("*").order("nombre", { ascending: true }),
      supabase.from("receta_insumos").select("*"),
      supabase.from("materias_primas").select("*").order("nombre", { ascending: true })
    ]);

    return {
      rows: (produccion.data ?? []) as ProduccionRow[],
      recetas: (recetas.data ?? []) as RecetaRow[],
      recetaInsumos: (recetaInsumos.data ?? []) as RecetaInsumoRow[],
      materiasPrimas: (materiasPrimas.data ?? []) as MateriaPrimaRow[],
      error:
        produccion.error?.message ??
        recetas.error?.message ??
        recetaInsumos.error?.message ??
        materiasPrimas.error?.message ??
        null
    };
  } catch (error) {
    return {
      rows: [] as ProduccionRow[],
      recetas: [] as RecetaRow[],
      recetaInsumos: [] as RecetaInsumoRow[],
      materiasPrimas: [] as MateriaPrimaRow[],
      error: error instanceof Error ? error.message : "No se pudo cargar produccion."
    };
  }
}

export default async function ProduccionPage() {
  const { rows, recetas, recetaInsumos, materiasPrimas, error } = await loadProduccion();

  return (
    <AdminSection
      eyebrow="Cocina y hornadas"
      title="Produccion"
      description="Planifica lotes, revisa cantidades terminadas y da seguimiento a lo que entra a vitrina."
    >
      <ProduccionClient
        rows={rows}
        recetas={recetas}
        recetaInsumos={recetaInsumos}
        materiasPrimas={materiasPrimas}
        error={error}
      />
    </AdminSection>
  );
}
