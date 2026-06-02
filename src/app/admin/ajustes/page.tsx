import { Bell, Database, Palette, Settings, ShieldCheck, Store } from "lucide-react";
import { AdminSection, StatusBadge } from "@/components/admin/AdminSection";

const settingsGroups = [
  {
    title: "Marca",
    icon: <Palette aria-hidden="true" className="h-5 w-5" />,
    items: ["Nombre comercial: Riquiquisimo", "Paleta blush, crema y rosa profundo", "Tipografia operativa con acento editorial"]
  },
  {
    title: "Operacion",
    icon: <Store aria-hidden="true" className="h-5 w-5" />,
    items: ["Inventario online para administracion", "POS offline-first para vendedor", "Catalogo publico separado"]
  },
  {
    title: "Seguridad",
    icon: <ShieldCheck aria-hidden="true" className="h-5 w-5" />,
    items: ["Permisos por rol", "Fallback offline solo para POS", "Acciones administrativas en linea"]
  },
  {
    title: "Sincronizacion",
    icon: <Database aria-hidden="true" className="h-5 w-5" />,
    items: ["Ventas POS a cola local", "Admin directo a base en linea", "Actualizacion automatica de vistas"]
  }
];

export default function AjustesPage() {
  return (
    <AdminSection
      eyebrow="Configuracion"
      title="Ajustes"
      description="Parametros base del sistema. Esta vista deja clara la division entre administracion en linea y POS offline."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {settingsGroups.map((group) => (
          <section key={group.title} className="surface-card rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-cream)] text-[var(--brand-dark)]">
                  {group.icon}
                </div>
                <h2 className="text-base font-semibold text-[var(--cacao)]">{group.title}</h2>
              </div>
              <StatusBadge label="Activo" tone="success" />
            </div>
            <ul className="mt-4 space-y-2">
              {group.items.map((item) => (
                <li key={item} className="rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-[var(--cacao-light)]">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="surface-card mt-5 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-cream)] text-[var(--brand-dark)]">
            <Settings aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--cacao)]">Preferencias visuales</h2>
            <p className="text-sm text-[var(--cacao-light)]">La interfaz usa 60% fondos limpios, 30% rosa suave y 10% rosa fuerte para acciones.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--blush)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--brand-dark)]">Fondo suave</p>
            <p className="mt-2 text-lg font-semibold text-[var(--cacao)]">#FFF6F6</p>
          </div>
          <div className="rounded-xl bg-[var(--brand-cream)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--brand-dark)]">Acento</p>
            <p className="mt-2 text-lg font-semibold text-[var(--cacao)]">#FDE1E6</p>
          </div>
          <div className="rounded-xl bg-[#B83E6C] p-4 text-white">
            <p className="text-xs font-semibold uppercase text-white/80">Accion</p>
            <p className="mt-2 text-lg font-semibold">#B83E6C</p>
          </div>
        </div>
      </section>

      <section className="surface-card mt-5 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Bell aria-hidden="true" className="h-5 w-5 text-[var(--info)]" />
          <p className="text-sm text-[var(--cacao-light)]">Notificaciones de bajo stock, vencimiento y produccion quedan listas para conectarse a reglas por sucursal cuando definas los umbrales.</p>
        </div>
      </section>
    </AdminSection>
  );
}
