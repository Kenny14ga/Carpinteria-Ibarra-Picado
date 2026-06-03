"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Producto } from "@/lib/db";
import { usePosStore, type PosCartItem } from "@/store/usePosStore";
import {
  Store,
  Cake,
  Cookie,
  Coffee,
  Croissant,
  IceCream,
  ReceiptText,
  Trash2,
  X,
  Plus,
  Minus
} from "lucide-react";

/* ─── Helpers ─── */

function getStock(producto: Producto): number {
  return Number.isFinite(producto.stock_vitrina) ? producto.stock_vitrina : 0;
}

function isSellableProduct(producto: Producto): boolean {
  return producto.es_terminado === true && producto.en_vitrina === true;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2,
  }).format(value);
}

/* ─── Categorías estáticas para filtro ─── */
type Categoria = { id: string; label: string; icon: React.ComponentType<any> };

const CATEGORIAS: Categoria[] = [
  { id: "todos", label: "Todos", icon: Store },
  { id: "pasteles", label: "Pasteles", icon: Cake },
  { id: "galletas", label: "Galletas", icon: Cookie },
  { id: "bebidas", label: "Bebidas", icon: Coffee },
  { id: "pan", label: "Pan", icon: Croissant },
  { id: "postres", label: "Postres", icon: IceCream },
];

/** Inferir categoría a partir del nombre del producto para el filtro local */
function inferCategory(nombre: string): string {
  const n = nombre.toLowerCase();
  if (
    n.includes("pastel") || n.includes("tarta") || n.includes("torta") ||
    n.includes("queque") || n.includes("bizcocho") || n.includes("velvet") ||
    n.includes("tres leches") || n.includes("selva negra")
  ) return "pasteles";
  if (n.includes("galleta") || n.includes("cookie")) return "galletas";
  if (
    n.includes("café") || n.includes("cafe") || n.includes("té") ||
    n.includes("jugo") || n.includes("bebida") || n.includes("chocolate caliente") ||
    n.includes("agua") || n.includes("soda") || n.includes("frappé")
  ) return "bebidas";
  if (
    n.includes("pan") || n.includes("cuerno") || n.includes("croissant") ||
    n.includes("dona") || n.includes("bollo") || n.includes("baguette")
  ) return "pan";
  if (
    n.includes("flan") || n.includes("mousse") || n.includes("pudín") ||
    n.includes("helado") || n.includes("postre") || n.includes("cheesecake") ||
    n.includes("brownie")
  ) return "postres";
  return "otros";
}

/* ═══════════════════════════════════════════════════════════════════════
   PANEL IZQUIERDO: Filtros por categoría (aislado para evitar re-renders)
   ═══════════════════════════════════════════════════════════════════════ */
