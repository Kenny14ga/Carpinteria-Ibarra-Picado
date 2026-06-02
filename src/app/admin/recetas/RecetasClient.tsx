"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardList, Plus, RefreshCw, Save, X } from "lucide-react";
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/ui/ResponsiveTable";
import { StatusBadge } from "@/components/admin/AdminSection";
import type { RecetaRow } from "@/lib/supabase";
import { createRecetaAction, type RecetaActionResult } from "./actions";

type RecetasClientProps = {
  rows: RecetaRow[];
  error: string | null;
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
    <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm font-medium ${result.ok ? "status-success" : "status-danger"}`}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{result.message}</span>
    </div>
  );
}

export function RecetasClient({ rows, error }: RecetasClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [alert, setAlert] = useState<RecetaActionResult | null>(error ? { ok: false, message: error } : null);

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

  const columns: Array<ResponsiveTableColumn<RecetaRow>> = [
    { key: "nombre", header: "Receta", cell: (row) => <span className="font-semibold">{row.nombre}</span> },
    { key: "rendimiento", header: "Rendimiento", className: "w-32", cell: (row) => row.rendimiento ?? 0 },
    { key: "costo", header: "Costo estimado", className: "w-36", cell: (row) => formatCurrency(row.costo_estimado) },
    { key: "estado", header: "Estado", className: "w-32", cell: (row) => <StatusBadge label={row.estado || "Borrador"} tone={statusTone(row.estado)} /> }
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#4A2B32]">Fichas tecnicas</h2>
          <p className="text-sm text-[#6F4A52]">{rows.length} recetas documentadas</p>
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
            <ClipboardList aria-hidden="true" className="mx-auto h-10 w-10 text-[#F48CAA]" />
            <p className="mt-3 text-sm font-semibold text-[#4A2B32]">Sin recetas</p>
            <p className="mt-1 text-sm text-[#6F4A52]">Documenta rendimiento y costo para controlar produccion.</p>
          </div>
        }
      />

      <button type="button" onClick={() => setIsDrawerOpen(true)} className="btn-primary fixed bottom-24 right-4 z-30 inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-soft lg:bottom-6">
        <Plus aria-hidden="true" className="h-5 w-5" />
        Crear receta
      </button>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Cerrar formulario" onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-[#4A2B32]/40" />
          <aside className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-md bg-white shadow-soft md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[30rem] md:max-h-none md:rounded-none">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F2D6DE] bg-white px-4 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#4A2B32]">Crear receta</h2>
                <p className="text-sm text-[#6F4A52]">Base para costos y lotes de produccion.</p>
              </div>
              <button type="button" title="Cerrar" onClick={() => setIsDrawerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-md text-[#6F4A52] hover:bg-[#FFF9F5]">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Nombre</span>
                <input name="nombre" required className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Rendimiento</span>
                  <input name="rendimiento" type="number" min="0" step="1" defaultValue={1} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Costo estimado</span>
                  <input name="costo_estimado" type="number" min="0" step="0.01" defaultValue={0} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Estado</span>
                <select name="estado" defaultValue="BORRADOR" className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm">
                  <option value="BORRADOR">Borrador</option>
                  <option value="REVISION">Revision</option>
                  <option value="ACTIVA">Activa</option>
                </select>
              </label>
              <div className="sticky bottom-0 -mx-4 border-t border-[#F2D6DE] bg-white p-4">
                <button type="submit" disabled={isPending} className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold disabled:bg-[#D7A1B6]">
                  {isPending ? <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Save aria-hidden="true" className="h-5 w-5" />}
                  {isPending ? "Guardando" : "Guardar receta"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
