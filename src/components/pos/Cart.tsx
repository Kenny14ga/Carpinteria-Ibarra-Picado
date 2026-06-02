"use client";

import { CheckCircle2, Minus, Plus, ReceiptText, Trash2, X } from "lucide-react";

export type CartLine = {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
};

type CartProps = {
  items: CartLine[];
  isSaving: boolean;
  lastSaleId: string | null;
  onIncrement: (productoId: string) => void;
  onDecrement: (productoId: string) => void;
  onRemove: (productoId: string) => void;
  onClear: () => void;
  onConfirm: () => Promise<void>;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

export function getCartTotal(items: CartLine[]) {
  return items.reduce((total, item) => total + item.precio_unitario * item.cantidad, 0);
}

export function Cart({
  items,
  isSaving,
  lastSaleId,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onConfirm
}: CartProps) {
  const total = getCartTotal(items);
  const itemCount = items.reduce((count, item) => count + item.cantidad, 0);

  return (
    <section className="flex max-h-[calc(100vh-7rem)] min-h-[34rem] flex-col rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">Recibo</h2>
          <p className="text-sm text-slate-500">{itemCount} articulos</p>
        </div>
        <button
          type="button"
          title="Vaciar carrito"
          onClick={onClear}
          disabled={items.length === 0 || isSaving}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">Vaciar carrito</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 p-6 text-center">
            <ReceiptText aria-hidden="true" className="h-9 w-9 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-950">Carrito vacio</p>
            <p className="mt-1 text-sm text-slate-500">Selecciona productos para abrir una venta.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.producto_id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.nombre}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatCurrency(item.precio_unitario)} c/u</p>
                  </div>
                  <button
                    type="button"
                    title="Quitar producto"
                    onClick={() => onRemove(item.producto_id)}
                    disabled={isSaving}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">Quitar producto</span>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex h-10 items-center rounded-md border border-slate-200">
                    <button
                      type="button"
                      title="Restar unidad"
                      onClick={() => onDecrement(item.producto_id)}
                      disabled={isSaving}
                      className="flex h-10 w-10 items-center justify-center text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus aria-hidden="true" className="h-4 w-4" />
                      <span className="sr-only">Restar unidad</span>
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-slate-950">{item.cantidad}</span>
                    <button
                      type="button"
                      title="Sumar unidad"
                      onClick={() => onIncrement(item.producto_id)}
                      disabled={isSaving}
                      className="flex h-10 w-10 items-center justify-center text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      <span className="sr-only">Sumar unidad</span>
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-slate-950">
                    {formatCurrency(item.precio_unitario * item.cantidad)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-4">
        {lastSaleId ? (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">Venta en cola: {lastSaleId}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-2xl font-semibold text-slate-950">{formatCurrency(total)}</span>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={items.length === 0 || isSaving}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <ReceiptText aria-hidden="true" className="h-5 w-5" />
          {isSaving ? "Registrando" : "Confirmar venta"}
        </button>
      </div>
    </section>
  );
}
