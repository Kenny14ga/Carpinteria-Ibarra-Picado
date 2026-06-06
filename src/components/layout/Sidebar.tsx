"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Hammer,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  LogOut,
  CircleDollarSign
} from "lucide-react";
import { logoutAction } from "@/app/auth/actions";

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
      { label: "Fichas técnicas", href: "/admin/recetas", icon: ClipboardList },
      { label: "Taller", href: "/admin/produccion", icon: Hammer },
      { label: "Reportes", href: "/admin/reportes", icon: BarChart3 },
      { label: "Finanzas", href: "/admin/finanzas", icon: CircleDollarSign }
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
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logoutAction();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <aside className="hidden min-h-screen w-[var(--sidebar-width)] flex-col border-r border-[var(--border-soft)] bg-white/80 backdrop-blur-xl lg:flex">
      {/* Brand header */}
      <div className="flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--border-soft)] px-5">
        <Image
          src="/LOGOSCAP/simbolo_solo.svg"
          alt="Carpintería Ibarra Picado"
          width={40}
          height={40}
          className="shrink-0 rounded-lg"
          priority
        />
        <div className="min-w-0">
          <p className="brand-heading truncate text-[1.05rem] font-bold italic leading-none">
            Ibarra Picado
          </p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--cacao-light)]">
            Carpintería
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

      {/* Footer badge and logout */}
      <div className="border-t border-[var(--border-soft)] p-3 space-y-2">
        <div className="rounded-lg bg-gradient-to-br from-[var(--cream)] to-[var(--brand-cream)]/40 p-3">
          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--brand)]">
            Sistema
          </p>
          <p className="mt-0.5 text-[0.8125rem] font-semibold text-[var(--cacao)]">
            Taller y ventas en línea
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[0.8125rem] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
        >
          <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
