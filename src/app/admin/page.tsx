import Link from "next/link";
import { AlertTriangle, BarChart3, Boxes, ClipboardList, Hammer, Package, ShoppingBag } from "lucide-react";
import { AdminSection, MetricCard, StatusBadge } from "@/components/admin/AdminSection";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { MateriaPrimaRow, ProductoRow, ProduccionRow, RecetaRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function loadDashboardData() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const [productosRes, materiasRes, recetasRes, produccionRes] = await Promise.all([
      supabase.from("productos").select("*"),
      supabase.from("materias_primas").select("*"),
      supabase.from("recetas").select("*"),
      supabase.from("produccion_lotes").select("*")
    ]);

    return {
      productos: (productosRes.data ?? []) as ProductoRow[],
      materias: (materiasRes.data ?? []) as MateriaPrimaRow[],
      recetas: (recetasRes.data ?? []) as RecetaRow[],
      produccion: (produccionRes.data ?? []) as ProduccionRow[],
      error: productosRes.error?.message ?? materiasRes.error?.message ?? recetasRes.error?.message ?? produccionRes.error?.message ?? null
    };
  } catch (error) {
    return {
      productos: [] as ProductoRow[],
      materias: [] as MateriaPrimaRow[],
      recetas: [] as RecetaRow[],
      produccion: [] as ProduccionRow[],
      error: error instanceof Error ? error.message : "No se pudo cargar el dashboard."
    };
  }
}

function isLowStock(item: MateriaPrimaRow) {
  return item.stock_minimo !== null && item.stock_actual <= item.stock_minimo;
}

function isExpiringSoon(item: MateriaPrimaRow) {
  if (!item.fecha_vencimiento) {
    return false;
  }

  const days = Math.ceil((new Date(item.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= 7;
}

export default async function DashboardPage() {
  const { productos, materias, recetas, produccion, error } = await loadDashboardData();
  
  const lowStock = materias.filter(isLowStock);
  const expiring = materias.filter(isExpiringSoon);
  const planned = produccion.filter((item) => item.estado !== "TERMINADO");
  const costTotal = materias.reduce((total, item) => total + item.stock_actual * item.costo_unitario, 0);

  return (
    <AdminSection
      eyebrow="Operación de carpintería"
      title="Panel de Control"
      description="Revisa inventario de madera y herrajes, órdenes de taller, costos y productos disponibles para venta."
      action={
        <Link
          href="/admin/materias-primas"
          className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition"
        >
          <ShoppingBag aria-hidden className="h-4 w-4" />
          Registrar material
        </Link>
      }
    >
      {error ? (
        <div className="animate-fade-in mb-4 flex items-start gap-2 rounded-lg bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Metric cards with staggered animation */}
      <div className="stagger-children grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Productos activos"
          value={String(productos.length)}
          helper="Puertas, muebles, herrajes y piezas listas."
          icon={<Package aria-hidden className="h-5 w-5" />}
        />
        <MetricCard
          label="Materiales por revisar"
          value={String(expiring.length)}
          tone={expiring.length > 0 ? "warning" : "success"}
          helper="Lotes con fecha próxima de revisión."
          icon={<AlertTriangle aria-hidden className="h-5 w-5" />}
        />
        <MetricCard
          label="Stock bajo"
          value={String(lowStock.length)}
          tone={lowStock.length > 0 ? "warning" : "success"}
          helper="Reposición sugerida antes de cotizar."
          icon={<Boxes aria-hidden className="h-5 w-5" />}
        />
        <MetricCard
          label="Fichas técnicas"
          value={String(recetas.length)}
          icon={<ClipboardList aria-hidden className="h-5 w-5" />}
        />
        <MetricCard
          label="Órdenes de taller"
          value={String(planned.length)}
          tone="info"
          icon={<Hammer aria-hidden className="h-5 w-5" />}
        />
        <MetricCard
          label="Costo inventario"
          value={`C$ ${costTotal.toFixed(2)}`}
          tone="brand"
          helper="Costo estimado de materiales actuales."
          icon={<BarChart3 aria-hidden className="h-5 w-5" />}
        />
      </div>

      {/* Alert sections */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="animate-fade-in surface-card rounded-xl p-5" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[var(--cacao)]">Alertas de inventario</h2>
            <StatusBadge
              label={`${lowStock.length + expiring.length} alertas`}
              tone={lowStock.length + expiring.length > 0 ? "warning" : "success"}
            />
          </div>
          <div className="mt-4 space-y-2.5">
            {[...lowStock, ...expiring].slice(0, 6).map((item) => (
              <article
                key={`${item.id}-${item.fecha_vencimiento}`}
                className="rounded-lg bg-[var(--cream)] p-3 transition-colors hover:bg-[var(--brand-cream)]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--cacao)]">{item.nombre}</p>
                    <p className="mt-0.5 text-xs text-[var(--cacao-light)]">
                      {item.stock_actual} {item.unidad_medida} · mínimo {item.stock_minimo ?? 0}
                    </p>
                  </div>
                  <StatusBadge
                    label={isExpiringSoon(item) ? "Revisar lote" : "Stock bajo"}
                    tone="warning"
                  />
                </div>
              </article>
            ))}
            {lowStock.length + expiring.length === 0 ? (
              <p className="rounded-lg bg-[var(--cream)] p-4 text-sm text-[var(--cacao-light)]">
                No hay alertas críticas por ahora.
              </p>
            ) : null}
          </div>
        </section>

        <section className="animate-fade-in surface-card rounded-xl p-5" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[var(--cacao)]">Taller activo</h2>
            <Link
              href="/admin/produccion"
              className="text-sm font-semibold text-[var(--brand)] transition-colors hover:text-[var(--brand-dark)]"
            >
              Ver tablero
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {planned.slice(0, 6).map((item) => (
              <article
                key={item.id}
                className="rounded-lg bg-[var(--cream)] p-3 transition-colors hover:bg-[var(--brand-cream)]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--cacao)]">{item.nombre}</p>
                    <p className="mt-0.5 text-xs text-[var(--cacao-light)]">
                      {item.cantidad_planificada} unidades planificadas
                    </p>
                  </div>
                  <StatusBadge label={item.estado || "Planificado"} tone="info" />
                </div>
              </article>
            ))}
            {planned.length === 0 ? (
              <p className="rounded-lg bg-[var(--cream)] p-4 text-sm text-[var(--cacao-light)]">
                No hay órdenes pendientes en taller.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminSection>
  );
}
