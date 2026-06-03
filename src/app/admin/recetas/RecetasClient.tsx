"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  Save,
  X,
  ChefHat,
  Trash2,
  Eye,
  Info
} from "lucide-react";
import { StatusBadge } from "@/components/admin/AdminSection";
import type { RecetaRow, ProductoRow, MateriaPrimaRow, RecetaInsumoRow } from "@/lib/supabase";
import { createRecetaAction, type RecetaActionResult } from "./actions";

type RecetasClientProps = {
  rows: RecetaRow[];
  productos: ProductoRow[];
  materiasPrimas: MateriaPrimaRow[];
  recetaInsumos: RecetaInsumoRow[];
  error: string | null;
};

type TempInsumo = {
  id: string;
  materia_prima_id: string;
  cantidad_insumo: number;
};

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value ?? 0);
}

function statusTone(status: string | null) {
  if (status === "ACTIVA") return "success";
  if (status === "REVISION") return "warning";
  return "brand";
}

function Alert({ result }: { result: RecetaActionResult | null }) {
  if (!result) return null;
  const Icon = result.ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm font-medium ${
        result.ok ? "status-success" : "status-danger"
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{result.message}</span>
    </div>
  );
}

export function RecetasClient({
  rows,
  productos,
  materiasPrimas,
  recetaInsumos,
  error
}: RecetasClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecetaRow | null>(null);
  const [alert, setAlert] = useState<RecetaActionResult | null>(
    error ? { ok: false, message: error } : null
  );

  // Estado para ingredientes dinámicos en el formulario de creación
  const [insumosList, setInsumosList] = useState<TempInsumo[]>([]);

  function handleOpenCreateDrawer() {
    setInsumosList([]);
    setAlert(null);
    setIsDrawerOpen(true);
  }

  function addInsumoRow() {
    setInsumosList([
      ...insumosList,
      { id: crypto.randomUUID(), materia_prima_id: "", cantidad_insumo: 1 }
    ]);
  }

  function removeInsumoRow(id: string) {
    setInsumosList(insumosList.filter((item) => item.id !== id));
  }

  function updateInsumoRow(id: string, field: keyof TempInsumo, value: string | number) {
    setInsumosList(
      insumosList.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createRecetaAction(formData);
      setAlert(result);

      if (result.ok) {
        setIsDrawerOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#4A2B32]">Recetario Técnico</h2>
          <p className="text-sm text-[#6F4A52]">{rows.length} recetas de repostería documentadas</p>
        </div>
        <div className="w-full sm:w-96">
          <Alert result={alert} />
        </div>
      </div>

      {/* Grid de Fichas de Recetas */}
      {rows.length === 0 ? (
        <div className="surface-card text-center py-12 rounded-xl border border-[var(--border-soft)]">
          <ClipboardList aria-hidden="true" className="mx-auto h-12 w-12 text-[#F48CAA]" />
          <p className="mt-3 text-sm font-semibold text-[#4A2B32]">Sin recetas registradas</p>
          <p className="mt-1 text-sm text-[#6F4A52]">
            Agrega tu primera receta técnica para organizar el inventario y guiar a tu personal.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const product = productos.find((p) => p.id === row.producto_id);

            return (
              <article
                key={row.id}
                onClick={() => setSelectedRecipe(row)}
                className="surface-card flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Imagen o Banner */}
                <div className="relative flex h-44 items-center justify-center bg-[var(--cream)] overflow-hidden">
                  {product?.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imagen_url}
                      alt={row.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[var(--cacao-muted)]">
                      <ClipboardList className="h-10 w-10 text-[var(--brand-cream)]" />
                      <span className="text-[0.65rem] font-bold uppercase tracking-wider">
                        Sin Imagen
                      </span>
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <StatusBadge label={row.estado || "Borrador"} tone={statusTone(row.estado)} />
                  </div>
                </div>

                {/* Contenido de la Tarjeta */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--cacao)]">{row.nombre}</h3>
                    {product ? (
                      <p className="mt-0.5 text-xs font-medium text-[var(--brand)]">
                        Genera: {product.nombre}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs italic text-[var(--cacao-light)]">
                        No enlazada a producto
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--cacao-light)] font-medium">
                    <span>
                      Rendimiento:{" "}
                      <strong className="text-[var(--cacao)]">
                        {row.rendimiento_unidades || row.rendimiento} u
                      </strong>
                    </span>
                    <span>
                      Costo aprox:{" "}
                      <strong className="text-[var(--cacao)]">
                        {formatCurrency(row.costo_estimado)}
                      </strong>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Botón Flotante para Crear Receta */}
      <button
        type="button"
        onClick={handleOpenCreateDrawer}
        className="btn-primary fixed bottom-24 right-4 z-30 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6"
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
        Nueva receta
      </button>

      {/* DETALLE DE RECETA (Ficha Técnica) */}
      {selectedRecipe ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar detalles"
            onClick={() => setSelectedRecipe(null)}
            className="absolute inset-0 bg-[#4A2B32]/40 backdrop-blur-sm transition-opacity"
          />

          {/* Panel Lateral */}
          <aside className="relative flex h-full w-full flex-col bg-white shadow-xl md:w-[35rem] animate-slide-in">
            {/* Header del Detalle */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F2D6DE] bg-white px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-[#4A2B32]">Ficha Técnica</h3>
                <p className="text-xs text-[#6F4A52]">Guía de ingredientes y pasos de preparación.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--cream)] text-[#6F4A52]"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido Desplazable del Detalle */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Imagen y Datos Generales */}
              {(() => {
                const product = productos.find((p) => p.id === selectedRecipe.producto_id);
                return (
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--cream)] flex items-center justify-center">
                      {product?.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imagen_url}
                          alt={selectedRecipe.nombre}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ClipboardList className="h-8 w-8 text-[var(--brand-cream)]" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-[var(--cacao)]">
                          {selectedRecipe.nombre}
                        </h4>
                        <StatusBadge
                          label={selectedRecipe.estado || "Borrador"}
                          tone={statusTone(selectedRecipe.estado)}
                        />
                      </div>
                      {product ? (
                        <p className="text-xs font-semibold text-[var(--brand)]">
                          Producto: {product.nombre}
                        </p>
                      ) : (
                        <p className="text-xs italic text-[var(--cacao-light)]">
                          No enlazado a catálogo de ventas
                        </p>
                      )}
                      <div className="mt-2 flex gap-4 text-xs font-medium text-[var(--cacao-light)]">
                        <span>Rendimiento: <strong className="text-[var(--cacao)]">{selectedRecipe.rendimiento_unidades || selectedRecipe.rendimiento} unidades</strong></span>
                        <span>Costo: <strong className="text-[var(--cacao)]">{formatCurrency(selectedRecipe.costo_estimado)}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Lista de Ingredientes (Insumos) */}
              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  Ingredientes (Insumos)
                </h5>
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--cream)]/30 p-4">
                  {(() => {
                    const insumos = recetaInsumos.filter((i) => i.receta_id === selectedRecipe.id);
                    if (insumos.length === 0) {
                      return (
                        <p className="text-xs italic text-[var(--cacao-light)]">
                          No se han configurado insumos para esta receta.
                        </p>
                      );
                    }
                    return (
                      <ul className="divide-y divide-[var(--border-soft)]">
                        {insumos.map((insumo) => {
                          const mp = materiasPrimas.find((m) => m.id === insumo.materia_prima_id);
                          return (
                            <li
                              key={insumo.id}
                              className="flex items-center justify-between py-2 text-xs text-[var(--cacao)]"
                            >
                              <span className="font-semibold">
                                {mp?.nombre ?? "Ingrediente Desconocido"}
                              </span>
                              <span className="font-bold text-[var(--brand-dark)]">
                                {insumo.cantidad_insumo} {mp?.unidad_medida || "unidad"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
              </section>

              {/* Pasos de Preparación (Instrucciones) */}
              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  Pasos de Preparación
                </h5>
                <div className="rounded-xl border border-[var(--border-soft)] bg-[#FFF9F5]/80 p-4 min-h-[8rem]">
                  <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--cacao)]">
                    {selectedRecipe.instrucciones ||
                      "No se han redactado instrucciones para esta receta. Haz clic en Editar receta para agregarlas."}
                  </p>
                </div>
              </section>
            </div>

            {/* Footer con Acciones */}
            <div className="sticky bottom-0 border-t border-[#F2D6DE] bg-white p-4 flex gap-3">
              <Link
                href={`/admin/produccion?recetaId=${selectedRecipe.id}`}
                onClick={() => setSelectedRecipe(null)}
                className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl h-12 text-sm font-semibold shadow-soft"
              >
                <ChefHat className="h-4.5 w-4.5" />
                Hornar / Producir Lote
              </Link>
            </div>
          </aside>
        </div>
      ) : null}

      {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar formulario"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-[#4A2B32]/40 backdrop-blur-sm"
          />

          {/* Panel de Formulario */}
          <aside className="relative flex h-full w-full flex-col bg-white shadow-xl md:w-[35rem] animate-slide-in">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F2D6DE] bg-white px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-[#4A2B32]">Crear Receta Técnica</h3>
                <p className="text-xs text-[#6F4A52]">
                  Configura insumos e instrucciones para controlar tus lotes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--cream)] text-[#6F4A52]"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Nombre de la Receta */}
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">
                    Nombre de la Receta
                  </span>
                  <input
                    name="nombre"
                    required
                    placeholder="Ej. Pastel de Tres Leches Tradicional"
                    className="field-control mt-1.5 h-11 w-full rounded-lg px-3 text-xs font-semibold"
                  />
                </label>

                {/* Relación con Producto de Ventas */}
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">
                    Producto Terminado a Generar
                  </span>
                  <select
                    name="producto_id"
                    className="field-control mt-1.5 h-11 w-full rounded-lg px-3 text-xs font-semibold"
                  >
                    <option value="">No vincular a catálogo (Solo registro)</option>
                    {productos.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nombre} (Venta: {formatCurrency(prod.precio_venta)})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  {/* Rendimiento (Unidades) */}
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">
                      Rendimiento (Unidades)
                    </span>
                    <input
                      name="rendimiento"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={1}
                      className="field-control mt-1.5 h-11 w-full rounded-lg px-3 text-xs font-semibold"
                    />
                  </label>

                  {/* Costo Estimado */}
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">
                      Costo Estimado (C$)
                    </span>
                    <input
                      name="costo_estimado"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={0}
                      className="field-control mt-1.5 h-11 w-full rounded-lg px-3 text-xs font-semibold"
                    />
                  </label>
                </div>

                {/* Estado */}
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">
                    Estado de la Ficha
                  </span>
                  <select
                    name="estado"
                    defaultValue="BORRADOR"
                    className="field-control mt-1.5 h-11 w-full rounded-lg px-3 text-xs font-semibold"
                  >
                    <option value="BORRADOR">Borrador (Edición)</option>
                    <option value="REVISION">En Revisión técnica</option>
                    <option value="ACTIVA">Activa para producción</option>
                  </select>
                </label>

                {/* EDITOR DINÁMICO DE INGREDIENTES */}
                <div className="space-y-2 border-t border-[var(--border-soft)] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">
                      Ingredientes (Almacén de Insumos)
                    </span>
                    <button
                      type="button"
                      onClick={addInsumoRow}
                      className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-[var(--brand)] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Añadir ingrediente
                    </button>
                  </div>

                  {insumosList.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-4 text-center text-xs text-[var(--cacao-light)]">
                      Ningún ingrediente agregado. Haz clic en "Añadir ingrediente" para vincular insumos del inventario.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {insumosList.map((insumo, index) => (
                        <div key={insumo.id} className="flex items-center gap-2">
                          {/* Selector de Materia Prima */}
                          <select
                            value={insumo.materia_prima_id}
                            onChange={(e) =>
                              updateInsumoRow(insumo.id, "materia_prima_id", e.target.value)
                            }
                            required
                            className="field-control h-10 flex-1 rounded-lg px-3 text-[0.7rem] font-semibold"
                          >
                            <option value="">Seleccionar ingrediente...</option>
                            {materiasPrimas.map((mp) => (
                              <option key={mp.id} value={mp.id}>
                                {mp.nombre} ({mp.unidad_medida})
                              </option>
                            ))}
                          </select>

                          {/* Cantidad de Insumo */}
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={insumo.cantidad_insumo}
                            onChange={(e) =>
                              updateInsumoRow(
                                insumo.id,
                                "cantidad_insumo",
                                Math.max(0.01, Number(e.target.value))
                              )
                            }
                            required
                            placeholder="Cant"
                            className="field-control h-10 w-24 rounded-lg px-3 text-center text-[0.7rem] font-bold"
                          />

                          {/* Botón de Borrar */}
                          <button
                            type="button"
                            onClick={() => removeInsumoRow(insumo.id)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Campo oculto que serializa el JSON de ingredientes para el Server Action */}
                  <input
                    type="hidden"
                    name="insumos_json"
                    value={JSON.stringify(insumosList)}
                  />
                </div>

                {/* Pasos / Instrucciones de preparación */}
                <label className="block border-t border-[var(--border-soft)] pt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">
                    Pasos de Preparación (Instrucciones)
                  </span>
                  <textarea
                    name="instrucciones"
                    rows={4}
                    placeholder="Escribe las instrucciones detalladas paso a paso para el personal de repostería..."
                    className="field-control mt-1.5 w-full rounded-lg p-3 text-xs font-medium leading-relaxed resize-y"
                  />
                </label>
              </div>

              {/* Botón Guardar */}
              <div className="sticky bottom-0 border-t border-[#F2D6DE] bg-white p-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:bg-[#D7A1B6]"
                >
                  {isPending ? (
                    <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="h-5 w-5" />
                  )}
                  {isPending ? "Guardando receta..." : "Guardar Ficha Técnica"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
