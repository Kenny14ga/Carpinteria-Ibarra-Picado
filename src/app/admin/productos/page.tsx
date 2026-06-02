import { ProductosCrudClient } from "./ProductosCrudClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { ProductoRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getProducts(): Promise<{
  products: ProductoRow[];
  error: string | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("productos").select("*").order("nombre", { ascending: true });

    if (error) {
      return {
        products: [],
        error: error.message
      };
    }

    return {
      products: data ?? [],
      error: null
    };
  } catch (error) {
    return {
      products: [],
      error: error instanceof Error ? error.message : "No se pudieron cargar los productos."
    };
  }
}

export default async function ProductosPage() {
  const { products, error } = await getProducts();

  return <ProductosCrudClient products={products} initialError={error} />;
}
