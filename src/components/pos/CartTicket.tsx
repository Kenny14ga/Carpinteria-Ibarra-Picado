"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Trash2,
  X,
  XCircle
} from "lucide-react";
import { usePosStore } from "@/store/usePosStore";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

export function CartTicket() {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const cartItems = usePosStore((state) => state.cart);
  const isCheckingOut = usePosStore((state) => state.isCheckingOut);
  const lastSaleId = usePosStore((state) => state.lastSaleId);
  const error = usePosStore((state) => state.error);
  
  const addToCart = usePosStore((state) => state.addToCart);
  const decrementFromCart = usePosStore((state) => state.decrementFromCart);
  const removeFromCart = usePosStore((state) => state.removeFromCart);
  const clearCart = usePosStore((state) => state.clearCart);
  const checkout = usePosStore((state) => state.checkout);

  const total = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  const itemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  function handleCheckout() {
    void checkout();
  }

  // Common ticket content shared between desktop and mobile bottom sheet
  const renderTicketContent = () => (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--cacao)]">Detalle de Venta</h2>
          <p className="text-xs font-semibold text-[var(--cacao-light)] uppercase tracking-wider mt-0.5">
            {itemCount} {itemCount === 1 ? "unidad" : "unidades"}
          </p>
        </div>
        <button
          type="button"
          title="Vaciar carrito"
          onClick={clearCart}
          disabled={cartItems.length === 0 || isCheckingOut}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--cacao-light)] transition hover:border-red-200 hover:bg-red-50 hover:text-[var(--danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Vaciar carrito</span>
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cartItems.length === 0 ? (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-soft)] p-6 text-center">
            <ShoppingCart aria-hidden="true" className="h-10 w-10 text-[var(--brand-pastel)]" />
            <p className="mt-3 text-sm font-bold text-[var(--cacao)]">Carrito vacío</p>
            <p className="mt-1 text-xs text-[var(--cacao-light)]">Toca los productos de la izquierda para agregarlos.</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <article
              key={item.productId}
              className="rounded-xl border border-[var(--border-soft)] p-3 bg-[#FFF9F5]/30 hover:bg-[#FFF9F5]/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--cacao)]">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--cacao-muted)] font-medium">
                    {formatCurrency(item.unitPrice)} c/u
                  </p>
                </div>
                <button
                  type="button"
                  title="Quitar producto"
                  onClick={() => removeFromCart(item.productId)}
                  disabled={isCheckingOut}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--cacao-muted)] transition hover:bg-red-50 hover:text-[var(--danger)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <XCircle aria-hidden="true" className="h-5 w-5" />
                  <span className="sr-only">Quitar producto</span>
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                {/* Quantity adjuster with wide tap sizes */}
                <div className="flex h-10 items-center rounded-lg border border-[var(--border-soft)] bg-white">
                  <button
                    type="button"
                    title="Restar unidad"
                    onClick={() => decrementFromCart(item.productId)}
                    disabled={isCheckingOut}
                    className="flex h-10 w-10 items-center justify-center text-[var(--cacao-light)] transition hover:bg-[var(--cream)] active:bg-[var(--brand-cream)]/20 disabled:cursor-not-allowed disabled:opacity-40 rounded-l-lg"
                  >
                    <Minus aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-extrabold text-[var(--cacao)]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    title="Sumar unidad"
                    onClick={() =>
                      addToCart({
                        id: item.productId,
                        nombre: item.name,
                        precio_venta: item.unitPrice,
                        stock_vitrina: item.availableStock
                      })
                    }
                    disabled={isCheckingOut || item.quantity >= item.availableStock}
                    className="flex h-10 w-10 items-center justify-center text-[var(--cacao-light)] transition hover:bg-[var(--cream)] active:bg-[var(--brand-cream)]/20 disabled:cursor-not-allowed disabled:opacity-40 rounded-r-lg"
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm font-extrabold text-[var(--cacao)]">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </p>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Footer / Total & Checkout button */}
      <div className="border-t border-[var(--border-soft)] p-4 bg-[var(--cream)]/30">
        {error ? (
          <div className="mb-3 rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--danger)] leading-relaxed animate-fade-in">
            {error}
          </div>
        ) : null}

        {lastSaleId ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--success-bg)] px-3 py-2 text-xs font-bold text-[var(--success)] animate-fade-in">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">Venta registrada: {lastSaleId.slice(-8).toUpperCase()}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-[var(--cacao-light)]">Total a Cobrar</span>
          <span className="text-3xl font-black text-[var(--brand-dark)] tracking-tight">
            {formatCurrency(total)}
          </span>
        </div>
        
        <button
          type="button"
          onClick={handleCheckout}
          disabled={cartItems.length === 0 || isCheckingOut}
          className="btn-primary mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-extrabold shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D7A1B6] disabled:scale-100"
        >
          {isCheckingOut ? (
            <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <ReceiptText aria-hidden="true" className="h-5 w-5" />
          )}
          {isCheckingOut ? "Procesando cobro..." : "Registrar Venta"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar view */}
      <section className="hidden lg:flex lg:flex-col lg:h-[calc(100vh-10rem)] lg:min-h-[36rem] lg:w-96 rounded-2xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-md)] overflow-hidden lg:sticky lg:top-6">
        {renderTicketContent()}
      </section>

      {/* Mobile bar and bottom sheet trigger */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[var(--border-soft)] shadow-[0_-8px_24px_rgba(74,43,50,0.08)] px-4 py-3 flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          className="flex items-center gap-2 text-left focus:outline-none"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-cream)] text-[var(--brand)]">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)] text-[9px] font-black text-white ring-2 ring-white animate-scale-in">
                {itemCount}
              </span>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--cacao-muted)] uppercase tracking-wider">Ver Venta</p>
            <p className="text-base font-black text-[var(--cacao)]">{formatCurrency(total)}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={cartItems.length === 0 || isCheckingOut}
          className="btn-primary flex h-12 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-bold disabled:cursor-not-allowed disabled:bg-[#D7A1B6]"
        >
          {isCheckingOut ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ReceiptText className="h-4 w-4" />
          )}
          <span>{isCheckingOut ? "Cobrando..." : "Cobrar"}</span>
        </button>
      </div>

      {/* Mobile bottom sheet modal */}
      {isOpenMobile ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <button
            type="button"
            aria-label="Cerrar ticket"
            onClick={() => setIsOpenMobile(false)}
            className="absolute inset-0 bg-[#4A2B32]/50 backdrop-blur-xs transition-opacity duration-300"
          />
          {/* Bottom sheet */}
          <aside className="absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col rounded-t-2xl bg-white shadow-xl overflow-hidden transition-transform duration-300 animate-slide-up">
            <div className="flex justify-end p-2 bg-gray-50 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[var(--border-soft)] text-[var(--cacao-light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderTicketContent()}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
