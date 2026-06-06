"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Boxes, CheckCircle2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/ui/ResponsiveTable";
import type { MateriaPrimaRow } from "@/lib/supabase";
import {
  createMateriaPrimaAction,
  deleteMateriaPrimaAction,
  updateMateriaPrimaAction,
  type MateriaPrimaActionResult
} from "./actions";

type MateriasPrimasCrudClientProps = {
  items: MateriaPrimaRow[];
  initialError: string | null;
};

type DrawerMode = "create" | "edit";

const estadoOptions = ["DISPONIBLE", "STOCK_BAJO", "AGOTADO", "POR_VENCER", "RESERVADO"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

function getOperationalStatus(item: MateriaPrimaRow) {
  if ((item.stock_actual ?? 0) <= 0) {
    return "AGOTADO";
  }

  if (item.fecha_vencimiento) {
    const daysToExpiration = Math.ceil(
      (new Date(item.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysToExpiration <= 7) {
      return "POR_VENCER";
    }
  }

  if (item.stock_minimo !== null && item.stock_actual <= item.stock_minimo) {
    return "STOCK_BAJO";
  }

  return item.estado || "DISPONIBLE";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DISPONIBLE: "Disponible",
    STOCK_BAJO: "Stock bajo",
    AGOTADO: "Agotado",
    POR_VENCER: "Revisión próxima",
    RESERVADO: "Reservado"
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "DISPONIBLE") {
    return "status-success";
  }

  if (status === "STOCK_BAJO" || status === "POR_VENCER") {
    return "status-warning";
  }

  if (status === "AGOTADO") {
    return "status-danger";
  }

  return "status-info";
}

function Alert({ result }: { result: MateriaPrimaActionResult | null }) {
  if (!result) {
    return null;
  }

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

export function MateriasPrimasCrudClient({ items, initialError }: MateriasPrimasCrudClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [selectedItem, setSelectedItem] = useState<MateriaPrimaRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [alert, setAlert] = useState<MateriaPrimaActionResult | null>(
    initialError ? { ok: false, message: initialError } : null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedItem(null);
    setAlert(null);
    setIsDrawerOpen(true);
  }

  function openEditDrawer(item: MateriaPrimaRow) {
    setDrawerMode("edit");
    setSelectedItem(item);
    setAlert(null);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setSelectedItem(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const action = drawerMode === "edit" ? updateMateriaPrimaAction : createMateriaPrimaAction;

    startTransition(async () => {
      const result = await action(formData);
      setAlert(result);

      if (result.ok) {
        closeDrawer();
        router.refresh();
      }
    });
  }

  function handleDelete(item: MateriaPrimaRow) {
    if (!window.confirm(`Eliminar ${item.nombre}?`)) {
      return;
    }

    setDeletingId(item.id);
    setAlert(null);

    startTransition(async () => {
      const result = await deleteMateriaPrimaAction(item.id);
      setAlert(result);
      setDeletingId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  const columns: Array<ResponsiveTableColumn<MateriaPrimaRow>> = [
    {
      key: "sku",
      header: "Codigo",
      className: "w-28",
      cell: (item) => item.sku || "-"
    },
    {
      key: "nombre",
      header: "Material",
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#4A2B32]">{item.nombre}</p>
          <p className="mt-1 text-xs text-[#6F4A52]">{item.categoria || "Sin categoria"}</p>
        </div>
      )
    },
    {
      key: "stock",
      header: "Cantidad",
      className: "w-32",
      cell: (item) => (
        <span className="font-semibold text-[#4A2B32]">
          {item.stock_actual} {item.unidad_medida}
        </span>
      )
    },
    {
      key: "minimo",
      header: "Minimo",
      className: "w-24",
      cell: (item) => item.stock_minimo ?? 0
    },
    {
      key: "vencimiento",
      header: "Fecha lote",
      className: "w-32",
      cell: (item) => item.fecha_vencimiento || "-"
    },
    {
      key: "costo",
      header: "Costo",
      className: "w-32",
      cell: (item) => formatCurrency(item.costo_unitario)
    },
    {
      key: "estado",
      header: "Estado",
      className: "w-36",
      cell: (item) => {
        const status = getOperationalStatus(item);

        return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>{statusLabel(status)}</span>;
      }
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "w-36 text-right",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            title="Editar material"
            onClick={() => openEditDrawer(item)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#F2D6DE] text-[#6F4A52] transition hover:bg-[#FFF9F5] focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Editar material</span>
          </button>
          <button
            type="button"
            title="Eliminar material"
            onClick={() => handleDelete(item)}
            disabled={deletingId === item.id}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#F2D6DE] text-[#6F4A52] transition hover:border-red-200 hover:bg-red-50 hover:text-[#B42318] focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingId === item.id ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
            <span className="sr-only">Eliminar material</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="app-page">
      <header className="app-header px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-3 animate-fade-in">
          <Link
            href="/admin/inventario"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded px-1 py-0.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Inventario
          </Link>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#8B2E54]">Inventario de materiales</p>
            <h1 className="brand-heading mt-1 text-3xl font-semibold">Materiales y madera</h1>
          </div>
          <button
            type="button"
            onClick={openCreateDrawer}
            className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Agregar material
          </button>
        </div>
      </header>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#4A2B32]">Control operativo</h2>
            <p className="text-sm text-[#6F4A52]">{items.length} materiales registrados</p>
          </div>
          <div className="w-full sm:w-96">
            <Alert result={alert} />
          </div>
        </div>

        <ResponsiveTable
          rows={items}
          columns={columns}
          getRowKey={(item) => item.id}
          emptyState={
            <div>
              <Boxes aria-hidden="true" className="mx-auto h-10 w-10 text-[#F48CAA]" />
              <p className="mt-3 text-sm font-semibold text-[#4A2B32]">Sin materiales</p>
              <p className="mt-1 text-sm text-[#6F4A52]">Agrega madera, tableros, barnices, herrajes o consumibles.</p>
            </div>
          }
          renderMobileCard={(item) => {
            const status = getOperationalStatus(item);

            return (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#4A2B32]">{item.nombre}</p>
                    <p className="mt-1 text-xs text-[#6F4A52]">{item.sku || "Sin codigo"} · {item.categoria || "Sin categoria"}</p>
                  </div>
                  <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>{statusLabel(status)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-[#FFF9F5] p-3">
                    <p className="text-xs font-semibold uppercase text-[#8B2E54]">Stock</p>
                    <p className="mt-1 font-semibold text-[#4A2B32]">{item.stock_actual} {item.unidad_medida}</p>
                  </div>
                  <div className="rounded-md bg-[#FFF9F5] p-3">
                    <p className="text-xs font-semibold uppercase text-[#8B2E54]">Costo</p>
                    <p className="mt-1 font-semibold text-[#4A2B32]">{formatCurrency(item.costo_unitario)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openEditDrawer(item)} className="btn-secondary inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold">
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDelete(item)} disabled={deletingId === item.id} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 text-sm font-semibold text-[#B42318] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                    {deletingId === item.id ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
                    Eliminar
                  </button>
                </div>
              </div>
            );
          }}
        />
      </section>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Cerrar formulario" onClick={closeDrawer} className="absolute inset-0 bg-[#4A2B32]/40" />
          <aside className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-md bg-white shadow-soft md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[32rem] md:max-h-none md:rounded-none">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F2D6DE] bg-white px-4 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#4A2B32]">{drawerMode === "edit" ? "Editar material" : "Agregar material"}</h2>
                <p className="text-sm text-[#6F4A52]">Datos online para compras, inventario y fabricación.</p>
              </div>
              <button type="button" title="Cerrar" onClick={closeDrawer} className="flex h-10 w-10 items-center justify-center rounded-md text-[#6F4A52] transition hover:bg-[#FFF9F5] focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2">
                <X aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </button>
            </div>

            <form key={selectedItem?.id ?? "create"} onSubmit={handleSubmit} className="space-y-4 p-4">
              {selectedItem ? <input type="hidden" name="id" value={selectedItem.id} /> : null}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Codigo / SKU</span>
                  <input name="sku" defaultValue={selectedItem?.sku ?? ""} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Categoria</span>
                  <input name="categoria" defaultValue={selectedItem?.categoria ?? ""} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Nombre</span>
                <input name="nombre" defaultValue={selectedItem?.nombre ?? ""} required className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Unidad</span>
                  <select name="unidad_medida" defaultValue={selectedItem?.unidad_medida ?? "unidad"} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm">
                    <option value="unidad">unidades</option>
                    <option value="pie_tablar">pies tablares</option>
                    <option value="pie_lineal">pies lineales</option>
                    <option value="m">metros</option>
                    <option value="m2">m²</option>
                    <option value="lamina">láminas</option>
                    <option value="juego">juegos</option>
                    <option value="galon">galones</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">litros</option>
                    <option value="ml">ml</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Estado</span>
                  <select name="estado" defaultValue={selectedItem?.estado ?? "DISPONIBLE"} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm">
                    {estadoOptions.map((option) => (
                      <option key={option} value={option}>{statusLabel(option)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Stock actual</span>
                  <input name="stock_actual" type="number" min="0" step="0.01" defaultValue={selectedItem?.stock_actual ?? 0} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Stock minimo</span>
                  <input name="stock_minimo" type="number" min="0" step="0.01" defaultValue={selectedItem?.stock_minimo ?? 0} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Costo unitario</span>
                  <input name="costo_unitario" type="number" min="0" step="0.01" defaultValue={selectedItem?.costo_unitario ?? 0} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Fecha de lote/revisión</span>
                  <input name="fecha_vencimiento" type="date" defaultValue={selectedItem?.fecha_vencimiento ?? ""} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Proveedor</span>
                <input name="proveedor" defaultValue={selectedItem?.proveedor ?? ""} className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm" />
              </label>

              <div className="sticky bottom-0 -mx-4 border-t border-[#F2D6DE] bg-white p-4">
                <button type="submit" disabled={isPending} className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#D7A1B6]">
                  {isPending ? <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Save aria-hidden="true" className="h-5 w-5" />}
                  {isPending ? "Guardando" : "Guardar material"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
