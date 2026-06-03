"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  Settings,
  Users,
  X
} from "lucide-react";
import { logoutAction } from "@/app/auth/actions";

const items = [
  { label: "Inicio", href: "/admin", icon: LayoutDashboard },
  { label: "Inventario", href: "/admin/inventario", icon: Boxes },
  { label: "Productos", href: "/admin/productos", icon: Package },
  { label: "Recetas", href: "/admin/recetas", icon: ClipboardList },
  { label: "Más", href: "#more", icon: MoreHorizontal }
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "#more") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await logoutAction();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setIsLoggingOut(false);
      setIsMoreOpen(false);
    }
  };

  const moreItems = [
    { label: "Reportes", href: "/admin/reportes", icon: BarChart3 },
    { label: "Usuarios", href: "/admin/usuarios", icon: Users },
    { label: "Ajustes", href: "/admin/ajustes", icon: Settings }
  ];

  return (
    <>
      {/* Barra de navegación inferior principal */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)] bg-white/92 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(74,43,50,0.06)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const isMoreButton = item.href === "#more";

            const handleClick = (e: React.MouseEvent) => {
              if (isMoreButton) {
                e.preventDefault();
                setIsMoreOpen(true);
              }
            };

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleClick}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.625rem] font-semibold transition-all duration-200 ${
                  active || (isMoreButton && isMoreOpen)
                    ? "text-[var(--brand)]"
                    : "text-[var(--cacao-muted)] active:text-[var(--brand)]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                    active || (isMoreButton && isMoreOpen)
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

      {/* Drawer / Bottom Sheet para el menú "Más" */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop con desvanecido */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsMoreOpen(false)}
            className="absolute inset-0 bg-[#4A2B32]/45 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Panel deslizante */}
          <aside className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--border-soft)] bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-out">
            <div className="mx-auto max-w-lg">
              {/* Encabezado del menú */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--brand)]">
                    Más Opciones
                  </h3>
                  <p className="text-xs text-[var(--cacao-light)]">
                    Administración adicional del sistema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cream)] text-[var(--cacao-light)] hover:text-[var(--cacao)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Lista de enlaces */}
              <ul className="space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);

                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMoreOpen(false)}
                        className={`flex h-12 items-center gap-3 rounded-xl px-4 text-xs font-semibold transition-all ${
                          active
                            ? "bg-[var(--brand-cream)] text-[var(--brand-dark)]"
                            : "text-[var(--cacao-light)] hover:bg-[var(--cream)] hover:text-[var(--cacao)]"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}

                <li className="pt-2 border-t border-[var(--border-soft)] mt-2">
                  <button
                    type="button"
                    disabled={isLoggingOut}
                    onClick={handleSignOut}
                    className="flex h-12 w-full items-center gap-3 rounded-xl px-4 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    <LogOut className="h-4.5 w-4.5 shrink-0" />
                    <span>{isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}</span>
                  </button>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
