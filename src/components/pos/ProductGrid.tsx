"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PackageOpen, Search } from "lucide-react";
import { db, type Producto } from "@/lib/db";
import { usePosStore } from "@/store/usePosStore";

function getStock(producto: Producto) {
  return Number.isFinite(producto.stock_vitrina) ? producto.stock_vitrina : 0;
}

function isSellableProduct(producto: Producto) {
  return producto.es_terminado === true && producto.en_vitrina === true;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

// Function to dynamically assign color classes based on the product category or keywords
function getCategoryColors(nombre: string) {
  const nameLower = nombre.toLowerCase();
  
  if (
    nameLower.includes("pastel") ||
    nameLower.includes("tarta") ||
    nameLower.includes("torta") ||
    nameLower.includes("queque") ||
    nameLower.includes("bizcocho") ||
    nameLower.includes("selva negra") ||
    nameLower.includes("tres leches")
  ) {
    return {
      bg: "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-950",
      pill: "bg-rose-200/60 text-rose-900 border-rose-300"
    };
  }
  
  if (
    nameLower.includes("pan") ||
    nameLower.includes("dona") ||
    nameLower.includes("croissant") ||
    nameLower.includes("bollo") ||
    nameLower.includes("galleta") ||
    nameLower.includes("baguette")
  ) {
    return {
      bg: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-950",
      pill: "bg-amber-200/60 text-amber-900 border-amber-300"
    };
  }
  
  if (
    nameLower.includes("caf") ||
    nameLower.includes("té") ||
    nameLower.includes("jugo") ||
    nameLower.includes("bebida") ||
    nameLower.includes("soda") ||
    nameLower.includes("agua")
  ) {
    return {
      bg: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950",
      pill: "bg-emerald-200/60 text-emerald-900 border-emerald-300"
    };
  }
  
  if (
    nameLower.includes("mousse") ||
    nameLower.includes("flan") ||
    nameLower.includes("pudin") ||
    nameLower.includes("helado") ||
    nameLower.includes("postre")
  ) {
    return {
      bg: "bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200 text-indigo-950",
      pill: "bg-indigo-200/60 text-indigo-900 border-indigo-300"
    };
  }

  // Default color
  return {
    bg: "bg-[var(--brand-cream)]/20 hover:bg-[var(--brand-cream)]/35 border-[var(--border-soft)] text-[var(--cacao)]",
    pill: "bg-[var(--brand-cream)]/50 text-[var(--brand-dark)] border-[var(--border-soft)]"
  };
}

export function ProductGrid() {
  const [query, setQuery] = useState("");
  const addToCart = usePosStore((state) => state.addToCart);
  const cartItems = usePosStore((state) => state.cart);

  // Live Query from Dexie
  const productos = useLiveQuery(
    async () => {
      const products = await db.productos.orderBy("nombre").filter(isSellableProduct).toArray();
      const stockRows = await db.stock_vitrina.bulkGet(products.map((product) => product.id));

      return products.map((product, index) => ({
        ...product,
        stock_vitrina: stockRows[index]?.cantidad ?? getStock(product)
      }));
    },
    [],
    []
  );

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((producto) => producto.nombre.toLowerCase().includes(term));
  }, [productos, query]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="mb-4">
        <label className="relative block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--cacao-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar producto..."
            className="field-control h-14 w-full rounded-2xl pl-12 pr-4 text-lg font-medium shadow-[var(--shadow-xs)]"
          />
        </label>
      </div>

      {/* Grid Content */}
      <div className="flex-1">
        {filteredProducts.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-soft)] bg-white p-8 text-center shadow-sm">
            <PackageOpen aria-hidden="true" className="h-12 w-12 text-[var(--brand-pastel)] animate-bounce" />
            <p className="mt-3 text-base font-bold text-[var(--cacao)]">Sin productos para vender</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--cacao-light)] leading-relaxed">
              Carga stock en vitrina o busca otro nombre de producto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((producto) => {
              const stock = getStock(producto);
              const selected = cartItems.find((item) => item.productId === producto.id)?.quantity ?? 0;
              const remainingStock = Math.max(0, stock - selected);
              const isOutOfStock = remainingStock <= 0;
              const colors = getCategoryColors(producto.nombre);

              return (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => !isOutOfStock && addToCart(producto)}
                  disabled={isOutOfStock}
                  className={`flex flex-col justify-between min-h-[7.5rem] rounded-2xl border p-4 text-left shadow-[var(--shadow-xs)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${colors.bg} ${
                    isOutOfStock
                      ? "opacity-45 cursor-not-allowed border-gray-200 bg-gray-50/50 text-gray-400"
                      : "active:scale-95"
                  }`}
                >
                  <p className="text-sm sm:text-base font-bold leading-tight line-clamp-2">
                    {producto.nombre}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-1.5">
                    <span className="text-sm sm:text-base font-extrabold">
                      {formatCurrency(producto.precio_venta)}
                    </span>
                    <span
                      className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${
                        isOutOfStock
                          ? "bg-gray-100 text-gray-500 border-gray-200"
                          : colors.pill
                      }`}
                    >
                      {isOutOfStock ? "Agotado" : `${remainingStock} ud`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
