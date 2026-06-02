"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ImageIcon, Search, Sparkles, WheatOff } from "lucide-react";
import Link from "next/link";
import { db, type Producto } from "@/lib/db";
import { Footer } from "@/components/public/Footer";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

function getStock(producto: Producto) {
  return Number.isFinite(producto.stock_vitrina) ? producto.stock_vitrina : 0;
}

function isCatalogProduct(producto: Producto) {
  return producto.es_terminado === true && producto.en_vitrina === true && getStock(producto) > 0;
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
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100">
        <ImageIcon aria-hidden="true" className="h-10 w-10 text-stone-400" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Las fotos pueden venir como Blob local de IndexedDB.
    <img
      ref={imageRef}
      src={hasBlob ? undefined : producto.imagen_url}
      alt={producto.nombre}
      className="aspect-[4/3] w-full object-cover"
    />
  );
}

export default function CatalogoPage() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        setQuery(q);
      }
    }
  }, []);

  const productos = useLiveQuery(
    () => db.productos.orderBy("nombre").filter(isCatalogProduct).toArray(),
    [],
    []
  );

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return productos;
    }

    return productos.filter((producto) => {
      const alergenos = producto.alergenos.join(" ").toLowerCase();
      return (
        producto.nombre.toLowerCase().includes(term) ||
        producto.descripcion.toLowerCase().includes(term) ||
        alergenos.includes(term)
      );
    });
  }, [productos, query]);

  return (
    <main className="min-h-screen bg-[#FFF6F6] text-[#4A2B32] flex flex-col justify-between">
      <div className="flex-1">
        <header className="sticky top-0 z-30 border-b border-[#F2D6DE] bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8B2E54]">Riquiquísimo</p>
                <h1 className="brand-heading mt-1 truncate text-2xl font-semibold">Vitrina de hoy</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-[#F2D6DE] px-4 text-xs font-bold uppercase tracking-wider text-[#6F4A52] hover:bg-[#FFF9F5] hover:text-[#B83E6C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B83E6C]"
                >
                  Iniciar Sesión
                </Link>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#B83E6C] text-white">
                  <Sparkles aria-hidden="true" className="h-5 w-5" />
                  <span className="sr-only">Productos frescos</span>
                </div>
              </div>
            </div>

            <label className="relative block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58B96]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, descripción o alérgeno"
                className="field-control h-12 w-full rounded-md pl-10 pr-3 text-base placeholder:text-[#B58B96]"
              />
            </label>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          {filteredProducts.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-md border border-dashed border-stone-300 bg-white p-8 text-center">
              <WheatOff aria-hidden="true" className="h-10 w-10 text-[#F48CAA]" />
              <p className="mt-3 text-sm font-semibold text-[#4A2B32]">No hay productos en vitrina</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#6F4A52]">
                Cuando el vendedor cargue stock terminado en Dexie, aparecerá aquí para consulta pública.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((producto) => (
                <article key={producto.id} className="overflow-hidden rounded-md border border-[#F2D6DE] bg-white shadow-sm">
                  <ProductPhoto producto={producto} />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-[#4A2B32]">{producto.nombre}</h2>
                        <p className="mt-1 text-sm font-semibold text-[#8B2E54]">{formatCurrency(producto.precio_venta)}</p>
                      </div>
                      <span className="status-success shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold">
                        {getStock(producto)} disp.
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6F4A52]">
                      {producto.descripcion || "Producto terminado disponible en vitrina."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {producto.alergenos.length > 0 ? (
                        producto.alergenos.map((alergeno) => (
                          <span
                            key={alergeno}
                            className="rounded-md bg-[#FDE1E6] px-2.5 py-1 text-xs font-medium text-[#8B2E54]"
                          >
                            {alergeno}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-md bg-[#FFF9F5] px-2.5 py-1 text-xs font-medium text-[#6F4A52]">
                          Sin alérgenos declarados
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </main>
  );
}
