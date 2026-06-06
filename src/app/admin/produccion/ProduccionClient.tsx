"use client";

import { useState, useTransition, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Hammer, Plus, RefreshCw, Save, X } from "lucide-react";
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/ui/ResponsiveTable";
import { StatusBadge } from "@/components/admin/AdminSection";
import type { ProduccionRow, RecetaRow, RecetaInsumoRow, MateriaPrimaRow } from "@/lib/supabase";
import { procesarProduccionAction, type ProcesarProduccionActionResult } from "./actions";

type ProduccionClientProps = {
  rows: ProduccionRow[];
  recetas: RecetaRow[];
  recetaInsumos: RecetaInsumoRow[];
  materiasPrimas: MateriaPrimaRow[];
  error: string | null;
};

function statusTone(status: string | null) {
  if (status === "TERMINADO") return "success";
  if (status === "EN_PROCESO") return "info";
  if (status === "PAUSADO") return "warning";
  return "brand";
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    PLANIFICADO: "Planificado",
    EN_PROCESO: "En proceso",
    PAUSADO: "Pausado",
    TERMINADO: "Terminado"
  };

  return labels[status ?? "PLANIFICADO"] ?? "Planificado";
}

function Alert({ result }: { result: ProcesarProduccionActionResult | null }) {
  if (!result) return null;
  const Icon = result.success ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm font-medium ${result.success ? "status-success" : "status-danger"}`}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {result.success
          ? `Fabricación procesada: ${result.data.unidades_producidas} unidades.`
          : result.error}
      </span>
    </div>
  );
}

export function ProduccionClient({
  rows,
  recetas,
  recetaInsumos,
  materiasPrimas,
  error
}: ProduccionClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const queryRecetaId = searchParams.get("recetaId");
    if (queryRecetaId && recetas.some((r) => r.id === queryRecetaId)) {
      setSelectedRecetaId(queryRecetaId);
      setIsDrawerOpen(true);
    }
  }, [searchParams, recetas]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecetaId, setSelectedRecetaId] = useState<string>("");
  const [lotes, setLotes] = useState<number>(1);
  const [alert, setAlert] = useState<ProcesarProduccionActionResult | null>(
    error ? { success: false, error } : null
  );

  function openDrawer() {
    setSelectedRecetaId("");
    setLotes(1);
    setAlert(null);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setSelectedRecetaId("");
    setLotes(1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await procesarProduccionAction(formData);
      setAlert(result);

      if (result.success) {
        closeDrawer();
        router.refresh();
      }
    });
  }

  const selectedRecipeInsumos = recetaInsumos.filter(
    (insumo) => insumo.receta_id === selectedRecetaId
  );

  const previewInsumos = selectedRecipeInsumos.map((insumo) => {
    const mp = materiasPrimas.find((m) => m.id === insumo.materia_prima_id);
    const required = insumo.cantidad_insumo * lotes;
    const available = mp?.stock_actual ?? 0;
    const isSufficient = available >= required;

    return {
      id: insumo.id,
      nombre: mp?.nombre ?? "Material desconocido",
      unidad: mp?.unidad_medida ?? "unidad",
      required,
      available,
      isSufficient
    };
  });

  const hasInsufficientStock = previewInsumos.some((insumo) => !insumo.isSufficient);

  const columns: Array<ResponsiveTableColumn<ProduccionRow>> = [
    { key: "nombre", header: "Orden", cell: (row) => <span className="font-semibold">{row.nombre}</span> },
    { key: "fecha", header: "Fecha", className: "w-32", cell: (row) => row.fecha_programada || "-" },
    { key: "lotes", header: "Cantidad", className: "w-24", cell: (row) => row.lotes ?? 1 },
    { key: "plan", header: "Planificado", className: "w-32", cell: (row) => row.cantidad_planificada },
    { key: "terminado", header: "Terminado", className: "w-32", cell: (row) => row.cantidad_terminada ?? 0 },
    { key: "estado", header: "Estado", className: "w-36", cell: (row) => <StatusBadge label={statusLabel(row.estado)} tone={statusTone(row.estado)} /> }
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#4A2B32]">Órdenes y fabricación</h2>
          <p className="text-sm text-[#6F4A52]">{rows.length} movimientos de taller</p>
        </div>
        <div className="w-full sm:w-96">
          <Alert result={alert} />
        </div>
      </div>

      <ResponsiveTable
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyState={
          <div>
            <Hammer aria-hidden="true" className="mx-auto h-10 w-10 text-[#F48CAA]" />
            <p className="mt-3 text-sm font-semibold text-[#4A2B32]">Sin órdenes planificadas</p>
            <p className="mt-1 text-sm text-[#6F4A52]">Crea la primera orden para organizar el taller.</p>
          </div>
        }
      />

      <button
        type="button"
        onClick={openDrawer}
        className="btn-primary fixed bottom-24 right-4 z-30 inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-soft lg:bottom-6"
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
        Nueva orden
      </button>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Cerrar formulario" onClick={closeDrawer} className="absolute inset-0 bg-[#4A2B32]/40" />
          <aside className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-md bg-white shadow-soft md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[30rem] md:max-h-none md:rounded-none">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F2D6DE] bg-white px-4 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#4A2B32]">Procesar fabricación</h2>
                <p className="text-sm text-[#6F4A52]">El inventario se actualiza de forma atómica en la base de datos.</p>
              </div>
              <button type="button" title="Cerrar" onClick={closeDrawer} className="flex h-10 w-10 items-center justify-center rounded-md text-[#6F4A52] hover:bg-[#FFF9F5]">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Ficha técnica</span>
                <select
                  name="receta_id"
                  required
                  value={selectedRecetaId}
                  onChange={(e) => setSelectedRecetaId(e.target.value)}
                  className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm"
                  disabled={recetas.length === 0}
                >
                  <option value="">Seleccionar ficha</option>
                  {recetas.map((receta) => (
                    <option key={receta.id} value={receta.id}>
                      {receta.nombre}
                    </option>
                  ))}
                </select>
              </label>
              
              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Órdenes</span>
                <input
                  name="lotes"
                  type="number"
                  min="1"
                  step="1"
                  value={lotes}
                  onChange={(e) => setLotes(Math.max(1, Number(e.target.value)))}
                  required
                  className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm"
                />
              </label>

              {selectedRecetaId && previewInsumos.length > 0 ? (
                <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[#FFF9F5]/50 p-3 transition-all duration-300 animate-fade-in">
                  <h3 className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                    Vista previa de consumo
                  </h3>
                  <div className="mt-2 overflow-hidden rounded-lg border border-[var(--border-soft)] bg-white text-xs">
                    <table className="min-w-full divide-y divide-[var(--border-soft)]">
                      <thead className="bg-[var(--cream)] text-[var(--cacao-light)] font-semibold">
                        <tr>
                          <th className="px-3 py-2 text-left text-[0.625rem] font-bold uppercase tracking-wider">Material</th>
                          <th className="px-3 py-2 text-right text-[0.625rem] font-bold uppercase tracking-wider">Requerido</th>
                          <th className="px-3 py-2 text-right text-[0.625rem] font-bold uppercase tracking-wider">Disponible</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-soft)]">
                        {previewInsumos.map((insumo) => (
                          <tr
                            key={insumo.id}
                            className={`transition-colors duration-200 ${
                              insumo.isSufficient
                                ? "hover:bg-[var(--cream)]"
                                : "bg-red-50 text-red-700 font-semibold"
                            }`}
                          >
                            <td className="px-3 py-2 text-left">{insumo.nombre}</td>
                            <td className="px-3 py-2 text-right">
                              {insumo.required.toFixed(2)} {insumo.unidad}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {insumo.available.toFixed(2)} {insumo.unidad}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hasInsufficientStock ? (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--danger-bg)] p-2 text-[0.65rem] font-semibold text-[var(--danger)] leading-relaxed">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Stock insuficiente para algunos materiales. Ajusta la cantidad o reabastece inventario.</span>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--success-bg)] p-2 text-[0.65rem] font-semibold text-[var(--success)] leading-relaxed">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Stock suficiente disponible para todos los materiales.</span>
                    </div>
                  )}
                </div>
              ) : selectedRecetaId ? (
                <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-amber-50 p-3 text-xs font-medium text-[#B7791F]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#B7791F]" />
                  <span>Esta ficha no tiene materiales asociados en la base de datos.</span>
                </div>
              ) : null}

              {recetas.length === 0 ? (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-[#B7791F]">
                  Primero crea una ficha técnica con producto terminado y materiales configurados.
                </div>
              ) : null}
              
              <div className="sticky bottom-0 -mx-4 border-t border-[#F2D6DE] bg-white p-4">
                <button
                  type="submit"
                  disabled={isPending || recetas.length === 0 || !selectedRecetaId || hasInsufficientStock}
                  className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#D7A1B6]"
                >
                  {isPending ? <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Save aria-hidden="true" className="h-5 w-5" />}
                  {isPending ? "Procesando" : "Procesar fabricación"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
