"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Users
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Operación",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Inventario", href: "/admin/inventario", icon: Boxes },
      { label: "Productos", href: "/admin/productos", icon: Package },
      { label: "Recetas", href: "/admin/recetas", icon: ClipboardList },
      { label: "Reportes", href: "/admin/reportes", icon: BarChart3 }
    ]
  },
  {
    title: "Sistema",
    items: [
      { label: "Usuarios", href: "/admin/usuarios", icon: Users },
      { label: "Ajustes", href: "/admin/ajustes", icon: Settings }
    ]
  }
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[var(--sidebar-width)] flex-col border-r border-[var(--border-soft)] bg-white/80 backdrop-blur-xl lg:flex">
      {/* Brand header */}
      <div className="flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--border-soft)] px-5">
        <Image
          src="/LOGOS/logo-mark.svg"
          alt="Riquiquísimo"
          width={40}
          height={40}
          className="shrink-0 rounded-lg"
          priority
        />
        <div className="min-w-0">
          <p className="brand-heading truncate text-[1.05rem] font-bold italic leading-none">
            Riquiquísimo
          </p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--cacao-light)]">
            Pastelería
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-5 px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--cacao-muted)]">
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[0.8125rem] font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-[var(--brand-cream)] to-[rgba(253,225,230,0.4)] text-[var(--brand-dark)] shadow-[inset_0_0_0_1px_var(--border-soft)]"
                          : "text-[var(--cacao-light)] hover:bg-[var(--cream)] hover:text-[var(--cacao)]"
                      }`}
                    >
                      <Icon
                        aria-hidden
                        className={`h-[1.125rem] w-[1.125rem] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          active ? "text-[var(--brand)]" : ""
                        }`}
                      />
                      <span>{item.label}</span>
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer badge */}
      <div className="border-t border-[var(--border-soft)] p-3">
        <div className="rounded-lg bg-gradient-to-br from-[var(--cream)] to-[var(--brand-cream)]/40 p-3">
          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--brand)]">
            Sistema
          </p>
          <p className="mt-0.5 text-[0.8125rem] font-semibold text-[var(--cacao)]">
            Administración en línea
          </p>
        </div>
      </div>
    </aside>
  );
}
