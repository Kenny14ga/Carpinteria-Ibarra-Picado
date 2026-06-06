"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  DoorOpen,
  Hammer,
  ImageIcon,
  Minus,
  PackageX,
  Plus,
  Ruler,
  Search,
  ShoppingCart,
  Trash2,
  X
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Footer } from "@/components/public/Footer";
import { generateWhatsAppLink } from "@/lib/utils/whatsapp";

type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  precio_venta: number;
  es_terminado: boolean;
  en_vitrina: boolean;
  stock_vitrina: number;
  alergenos: string[];
  imagen_url?: string;
  imagen_blob?: Blob;
};

type ClientCartItem = {
  producto: Producto;
  cantidad: number;
};

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
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[var(--cream)]">
        <DoorOpen aria-hidden="true" className="h-12 w-12 text-[var(--brand-pastel)] transition-transform duration-500 group-hover:scale-110" />
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--cream)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={hasBlob ? undefined : producto.imagen_url}
        alt={producto.nombre}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
  );
}

export default function CatalogoPage() {
  const [query, setQuery] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<ClientCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customDetails, setCustomDetails] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [customMeasures, setCustomMeasures] = useState("");
  const [isCustomSubmitting, setIsCustomSubmitting] = useState(false);

  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("*")
          .eq("es_terminado", true)
          .eq("en_vitrina", true)
          .gt("stock_vitrina", 0)
          .order("nombre");

        if (error) throw error;
        setProductos((data || []) as Producto[]);
      } catch (err) {
        console.error("[CatalogoPage] Error al cargar productos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return productos;
    }

    return productos.filter((producto) => {
      const tags = (producto.alergenos || []).join(" ").toLowerCase();
      const descripcion = (producto.descripcion || "").toLowerCase();
      return (
        producto.nombre.toLowerCase().includes(term) ||
        descripcion.includes(term) ||
        tags.includes(term)
      );
    });
  }, [productos, query]);

  const addToCart = (producto: Producto) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      const stock = getStock(producto);

      if (existing) {
        if (existing.cantidad >= stock) {
          alert(`Solo hay ${stock} unidades disponibles de "${producto.nombre}".`);
          return prev;
        }

        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const decrementCart = (productoId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.producto.id === productoId
            ? { ...item, cantidad: item.cantidad - 1 }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const removeFromCart = (productoId: string) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== productoId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.producto.precio_venta * item.cantidad, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.cantidad, 0);
  }, [cart]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      alert("Por favor ingresa tu nombre para registrar la cotización.");
      return;
    }

    if (!clientPhone.trim()) {
      alert("Por favor ingresa tu número de teléfono.");
      return;
    }

    if (!clientAddress.trim()) {
      alert("Por favor ingresa la dirección de entrega o instalación.");
      return;
    }

    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        cliente_nombre: clientName.trim(),
        telefono: clientPhone.trim(),
        direccion: clientAddress.trim(),
        items: cart.map((item) => ({
          id: item.producto.id,
          nombre: item.producto.nombre,
          precio_unitario: item.producto.precio_venta,
          cantidad: item.cantidad
        })),
        total: cartTotal,
        estado: "ESPERANDO_WSP"
      };

      const { data, error, status } = await supabase
        .from("pedidos_clientes")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data || status < 200 || status >= 300) {
        throw error || new Error(`No se obtuvo respuesta exitosa de Supabase (status: ${status})`);
      }

      const shortCode = data.id.split("-")[0].toUpperCase();
      const whatsappUrl = generateWhatsAppLink(
        data.id,
        clientName,
        payload.items,
        cartTotal,
        {
          telefono: clientPhone,
          direccion: clientAddress
        }
      );

      window.open(whatsappUrl, "_blank");
      alert(`Cotización registrada. Código de aprobación: #${shortCode}. Te llevamos a WhatsApp para confirmar detalles.`);
      clearCart();
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setIsCartOpen(false);
    } catch (err) {
      console.error("[Checkout] Error al enviar cotización:", err);
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`No pudimos registrar la cotización. Detalle: ${errMsg}\n\nRevisa tu conexión o la configuración del servidor e inténtalo de nuevo.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customName.trim()) {
      alert("Por favor ingresa tu nombre completo.");
      return;
    }

    if (!customPhone.trim()) {
      alert("Por favor ingresa tu número de teléfono.");
      return;
    }

    if (!customAddress.trim()) {
      alert("Por favor ingresa la dirección del proyecto.");
      return;
    }

    if (!customDetails.trim()) {
      alert("Por favor describe el trabajo de carpintería que necesitas.");
      return;
    }

    setIsCustomSubmitting(true);
    try {
      const fullDetails = [
        customMeasures ? `Medidas: ${customMeasures}` : null,
        customDate ? `Fecha solicitada: ${customDate}` : null,
        customDetails.trim()
      ].filter(Boolean).join("\n");

      const payload = {
        cliente_nombre: customName.trim(),
        telefono: customPhone.trim(),
        direccion: customAddress.trim(),
        detalles_personalizados: fullDetails,
        items: [
          {
            id: "custom-carpentry-order",
            nombre: "Trabajo de carpintería a medida",
            cantidad: 1,
            precio_unitario: 0
          }
        ],
        total: 0,
        estado: "ESPERANDO_WSP"
      };

      const { data, error, status } = await supabase
        .from("pedidos_clientes")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data || status < 200 || status >= 300) {
        throw error || new Error(`No se obtuvo respuesta exitosa de Supabase (status: ${status})`);
      }

      const shortCode = data.id.split("-")[0].toUpperCase();
      const whatsappUrl = generateWhatsAppLink(
        data.id,
        customName,
        [],
        0,
        {
          telefono: customPhone,
          direccion: customAddress,
          detalles_personalizados: fullDetails,
          fecha_entrega: customDate,
          porciones: customMeasures
        }
      );

      window.open(whatsappUrl, "_blank");
      alert(`Solicitud registrada. Código de aprobación: #${shortCode}. Te llevamos a WhatsApp para coordinar medidas y cotización.`);

      setCustomName("");
      setCustomPhone("");
      setCustomAddress("");
      setCustomDetails("");
      setCustomDate("");
      setCustomMeasures("");
      setIsCustomOrderOpen(false);
    } catch (err) {
      console.error("[CustomOrder] Error al enviar solicitud:", err);
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`No pudimos registrar tu solicitud. Detalle: ${errMsg}\n\nRevisa tu conexión o la configuración del servidor e inténtalo de nuevo.`);
    } finally {
      setIsCustomSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col justify-between bg-[var(--blush)] text-[var(--cacao)]">
      <div className="flex-1">
        <header className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-white/95 px-4 py-2 backdrop-blur sm:px-6 md:py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/LOGOSCAP/logo_horizontal_web.svg"
                alt="Carpintería Ibarra Picado"
                className="h-12 w-auto shrink-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-white px-4 text-xs font-bold uppercase tracking-wider text-[var(--cacao-light)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--brand)] focus:outline-none"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Cotización</span>
                {totalItemsCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white shadow-md">
                    {totalItemsCount}
                  </span>
                )}
              </button>

              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-soft)] px-4 text-xs font-bold uppercase tracking-wider text-[var(--cacao-light)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </header>

        <section className="border-b border-[var(--border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,var(--cream)_100%)] px-4 py-6">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand)]">
                Calidad - diseño - funcionalidad
              </p>
              <h1 className="brand-heading mt-2 text-3xl font-black leading-tight sm:text-4xl">
                Puertas, muebles y trabajos de madera listos para cotizar.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--cacao-light)]">
                Revisa productos disponibles, solicita una cotización rápida o envía un proyecto a medida con medidas, acabados e instalación.
              </p>
              <label className="relative mt-5 block w-full max-w-xl rounded-lg shadow-sm focus-within:shadow-md">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cacao-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar puertas, closets, mesas, herrajes o acabados"
                  className="field-control h-12 w-full rounded-lg pl-11 pr-4 text-base"
                />
              </label>
            </div>

            <div className="rounded-xl border border-[var(--border-soft)] bg-white p-5 shadow-[var(--shadow-sm)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-cream)] text-[var(--brand-dark)]">
                  <Ruler className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[var(--cacao)]">
                    Proyecto a medida
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--cacao-light)]">
                    Envíanos medidas, tipo de madera, acabado y ubicación para revisar factibilidad e instalación.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomOrderOpen(true)}
                className="btn-primary mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-5 text-xs font-bold uppercase tracking-wider transition active:scale-95"
              >
                <Hammer className="h-4 w-4 text-white" />
                Solicitar trabajo a medida
              </button>
            </div>
          </div>
        </section>

        <section id="catalogo-productos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-6 sm:px-6">
          {loading ? (
            <div className="flex min-h-[46vh] flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
              <p className="text-sm font-semibold text-[var(--cacao-light)]">Cargando inventario disponible...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-soft)] bg-white p-8 text-center">
              <PackageX aria-hidden="true" className="h-10 w-10 text-[var(--brand-pastel)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--cacao)]">No hay productos disponibles</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--cacao-light)]">
                Cuando el taller cargue stock terminado, aparecerá aquí automáticamente para cotizar.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((producto) => {
                const stock = getStock(producto);
                const cartQty = cart.find((item) => item.producto.id === producto.id)?.cantidad || 0;
                const isOutOfStock = stock - cartQty <= 0;

                return (
                  <article
                    key={producto.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-lg)]"
                  >
                    <div>
                      <ProductPhoto producto={producto} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-base font-bold text-[var(--cacao)]">{producto.nombre}</h2>
                            <p className="mt-1 text-sm font-black text-[var(--brand-dark)]">{formatCurrency(producto.precio_venta)}</p>
                          </div>
                          <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${isOutOfStock ? "bg-red-50 text-red-700" : "bg-[var(--brand-cream)] text-[var(--brand-dark)]"}`}>
                            {isOutOfStock ? "Agotado" : `${stock - cartQty} disp.`}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--cacao-light)]">
                          {producto.descripcion || "Producto de carpintería disponible para venta o cotización."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {producto.alergenos && producto.alergenos.length > 0 ? (
                            producto.alergenos.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-[var(--cream)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-dark)]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-md bg-[var(--cream)] px-2 py-0.5 text-[10px] font-medium text-[var(--cacao-light)]">
                              Madera y acabado por confirmar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(producto)}
                        className={`w-full rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                          isOutOfStock
                            ? "cursor-not-allowed bg-stone-100 text-stone-400"
                            : "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-dark)] active:scale-95"
                        }`}
                      >
                        {isOutOfStock ? "Sin inventario" : "Agregar a cotización"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Footer />

      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-[var(--border-soft)] bg-[var(--cream)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex h-16 items-center justify-between border-b border-[var(--border-soft)] bg-white px-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[var(--brand)]" />
                <h3 className="text-lg font-extrabold text-[var(--cacao)]">Cotización</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--cacao-light)] transition hover:bg-[var(--cream)]"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex h-full min-h-[40vh] flex-col items-center justify-center space-y-2 text-center text-[var(--cacao-light)]">
                  <ShoppingCart className="h-10 w-10 text-[var(--border-soft)]" />
                  <p className="text-sm font-bold">No hay productos seleccionados</p>
                  <p className="max-w-[220px] text-xs">Agrega productos del catálogo para preparar una cotización.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <article
                    key={item.producto.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-white p-3 shadow-[var(--shadow-xs)]"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-[var(--cacao)]">{item.producto.nombre}</h4>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--brand-dark)]">
                        {formatCurrency(item.producto.precio_venta)} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decrementCart(item.producto.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--cacao)] hover:bg-[var(--cream)]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-extrabold text-[var(--cacao)]">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => addToCart(item.producto)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--cacao)] hover:bg-[var(--cream)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.producto.id)}
                        className="ml-1 flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <footer className="space-y-4 border-t border-[var(--border-soft)] bg-white p-5">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-[var(--cacao-light)]">Total estimado</span>
                  <span className="text-xl font-black text-[var(--brand-dark)]">{formatCurrency(cartTotal)}</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--cacao-light)]">Nombre completo</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Roberto Martínez"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="field-control h-11 w-full rounded-lg px-3 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--cacao-light)]">Teléfono de contacto</span>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 8888-8888"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="field-control h-11 w-full rounded-lg px-3 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--cacao-light)]">Dirección de entrega o instalación</span>
                    <textarea
                      required
                      placeholder="Dirección exacta, barrio o punto de referencia..."
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="field-control min-h-[70px] w-full resize-none rounded-lg p-3 text-sm"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-sm font-extrabold uppercase tracking-wider text-white transition hover:bg-[#245b55] active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        Confirmar por WhatsApp
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </footer>
            )}
          </div>
        </div>
      )}

      {isCustomOrderOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"
          onClick={() => setIsCustomOrderOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-[var(--border-soft)] bg-[var(--cream)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex h-16 items-center justify-between border-b border-[var(--border-soft)] bg-white px-5">
              <div className="flex items-center gap-2">
                <Hammer className="h-5 w-5 text-[var(--brand)]" />
                <h3 className="text-lg font-extrabold text-[var(--cacao)]">Trabajo a medida</h3>
              </div>
              <button
                onClick={() => setIsCustomOrderOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--cacao-light)] transition hover:bg-[var(--cream)]"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleCustomOrderSubmit} className="flex flex-1 flex-col justify-between overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <p className="rounded-xl border border-[var(--border-soft)] bg-white p-3.5 text-xs leading-relaxed text-[var(--cacao-light)]">
                  Describe el tipo de pieza, medidas, madera, acabado, herrajes e instalación. El equipo revisará la solicitud antes de confirmar precio y fecha.
                </p>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--cacao-light)]">Nombre completo</span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Roberto Martínez"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="field-control h-11 w-full rounded-lg px-3 text-sm"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--cacao-light)]">Teléfono</span>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 8888-8888"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="field-control h-11 w-full rounded-lg px-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--cacao-light)]">Medidas</span>
                    <input
                      type="text"
                      placeholder="Ej. 90 x 210 cm"
                      value={customMeasures}
                      onChange={(e) => setCustomMeasures(e.target.value)}
                      className="field-control h-11 w-full rounded-lg px-3 text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--cacao-light)]">Fecha requerida</span>
                  <input
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="field-control h-11 w-full rounded-lg px-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--cacao-light)]">Dirección del proyecto</span>
                  <textarea
                    required
                    placeholder="Ubicación donde se entrega o instala..."
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="field-control min-h-[70px] w-full resize-none rounded-lg p-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--cacao-light)]">Detalle del trabajo</span>
                  <textarea
                    required
                    placeholder="Ej. puerta principal de cedro con marco, bisagras reforzadas, acabado natural e instalación..."
                    value={customDetails}
                    onChange={(e) => setCustomDetails(e.target.value)}
                    className="field-control min-h-[100px] w-full resize-none rounded-lg p-3 text-sm"
                  />
                </label>
              </div>

              <footer className="border-t border-[var(--border-soft)] bg-white p-5">
                <button
                  type="submit"
                  disabled={isCustomSubmitting}
                  className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-extrabold uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                >
                  {isCustomSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      Enviar solicitud
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
