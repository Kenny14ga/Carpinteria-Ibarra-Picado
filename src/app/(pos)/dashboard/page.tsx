"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { usePosStore } from "@/store/usePosStore";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartTicket } from "@/components/pos/CartTicket";
import { logoutAction } from "@/app/auth/actions";

export default function PosDashboardPage() {
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
  // Simple live query to get active vitrina count for dashboard header
  const vitrinaCount = useLiveQuery(
    async () => {
      return await db.productos
        .filter((p) => p.es_terminado === true && p.en_vitrina === true)
        .count();
    },
    [],
    0
  );

  const cartItems = usePosStore((state) => state.cart);
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[var(--blush)] pb-24 lg:pb-8">
      {/* POS Top Header */}
      <header className="app-header px-4 py-4 sm:px-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded px-1 py-0.5"
              >
                ← Volver al Panel
              </Link>
              <span className="text-[var(--border-soft)]">|</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded px-1 py-0.5"
              >
                <LogOut className="h-3 w-3" />
                Cerrar Sesión
              </button>
            </div>
            <h1 className="brand-heading mt-1 text-2xl font-black sm:text-3xl">Caja Táctil</h1>
          </div>

          {/* Quick Stats on Desktop Header */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block rounded-xl border border-[var(--border-soft)] bg-[var(--cream)] px-3 py-1.5 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[var(--brand)]">Productos</p>
              <p className="text-base font-extrabold text-[var(--cacao)]">{vitrinaCount}</p>
            </div>
            <div className="hidden sm:block rounded-xl border border-[var(--border-soft)] bg-[var(--cream)] px-3 py-1.5 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[var(--brand)]">Venta Actual</p>
              <p className="text-base font-extrabold text-[var(--cacao)]">{itemCount} uds</p>
            </div>
          </div>
        </div>
      </header>

      {/* Responsive Grid Layout */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:flex lg:items-start lg:gap-6">
        {/* Main interactive product grid */}
        <main className="min-w-0 flex-1">
          <ProductGrid />
        </main>

        {/* Sidebar ticket panel */}
        <aside className="mt-6 lg:mt-0 shrink-0">
          <CartTicket />
        </aside>
      </div>
    </div>
  );
}