function CategoriesPanel({
  categoriaActiva,
  onSelect,
}: {
  categoriaActiva: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside
      id="pos-categories-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.375rem",
        padding: "0.75rem 0.5rem",
        overflowY: "auto",
        borderRight: "1px solid var(--border-soft)",
        background:
          "linear-gradient(180deg, rgba(253, 225, 230, 0.3) 0%, var(--blush) 50%)",
      }}
    >
      <p
        style={{
          fontSize: "0.6rem",
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--cacao-muted)",
          textAlign: "center",
          padding: "0 0 0.375rem",
        }}
      >
        Categorías
      </p>
      {CATEGORIAS.map((cat) => {
        const isActive = cat.id === categoriaActiva;
        return (
          <button
            key={cat.id}
            id={`pos-category-${cat.id}`}
            type="button"
            onClick={() => onSelect(cat.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.875rem 0.5rem",
              borderRadius: "0.875rem",
              border: isActive
                ? "2px solid var(--brand)"
                : "1.5px solid transparent",
              background: isActive
                ? "linear-gradient(135deg, var(--brand-cream) 0%, rgba(244, 140, 170, 0.15) 100%)"
                : "var(--card)",
              boxShadow: isActive ? "var(--shadow-sm)" : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <cat.icon
              className="h-6 w-6 transition-colors"
              style={{
                color: isActive ? "var(--brand-dark)" : "var(--cacao-muted)",
              }}
            />
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: isActive ? 800 : 600,
                color: isActive ? "var(--brand-dark)" : "var(--cacao-muted)",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                lineHeight: 1.2,
                textAlign: "center",
              }}
            >
              {cat.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PANEL CENTRAL: Vitrina de productos (consume Dexie + Zustand addToCart)
   ═══════════════════════════════════════════════════════════════════════ */
function VitrinaPanel({ categoriaActiva }: { categoriaActiva: string }) {
  const addToCart = usePosStore((s) => s.addToCart);
  const cartItems = usePosStore((s) => s.cart);
  const storeError = usePosStore((s) => s.error);

  // Live query: productos desde Dexie con stock real
  const productos = useLiveQuery(
    async () => {
      const products = await db.productos
        .orderBy("nombre")
        .filter(isSellableProduct)
        .toArray();
      const stockRows = await db.stock_vitrina.bulkGet(
        products.map((p) => p.id)
      );
      return products.map((product, i) => ({
        ...product,
        stock_vitrina: stockRows[i]?.cantidad ?? getStock(product),
      }));
    },
    [],
    []
  );

  // Filtrado local por categoría inferida
  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === "todos") return productos;
    return productos.filter(
      (p) => inferCategory(p.nombre) === categoriaActiva
    );
  }, [productos, categoriaActiva]);

  const itemCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  const handleAddToCart = useCallback(
    (producto: Producto) => {
      addToCart({
        id: producto.id,
        nombre: producto.nombre,
        precio_venta: producto.precio_venta,
        stock_vitrina: producto.stock_vitrina,
      });
    },
    [addToCart]
  );

  return (
    <section
      id="pos-vitrina-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Encabezado de la vitrina */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border-soft)",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.1rem",
              fontWeight: 900,
              color: "var(--cacao)",
              margin: 0,
              lineHeight: 1.2,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            {(() => {
              const CatIcon = CATEGORIAS.find((c) => c.id === categoriaActiva)?.icon || Store;
              return <CatIcon className="h-5 w-5 text-brand" />;
            })()}
            {categoriaActiva === "todos"
              ? "Todos los Productos"
              : CATEGORIAS.find((c) => c.id === categoriaActiva)?.label}
          </h1>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--cacao-muted)",
              margin: 0,
              marginTop: "0.125rem",
            }}
          >
            {productosFiltrados.length} producto
            {productosFiltrados.length !== 1 ? "s" : ""} disponible
            {productosFiltrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Mini indicador de carrito */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.375rem 0.75rem",
            borderRadius: "9999px",
            background: "var(--brand-cream)",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--brand-dark)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          {itemCount} uds
        </div>
      </div>

      {/* Error de stock del store */}
      {storeError && (
        <div
          style={{
            margin: "0.5rem 1rem 0",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            background: "var(--danger-bg)",
            color: "var(--danger)",
            fontSize: "0.7rem",
            fontWeight: 700,
            animation: "fade-in 0.25s ease-out both",
          }}
        >
          {storeError}
        </div>
      )}

      {/* Grid de productos con scroll */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.75rem 1rem",
        }}
      >
        {productosFiltrados.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: "16rem",
              gap: "0.75rem",
              color: "var(--cacao-muted)",
              textAlign: "center",
              padding: "2rem 1rem",
              border: "2px dashed var(--border-soft)",
              borderRadius: "1rem",
              background: "white",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-pastel)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: "pulse-soft 2s ease-in-out infinite" }}
            >
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, lineHeight: 1.4 }}>
              Sin productos en vitrina
            </p>
            <p style={{ fontSize: "0.72rem", fontWeight: 500 }}>
              Carga stock en vitrina desde el panel de administración.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
              gap: "0.625rem",
            }}
          >
            {productosFiltrados.map((producto, index) => {
              const stock = getStock(producto);
              const inCart =
                cartItems.find((item) => item.productId === producto.id)
                  ?.quantity ?? 0;
              const remainingStock = Math.max(0, stock - inCart);
              const isOutOfStock = remainingStock <= 0;

              return (
                <button
                  key={producto.id}
                  id={`pos-product-${producto.id}`}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => !isOutOfStock && handleAddToCart(producto)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1.125rem 0.75rem",
                    borderRadius: "1rem",
                    border: isOutOfStock
                      ? "1.5px solid #e5e7eb"
                      : inCart > 0
                        ? "2px solid var(--brand-pastel)"
                        : "1.5px solid var(--border-soft)",
                    background: isOutOfStock
                      ? "#f9fafb"
                      : inCart > 0
                        ? "linear-gradient(135deg, var(--brand-cream) 0%, rgba(244, 140, 170, 0.08) 100%)"
                        : "var(--card)",
                    cursor: isOutOfStock ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isOutOfStock ? "none" : "var(--shadow-xs)",
                    WebkitTapHighlightColor: "transparent",
                    animation: `fade-in-up 0.35s ease-out ${index * 40}ms both`,
                    gap: "0.5rem",
                    textAlign: "center",
                    minHeight: "8rem",
                    opacity: isOutOfStock ? 0.45 : 1,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!isOutOfStock) {
                      e.currentTarget.style.borderColor = "var(--brand-pastel)";
                      e.currentTarget.style.boxShadow = "var(--shadow-md)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isOutOfStock) {
                      e.currentTarget.style.borderColor = inCart > 0
                        ? "var(--brand-pastel)"
                        : "var(--border-soft)";
                      e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                  onTouchStart={(e) => {
                    if (!isOutOfStock)
                      e.currentTarget.style.transform = "scale(0.97)";
                  }}
                  onTouchEnd={(e) => {
                    if (!isOutOfStock)
                      e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {/* Badge de cantidad en carrito */}
                  {inCart > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-0.375rem",
                        right: "-0.375rem",
                        width: "1.375rem",
                        height: "1.375rem",
                        borderRadius: "50%",
                        background: "var(--brand)",
                        color: "white",
                        fontSize: "0.65rem",
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(184, 62, 108, 0.35)",
                        animation: "scale-in 0.2s ease-out both",
                      }}
                    >
                      {inCart}
                    </span>
                  )}

                  {/* Nombre del producto */}
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: isOutOfStock ? "#9ca3af" : "var(--cacao)",
                      lineHeight: 1.25,
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {producto.nombre}
                  </span>

                  {/* Precio */}
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 900,
                      color: isOutOfStock ? "#9ca3af" : "var(--brand-dark)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {formatCurrency(producto.precio_venta)}
                  </span>

                  {/* Stock badge */}
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      background: isOutOfStock
                        ? "#f3f4f6"
                        : "var(--brand-cream)",
                      color: isOutOfStock ? "#9ca3af" : "var(--brand-dark)",
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isOutOfStock ? "Agotado" : `${remainingStock} ud`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PANEL DERECHO: Ticket / Carrito (consume Zustand directamente)
   ═══════════════════════════════════════════════════════════════════════ */
function TicketPanel() {
  const cartItems = usePosStore((s) => s.cart);
  const isCheckingOut = usePosStore((s) => s.isCheckingOut);
  const lastSaleId = usePosStore((s) => s.lastSaleId);
  const error = usePosStore((s) => s.error);
  const addToCart = usePosStore((s) => s.addToCart);
  const decrementFromCart = usePosStore((s) => s.decrementFromCart);
  const removeFromCart = usePosStore((s) => s.removeFromCart);
  const clearCart = usePosStore((s) => s.clearCart);
  const checkout = usePosStore((s) => s.checkout);

  const total = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [cartItems]
  );
  const itemCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) return;
    const saleId = await checkout();
    if (saleId) {
      console.log("[POS] Venta registrada en cola de sincronización:", saleId);
    }
  }, [cartItems.length, checkout]);

  return (
    <aside
      id="pos-ticket-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border-soft)",
        background: "white",
        overflow: "hidden",
      }}
    >
      {/* Cabecera del ticket */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 900,
              color: "var(--cacao)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.375rem"
            }}
          >
            <ReceiptText className="h-4.5 w-4.5 text-brand" /> Ticket Actual
          </h2>
          <p
            style={{
              fontSize: "0.65rem",
              color: "var(--cacao-muted)",
              margin: 0,
              marginTop: "0.125rem",
            }}
          >
            {itemCount} artículo{itemCount !== 1 ? "s" : ""}
          </p>
        </div>
        {cartItems.length > 0 && (
          <button
            id="pos-clear-cart-btn"
            type="button"
            onClick={clearCart}
            disabled={isCheckingOut}
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "var(--danger)",
              background: "var(--danger-bg)",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.3rem 0.6rem",
              cursor: isCheckingOut ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              opacity: isCheckingOut ? 0.5 : 1,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <Trash2 className="h-3 w-3" /> Limpiar
            </span>
          </button>
        )}
      </div>

      {/* Lista de items del carrito */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem",
        }}
      >
        {cartItems.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "0.75rem",
              color: "var(--cacao-muted)",
              textAlign: "center",
              padding: "2rem 1rem",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--border-soft)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              Toca un producto
              <br />
              para agregarlo
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            {cartItems.map((item: PosCartItem) => (
              <div
                key={item.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 0.625rem",
                  borderRadius: "0.625rem",
                  background: "var(--blush)",
                  border: "1px solid var(--border-soft)",
                  animation: "fade-in 0.25s ease-out both",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--cacao)",
                      margin: 0,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </p>
                  <p
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--cacao-muted)",
                      margin: 0,
                      marginTop: "0.0625rem",
                    }}
                  >
                    {formatCurrency(item.unitPrice)} c/u
                  </p>
                </div>

                {/* Controles de cantidad */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    disabled={isCheckingOut}
                    onClick={() => decrementFromCart(item.productId)}
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border-soft)",
                      background: "white",
                      color: "var(--cacao)",
                      cursor: isCheckingOut ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span
                    style={{
                      minWidth: "1.5rem",
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      color: "var(--cacao)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isCheckingOut || item.quantity >= item.availableStock}
                    onClick={() =>
                      addToCart({
                        id: item.productId,
                        nombre: item.name,
                        precio_venta: item.unitPrice,
                        stock_vitrina: item.availableStock,
                      })
                    }
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--brand-pastel)",
                      background: "var(--brand-cream)",
                      color: "var(--brand-dark)",
                      cursor:
                        isCheckingOut || item.quantity >= item.availableStock
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                      opacity:
                        isCheckingOut || item.quantity >= item.availableStock
                          ? 0.4
                          : 1,
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Botón eliminar item */}
                <button
                  type="button"
                  disabled={isCheckingOut}
                  onClick={() => removeFromCart(item.productId)}
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    background: "transparent",
                    color: "var(--cacao-muted)",
                    cursor: isCheckingOut ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                  title="Quitar producto"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Subtotal del item */}
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    color: "var(--brand-dark)",
                    minWidth: "3.5rem",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer del ticket: Totales + Botón COBRAR */}
      <div
        id="pos-ticket-footer"
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border-soft)",
          background: "white",
        }}
      >
        {/* Mensajes de estado */}
        {error && (
          <div
            style={{
              margin: "0.5rem 0.75rem 0",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              background: "var(--danger-bg)",
              color: "var(--danger)",
              fontSize: "0.68rem",
              fontWeight: 700,
              animation: "fade-in 0.25s ease-out both",
            }}
          >
            {error}
          </div>
        )}

        {lastSaleId && (
          <div
            style={{
              margin: "0.5rem 0.75rem 0",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              background: "var(--success-bg)",
              color: "var(--success)",
              fontSize: "0.68rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              animation: "fade-in 0.25s ease-out both",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Venta registrada: {lastSaleId.slice(-8).toUpperCase()}
          </div>
        )}

        {/* Desglose de totales */}
        <div style={{ padding: "0.75rem 1rem 0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.25rem",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--cacao-muted)",
                fontWeight: 600,
              }}
            >
              Subtotal
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--cacao)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatCurrency(total)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "0.5rem",
              borderTop: "1px dashed var(--border-soft)",
            }}
          >
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 900,
                color: "var(--cacao)",
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                color: "var(--brand-dark)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Botón COBRAR gigante */}
        <div style={{ padding: "0 0.75rem 0.75rem" }}>
          <button
            id="pos-cobrar-btn"
            type="button"
            disabled={cartItems.length === 0 || isCheckingOut}
            onClick={handleCheckout}
            style={{
              width: "100%",
              padding: "1.125rem",
              borderRadius: "0.875rem",
              border: "none",
              background:
                cartItems.length === 0 || isCheckingOut
                  ? "var(--border-soft)"
                  : "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)",
              color:
                cartItems.length === 0 || isCheckingOut
                  ? "var(--cacao-muted)"
                  : "white",
              fontSize: "1.05rem",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor:
                cartItems.length === 0 || isCheckingOut
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                cartItems.length === 0 || isCheckingOut
                  ? "none"
                  : "0 4px 20px rgba(184, 62, 108, 0.35)",
              transition: "all 0.25s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {isCheckingOut ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: "spin 1s linear infinite" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            )}
            {isCheckingOut
              ? "PROCESANDO…"
              : `COBRAR${cartItems.length > 0 ? ` — ${formatCurrency(total)}` : ""}`}
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL DEL POS: Orquesta los 3 paneles
   ═══════════════════════════════════════════════════════════════════════ */
export default function PosPage() {
  const [categoriaActiva, setCategoriaActiva] = useState("todos");

  return (
    <div
      id="pos-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(5.5rem, 15%) 1fr minmax(16rem, 25%)",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <CategoriesPanel
        categoriaActiva={categoriaActiva}
        onSelect={setCategoriaActiva}
      />
      <VitrinaPanel categoriaActiva={categoriaActiva} />
      <TicketPanel />
    </div>
  );
}
