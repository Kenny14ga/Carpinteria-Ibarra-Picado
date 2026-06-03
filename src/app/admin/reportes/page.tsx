import { BarChart3, Boxes, CircleDollarSign, Package, TrendingDown } from "lucide-react";
import { AdminSection, MetricCard, StatusBadge } from "@/components/admin/AdminSection";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { MateriaPrimaRow, ProductoRow, ProduccionRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function loadReportData() {
  try {
    const supabase = await createSupabaseServerClient();
    const [productos, materias, produccion] = await Promise.all([
      supabase.from("productos").select("*"),
      supabase.from("materias_primas").select("*"),
      supabase.from("produccion_lotes").select("*")
    ]);

    return {
      productos: (productos.data ?? []) as ProductoRow[],
      materias: (materias.data ?? []) as MateriaPrimaRow[],
      produccion: (produccion.data ?? []) as ProduccionRow[],
      error: productos.error?.message ?? materias.error?.message ?? produccion.error?.message ?? null
    };
  } catch (error) {
    return {
      productos: [] as ProductoRow[],
      materias: [] as MateriaPrimaRow[],
      produccion: [] as ProduccionRow[],
      error: error instanceof Error ? error.message : "No se pudieron cargar los reportes."
    };
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

export default async function ReportesPage() {
  const { productos, materias, produccion, error } = await loadReportData();
  const inventoryCost = materias.reduce((total, item) => total + item.stock_actual * item.costo_unitario, 0);
  const stockValue = productos.reduce((total, item) => total + (item.stock_vitrina ?? 0) * item.precio_venta, 0);
  const finishedLots = produccion.filter((item) => item.estado === "TERMINADO");
  const lowStock = materias.filter((item) => item.stock_minimo !== null && item.stock_actual <= item.stock_minimo);

  return (
    <AdminSection
      eyebrow="Analitica operativa"
      title="Reportes"
      description="Indicadores para entender inventario, costo de produccion, merma y actividad sin convertir la pantalla en decoracion."
    >
      {error ? <div className="animate-fade-in mb-4 rounded-lg bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Valor de vitrina" value={formatCurrency(stockValue)} tone="brand" icon={<Package aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Costo de inventario" value={formatCurrency(inventoryCost)} tone="info" icon={<CircleDollarSign aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Lotes terminados" value={String(finishedLots.length)} tone="success" icon={<BarChart3 aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Alertas de stock" value={String(lowStock.length)} tone={lowStock.length ? "warning" : "success"} icon={<Boxes aria-hidden="true" className="h-5 w-5" />} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="animate-fade-in surface-card rounded-xl p-5" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[var(--cacao)]">Productos en vitrina</h2>
            <StatusBadge label={`${productos.length} items`} tone="brand" />
          </div>
          <div className="mt-4 space-y-3">
            {productos.slice(0, 8).map((item) => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_6rem_7rem] items-center gap-3 rounded-lg bg-[var(--cream)] p-3 text-sm transition-colors hover:bg-[var(--brand-cream)]/30">
                <span className="truncate font-semibold text-[var(--cacao)]">{item.nombre}</span>
                <span className="text-right text-[var(--cacao-light)]">{item.stock_vitrina ?? 0} uds.</span>
                <span className="text-right font-semibold text-[var(--brand-dark)]">{formatCurrency(item.precio_venta)}</span>
              </div>
            ))}
            {productos.length === 0 ? <p className="rounded-lg bg-[var(--cream)] p-4 text-sm text-[var(--cacao-light)]">Sin datos de productos.</p> : null}
          </div>
        </section>

        <section className="animate-fade-in surface-card rounded-xl p-5" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[var(--cacao)]">Merma y riesgo</h2>
            <TrendingDown aria-hidden="true" className="h-5 w-5 text-[var(--warning)]" />
          </div>
          <div className="mt-4 space-y-3">
            {lowStock.slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--cream)] p-3 text-sm transition-colors hover:bg-[var(--brand-cream)]/30">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--cacao)]">{item.nombre}</p>
                  <p className="text-xs text-[var(--cacao-light)]">Actual {item.stock_actual} · mínimo {item.stock_minimo ?? 0}</p>
                </div>
                <StatusBadge label="Stock bajo" tone="warning" />
              </div>
            ))}
            {lowStock.length === 0 ? <p className="rounded-lg bg-[var(--cream)] p-4 text-sm text-[var(--cacao-light)]">Sin riesgos de stock detectados.</p> : null}
          </div>
        </section>
      </div>
    </AdminSection>
  );
}
