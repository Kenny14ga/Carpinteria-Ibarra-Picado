import { AdminSection } from "@/components/admin/AdminSection";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { RecetaRow } from "@/lib/supabase";
import { RecetasClient } from "./RecetasClient";

export const dynamic = "force-dynamic";

async function loadRecetas() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("recetas").select("*").order("nombre", { ascending: true });

    return {
      rows: (data ?? []) as RecetaRow[],
      error: error?.message ?? null
    };
  } catch (error) {
    return {
      rows: [] as RecetaRow[],
      error: error instanceof Error ? error.message : "No se pudieron cargar recetas."
    };
  }
}

export default async function RecetasPage() {
  const { rows, error } = await loadRecetas();

  return (
    <AdminSection
      eyebrow="Estandarizacion"
      title="Recetas"
      description="Documenta rendimientos, costos y estados para producir con consistencia."
    >
      <RecetasClient rows={rows} error={error} />
    </AdminSection>
  );
}
