"use client";

import { useState, useCallback } from "react";

/* ─── Tipos y datos de ejemplo ─── */
type Categoria = {
  id: string;
  label: string;
  emoji: string;
};

type ProductoVitrina = {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  emoji: string;
};

type CartItem = {
  producto: ProductoVitrina;
  quantity: number;
};

const CATEGORIAS: Categoria[] = [
  { id: "todos", label: "Todos", emoji: "🏪" },
  { id: "pasteles", label: "Pasteles", emoji: "🎂" },
  { id: "galletas", label: "Galletas", emoji: "🍪" },
  { id: "bebidas", label: "Bebidas", emoji: "☕" },
  { id: "pan", label: "Pan", emoji: "🥖" },
  { id: "postres", label: "Postres", emoji: "🍰" },
];

/* Productos placeholder para la vista base */
const PRODUCTOS_PLACEHOLDER: ProductoVitrina[] = [
  { id: "1", nombre: "Pastel de Chocolate", precio: 380, categoria: "pasteles", emoji: "🎂" },
  { id: "2", nombre: "Pastel de Fresa", precio: 420, categoria: "pasteles", emoji: "🍓" },
  { id: "3", nombre: "Red Velvet", precio: 450, categoria: "pasteles", emoji: "❤️" },
  { id: "4", nombre: "Galletas de Avena", precio: 45, categoria: "galletas", emoji: "🍪" },
  { id: "5", nombre: "Galletas de Chispas", precio: 50, categoria: "galletas", emoji: "🍫" },
  { id: "6", nombre: "Café Americano", precio: 35, categoria: "bebidas", emoji: "☕" },
  { id: "7", nombre: "Chocolate Caliente", precio: 45, categoria: "bebidas", emoji: "🍫" },
  { id: "8", nombre: "Pan de Muerto", precio: 65, categoria: "pan", emoji: "🥖" },
  { id: "9", nombre: "Cuernos", precio: 25, categoria: "pan", emoji: "🥐" },
  { id: "10", nombre: "Flan Napolitano", precio: 55, categoria: "postres", emoji: "🍮" },
  { id: "11", nombre: "Tres Leches", precio: 85, categoria: "postres", emoji: "🍰" },
  { id: "12", nombre: "Cheesecake", precio: 95, categoria: "postres", emoji: "🧁" },
];

export default function PosPage() {
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [cart, setCart] = useState<CartItem[]>([]);

  const productosFiltrados =
    categoriaActiva === "todos"
      ? PRODUCTOS_PLACEHOLDER
      : PRODUCTOS_PLACEHOLDER.filter((p) => p.categoria === categoriaActiva);

  const addToCart = useCallback((producto: ProductoVitrina) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { producto, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productoId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === productoId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.producto.id === productoId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter((item) => item.producto.id !== productoId);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = cart.reduce(
    (acc, item) => acc + item.producto.precio * item.quantity,
    0
  );
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

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
      {/* ════════════════════════════════════════════════════════════════
          PANEL IZQUIERDO: Filtros por categoría (15%)
          ════════════════════════════════════════════════════════════════ */}
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
              onClick={() => setCategoriaActiva(cat.id)}
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
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>
                {cat.emoji}
              </span>
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

      {/* ════════════════════════════════════════════════════════════════
          PANEL CENTRAL: Vitrina de productos (60%)
          ════════════════════════════════════════════════════════════════ */}
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
              }}
            >
              {CATEGORIAS.find((c) => c.id === categoriaActiva)?.emoji}{" "}
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
          {/* Mini indicador de carrito visible en mobile */}
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

        {/* Grid de productos con scroll */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.75rem 1rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
              gap: "0.625rem",
            }}
          >
            {productosFiltrados.map((producto, index) => (
              <button
                key={producto.id}
                id={`pos-product-${producto.id}`}
                type="button"
                onClick={() => addToCart(producto)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1.125rem 0.75rem",
                  borderRadius: "1rem",
                  border: "1.5px solid var(--border-soft)",
                  background: "var(--card)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "var(--shadow-xs)",
                  WebkitTapHighlightColor: "transparent",
                  animation: `fade-in-up 0.35s ease-out ${index * 40}ms both`,
                  gap: "0.5rem",
                  textAlign: "center",
                  minHeight: "8rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-pastel)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-soft)";
                  e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = "scale(0.97)";
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {/* Emoji como placeholder de imagen */}
                <span
                  style={{
                    fontSize: "2.25rem",
                    lineHeight: 1,
                  }}
                >
                  {producto.emoji}
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--cacao)",
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
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 900,
                    color: "var(--brand-dark)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  ${producto.precio.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          PANEL DERECHO: Ticket / Carrito (25%)
          ════════════════════════════════════════════════════════════════ */}
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
              }}
            >
              🧾 Ticket Actual
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
          {cart.length > 0 && (
            <button
              id="pos-clear-cart-btn"
              type="button"
              onClick={clearCart}
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "var(--danger)",
                background: "var(--danger-bg)",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.3rem 0.6rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              Limpiar
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
          {cart.length === 0 ? (
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
              {cart.map((item) => (
                <div
                  key={item.producto.id}
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
                  <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>
                    {item.producto.emoji}
                  </span>
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
                      {item.producto.nombre}
                    </p>
                    <p
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--cacao-muted)",
                        margin: 0,
                        marginTop: "0.0625rem",
                      }}
                    >
                      ${item.producto.precio.toFixed(2)} c/u
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
                      onClick={() => removeFromCart(item.producto.id)}
                      style={{
                        width: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border-soft)",
                        background: "white",
                        color: "var(--cacao)",
                        fontSize: "1rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                        transition: "all 0.15s ease",
                      }}
                    >
                      −
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
                      onClick={() => addToCart(item.producto)}
                      style={{
                        width: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--brand-pastel)",
                        background: "var(--brand-cream)",
                        color: "var(--brand-dark)",
                        fontSize: "1rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                        transition: "all 0.15s ease",
                      }}
                    >
                      +
                    </button>
                  </div>

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
                    ${(item.producto.precio * item.quantity).toFixed(2)}
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
                ${subtotal.toFixed(2)}
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
                ${subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botón COBRAR gigante */}
          <div style={{ padding: "0 0.75rem 0.75rem" }}>
            <button
              id="pos-cobrar-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                // TODO: Conectar con el flujo de cobro (Zustand + Dexie)
                alert(
                  `¡Cobrar $${subtotal.toFixed(2)}!\n\nEste flujo se conectará con el estado global (Zustand) y almacenamiento local (Dexie) en el siguiente paso.`
                );
              }}
              style={{
                width: "100%",
                padding: "1.125rem",
                borderRadius: "0.875rem",
                border: "none",
                background:
                  cart.length === 0
                    ? "var(--border-soft)"
                    : "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)",
                color: cart.length === 0 ? "var(--cacao-muted)" : "white",
                fontSize: "1.05rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: cart.length === 0 ? "not-allowed" : "pointer",
                boxShadow:
                  cart.length === 0
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
              COBRAR {cart.length > 0 && `— $${subtotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
