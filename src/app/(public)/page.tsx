"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageIcon,
  Search,
  Sparkles,
  WheatOff,
  ShoppingCart,
  Trash2,
  X,
  Plus,
  Minus,
  Check,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Footer } from "@/components/public/Footer";

// Definición local del tipo Producto para evitar dependencias
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
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100">
        <ImageIcon aria-hidden="true" className="h-10 w-10 text-stone-400" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
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
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Carrito de compras público
  const [cart, setCart] = useState<ClientCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar productos directamente desde Supabase (para asegurar stock y precios reales del servidor)
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
      const alergenos = (producto.alergenos || []).join(" ").toLowerCase();
      const descripcion = (producto.descripcion || "").toLowerCase();
      return (
        producto.nombre.toLowerCase().includes(term) ||
        descripcion.includes(term) ||
        alergenos.includes(term)
      );
    });
  }, [productos, query]);

  // Acciones de Carrito
  const addToCart = (producto: Producto) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      const stock = getStock(producto);
      if (existing) {
        if (existing.cantidad >= stock) {
          alert(`Solo hay ${stock} unidades de "${producto.nombre}" en vitrina.`);
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

  // Checkout Híbrido: Supabase + WhatsApp
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert("Por favor ingresa tu nombre para registrar el pedido.");
      return;
    }
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Insertar registro en Supabase
      const payload = {
        cliente_nombre: clientName.trim(),
        items: cart.map((item) => ({
          id: item.producto.id,
          nombre: item.producto.nombre,
          precio_unitario: item.producto.precio_venta,
          cantidad: item.cantidad
        })),
        total: cartTotal,
        estado: "ESPERANDO_WSP"
      };

      const { data, error, status } = await (supabase.from("pedidos_clientes" as any) as any)
        .insert(payload)
        .select("id")
        .single();

      // Validar respuesta exitosa (código HTTP 20x)
      if (error || !data || status < 200 || status >= 300) {
        throw error || new Error(`No se obtuvo respuesta exitosa de Supabase (status: ${status})`);
      }

      // 2. Extraer código corto del UUID
      const shortCode = data.id.split("-")[0].toUpperCase();

      // 3. Generar mensaje de WhatsApp
      const itemsText = cart
        .map((item) => `- ${item.cantidad}x ${item.producto.nombre} (${formatCurrency(item.producto.precio_venta * item.cantidad)})`)
        .join("\n");
      const wspMessage = `¡Hola! Soy ${clientName.trim()}, mi código de pedido es #${shortCode} y quiero confirmar mi carrito:\n\n${itemsText}\n\nTotal: ${formatCurrency(cartTotal)}`;

      const phone = "50588888888"; // Número de la pastelería
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(wspMessage)}`;

      // 4. Redirigir a WhatsApp
      window.open(whatsappUrl, "_blank");

      // 5. Limpieza y notificación de éxito
      alert(`¡Pedido registrado! Tu código de aprobación es #${shortCode}. Redirigiendo a WhatsApp...`);
      clearCart();
      setClientName("");
      setIsCartOpen(false);
    } catch (err) {
      console.error("[Checkout] Error al enviar pedido híbrido:", err);
      alert("No pudimos registrar tu pedido. Revisa tu conexión a internet e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FFF6F6] text-[#4A2B32] flex flex-col justify-between">
      <div className="flex-1">
        {/* Cabecera pública */}
        <header className="sticky top-0 z-30 border-b border-[#F2D6DE] bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8B2E54]">Riquiquísimo</p>
                <h1 className="brand-heading mt-1 truncate text-2xl font-semibold">Vitrina de hoy</h1>
              </div>
              <div className="flex items-center gap-2">
                {/* Botón del Carrito */}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-[#F2D6DE] bg-white px-4 text-xs font-bold uppercase tracking-wider text-[#6F4A52] hover:bg-[#FFF9F5] hover:text-[#B83E6C] transition-colors focus:outline-none"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Mi Carrito</span>
                  {totalItemsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#B83E6C] text-white text-[10px] font-bold shadow-md">
                      {totalItemsCount}
                    </span>
                  )}
                </button>

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

        {/* Listado de Productos */}
        <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          {loading ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#B83E6C] border-t-transparent"></div>
              <p className="text-sm font-semibold text-[#6F4A52]">Cargando vitrina en tiempo real...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-md border border-dashed border-stone-300 bg-white p-8 text-center">
              <WheatOff aria-hidden="true" className="h-10 w-10 text-[#F48CAA]" />
              <p className="mt-3 text-sm font-semibold text-[#4A2B32]">No hay productos en vitrina</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#6F4A52]">
                Cuando el vendedor cargue stock terminado en vitrina, aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((producto) => {
                const stock = getStock(producto);
                const cartQty = cart.find(x => x.producto.id === producto.id)?.cantidad || 0;
                const isOutOfStock = stock - cartQty <= 0;

                return (
                  <article key={producto.id} className="overflow-hidden rounded-xl border border-[#F2D6DE] bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <ProductPhoto producto={producto} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-base font-bold text-[#4A2B32]">{producto.nombre}</h2>
                            <p className="mt-1 text-sm font-black text-[#8B2E54]">{formatCurrency(producto.precio_venta)}</p>
                          </div>
                          <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${isOutOfStock ? "bg-red-50 text-red-700" : "bg-[#FFF6F6] text-[#8B2E54]"}`}>
                            {isOutOfStock ? "Agotado" : `${stock - cartQty} disp.`}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6F4A52]">
                          {producto.descripcion || "Producto fresco disponible en vitrina de hoy."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {producto.alergenos && producto.alergenos.length > 0 ? (
                            producto.alergenos.map((alergeno) => (
                              <span
                                key={alergeno}
                                className="rounded-md bg-[#FDE1E6] px-2 py-0.5 text-[10px] font-bold text-[#8B2E54]"
                              >
                                {alergeno}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-md bg-[#FFF9F5] px-2 py-0.5 text-[10px] font-medium text-[#6F4A52]">
                              Sin alérgenos
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
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
                          isOutOfStock
                            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                            : "bg-[#B83E6C] text-white hover:bg-[#8B2E54] active:scale-95 shadow-sm"
                        }`}
                      >
                        {isOutOfStock ? "Sin inventario" : "Agregar al Pedido"}
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

      {/* Cajón lateral del Carrito del Cliente */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-[#FFF9F5] border-l border-[#F2D6DE] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Carrito */}
            <header className="flex h-16 items-center justify-between border-b border-[#F2D6DE] bg-white px-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#B83E6C]" />
                <h3 className="font-extrabold text-lg text-[#4A2B32]">Mi Pedido</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F2D6DE] text-[#6F4A52] hover:bg-[#FFF6F6] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center space-y-2 text-[#6F4A52]">
                  <ShoppingCart className="h-10 w-10 text-stone-300" />
                  <p className="font-bold text-sm">Tu carrito está vacío</p>
                  <p className="text-xs max-w-[200px]">Agrega productos del catálogo para armar tu pedido.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <article
                    key={item.producto.id}
                    className="rounded-xl border border-[#F2D6DE] bg-white p-3 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-[#4A2B32] truncate">{item.producto.nombre}</h4>
                      <p className="text-xs text-[#8B2E54] font-semibold mt-0.5">
                        {formatCurrency(item.producto.precio_venta)} c/u
                      </p>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decrementCart(item.producto.id)}
                        className="h-7 w-7 rounded-md border border-[#F2D6DE] bg-white text-[#4A2B32] flex items-center justify-center hover:bg-[#FFF6F6]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-extrabold text-sm text-[#4A2B32] w-5 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => addToCart(item.producto)}
                        className="h-7 w-7 rounded-md border border-[#F2D6DE] bg-white text-[#4A2B32] flex items-center justify-center hover:bg-[#FFF6F6]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.producto.id)}
                        className="h-7 w-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 ml-1"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* Resumen y Envío */}
            {cart.length > 0 && (
              <footer className="border-t border-[#F2D6DE] bg-white p-5 space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-[#6F4A52]">Total Estimado</span>
                  <span className="text-xl font-black text-[#8B2E54]">{formatCurrency(cartTotal)}</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#6F4A52] uppercase tracking-wide mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Roberto Martínez"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full h-11 border border-[#F2D6DE] rounded-lg px-3 text-sm focus:outline-none focus:border-[#B83E6C] placeholder:text-stone-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        Confirmar y Enviar por WhatsApp
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
    </main>
  );
}
