import { MateriasPrimasCrudClient } from "./MateriasPrimasCrudClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { MateriaPrimaRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getMateriasPrimas(): Promise<{
  items: MateriaPrimaRow[];
  error: string | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("materias_primas").select("*").order("nombre", { ascending: true });

    if (error) {
      return {
        items: [],
        error: error.message
      };
    }

    return {
      items: data ?? [],
      error: null
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "No se pudieron cargar las materias primas."
    };
  }
}

export default async function MateriasPrimasPage() {
  const { items, error } = await getMateriasPrimas();

  return <MateriasPrimasCrudClient items={items} initialError={error} />;
}
