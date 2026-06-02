"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, LayoutDashboard, Package, Settings } from "lucide-react";

const items = [
  { label: "Inicio", href: "/admin", icon: LayoutDashboard },
  { label: "Inventario", href: "/admin/inventario", icon: Boxes },
  { label: "Productos", href: "/admin/productos", icon: Package },
  { label: "Reportes", href: "/admin/reportes", icon: BarChart3 },
  { label: "Ajustes", href: "/admin/ajustes", icon: Settings }
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)] bg-white/92 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(74,43,50,0.06)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.625rem] font-semibold transition-all duration-200 ${
                active
                  ? "text-[var(--brand)]"
                  : "text-[var(--cacao-muted)] active:text-[var(--brand)]"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-[var(--brand-cream)] text-[var(--brand)] scale-105"
                    : "scale-100"
                }`}
              >
                <Icon aria-hidden className="h-[1.125rem] w-[1.125rem]" />
              </span>
              <span className="truncate">{item.label}</span>

              {/* Active indicator dot */}
              {active && (
                <span className="absolute -top-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[var(--brand)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
