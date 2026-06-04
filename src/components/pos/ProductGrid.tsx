"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PackageOpen, Search, ImageIcon } from "lucide-react";
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

function ProductPhoto({ producto }: { producto: Producto }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const hasBlob = producto.imagen_blob instanceof Blob;
  const hasUrl = Boolean(producto.imagen_url);

  useEffect(() => {
    if (!hasBlob || !producto.imagen_blob || !imageRef.current) {
      return;
    }

    const objectUrl = URL.createObjectURL(producto.imagen_blob);
    imageRef.current.src = objectUrl;

    return () => URL.revokeObjectURL(objectUrl);
  }, [hasBlob, producto.imagen_blob]);

  if (!hasBlob && !hasUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-100">
        <ImageIcon aria-hidden="true" className="h-6 w-6 text-stone-400" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      src={hasBlob ? undefined : producto.imagen_url}
      alt={producto.nombre}
      className="h-full w-full object-cover"
    />
  );
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
                  className={`flex flex-col rounded-2xl border text-left shadow-[var(--shadow-xs)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 overflow-hidden ${colors.bg} ${
                    isOutOfStock
                      ? "opacity-45 cursor-not-allowed border-gray-200 bg-gray-50/50 text-gray-400"
                      : "active:scale-95"
                  }`}
                  style={{ minHeight: "10.5rem" }}
                >
                  {/* Foto del producto */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "4/3",
                      position: "relative",
                      background: "#f5ecea",
                      overflow: "hidden",
                      borderBottom: isOutOfStock
                        ? "1.5px solid #e5e7eb"
                        : "1.5px solid var(--border-soft)",
                    }}
                  >
                    <ProductPhoto producto={producto} />
                  </div>

                  {/* Detalles */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "0.625rem 0.5rem",
                      gap: "0.375rem",
                      flex: 1,
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <p className="text-xs sm:text-sm font-bold leading-tight line-clamp-2 text-center w-full">
                      {producto.nombre}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", width: "100%" }}>
                      <span className="text-sm font-extrabold text-center">
                        {formatCurrency(producto.precio_venta)}
                      </span>
                      <span
                        className={`rounded-lg border px-1.5 py-0.5 text-[10px] sm:text-xs font-bold ${
                          isOutOfStock
                            ? "bg-gray-100 text-gray-500 border-gray-200"
                            : colors.pill
                        }`}
                      >
                        {isOutOfStock ? "Agotado" : `${remainingStock} ud`}
                      </span>
                    </div>
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
