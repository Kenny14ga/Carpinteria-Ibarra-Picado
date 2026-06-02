import { Phone, Truck } from "lucide-react";
import { AdminSection, MetricCard, StatusBadge } from "@/components/admin/AdminSection";

export default function ProveedoresPage() {
  return (
    <AdminSection
      eyebrow="Abastecimiento"
      title="Proveedores"
      description="Directorio operativo para ordenar compras recurrentes, costos y contactos."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Proveedores activos" value="0" tone="info" icon={<Truck aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Contactos por validar" value="0" tone="warning" icon={<Phone aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Insumos asociados" value="0" tone="brand" icon={<Truck aria-hidden="true" className="h-5 w-5" />} />
      </div>
      <div className="surface-card mt-5 rounded-md p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#4A2B32]">Directorio</h2>
          <StatusBadge label="Listo para CRUD" tone="brand" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#6F4A52]">
          Esta seccion queda reservada para datos de contacto, condiciones de pago y productos que suministra cada proveedor.
        </p>
      </div>
    </AdminSection>
  );
}
