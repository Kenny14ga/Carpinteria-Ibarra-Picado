import Link from "next/link";
import { ShoppingBag, Truck } from "lucide-react";
import { AdminSection, MetricCard, StatusBadge } from "@/components/admin/AdminSection";

export default function ComprasPage() {
  return (
    <AdminSection
      eyebrow="Abastecimiento"
      title="Compras"
      description="Modulo preparado para registrar compras, recepcion de insumos y cuentas pendientes."
      action={
        <Link href="/admin/materias-primas" className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold">
          <ShoppingBag aria-hidden="true" className="h-5 w-5" />
          Registrar compra
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Compras pendientes" value="0" tone="warning" icon={<ShoppingBag aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Proveedores activos" value="0" tone="info" icon={<Truck aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Recepciones de hoy" value="0" tone="success" icon={<ShoppingBag aria-hidden="true" className="h-5 w-5" />} />
      </div>
      <div className="surface-card mt-5 rounded-md p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#4A2B32]">Flujo recomendado</h2>
          <StatusBadge label="Preparado" tone="brand" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#6F4A52]">
          La compra debe crear entrada de inventario, actualizar costo unitario y dejar historial para reportes.
        </p>
      </div>
    </AdminSection>
  );
}
