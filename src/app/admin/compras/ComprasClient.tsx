"use client";

import React, { useState, useTransition, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Plus,
  RefreshCw,
  Save,
  ShoppingBag,
  Trash2,
  User,
  X,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { MateriaPrimaRow } from "@/lib/supabase";
import { registrarCompraAction, type RegistrarCompraResult } from "./actions";

type CompraDetalleRow = {
  id: string;
  cantidad: number;
  costo_unitario: number;
  fecha_vencimiento: string | null;
  materia_prima_id: string;
  materias_primas: {
    nombre: string;
    unidad_medida: string;
  } | null;
};

export type PurchaseRowWithDetails = {
  id: string;
  proveedor: string;
  factura: string;
  total: number;
  estado: string;
  fecha_compra: string;
  created_at: string;
  compra_detalles: CompraDetalleRow[];
};

type ComprasClientProps = {
  purchases: PurchaseRowWithDetails[];
  rawMaterials: MateriaPrimaRow[];
  initialError: string | null;
};

type FormDetailRow = {
  uniqueId: string;
  materia_prima_id: string;
  cantidad: number;
  costo_unitario: number;
  fecha_vencimiento: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Intl.DateTimeFormat("es-NI", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(year, month - 1, day));
  } catch {
    return dateStr;
  }
}

export function ComprasClient({ purchases, rawMaterials, initialError }: ComprasClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Estados del Formulario de Compra
  const [proveedor, setProveedor] = useState("");
  const [factura, setFactura] = useState("");
  const [fechaCompra, setFechaCompra] = useState(() => new Date().toISOString().split("T")[0]);
  const [detalles, setDetalles] = useState<FormDetailRow[]>([]);
  const [alert, setAlert] = useState<RegistrarCompraResult | null>(
    initialError ? { ok: false, message: initialError } : null
  );

  // Suma total calculada en tiempo real
  const totalGeneral = useMemo(() => {
    return detalles.reduce((sum, row) => sum + row.cantidad * row.costo_unitario, 0);
  }, [detalles]);

  function openCreateDrawer() {
    setProveedor("");
    setFactura("");
    setFechaCompra(new Date().toISOString().split("T")[0]);
    // Inicializar con una fila vacía
    setDetalles([
      {
        uniqueId: Math.random().toString(36).substring(2),
        materia_prima_id: "",
        cantidad: 0,
        costo_unitario: 0,
        fecha_vencimiento: null
      }
    ]);
    setAlert(null);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setDetalles([]);
  }

  function addDetailRow() {
    setDetalles((prev) => [
      ...prev,
      {
        uniqueId: Math.random().toString(36).substring(2),
        materia_prima_id: "",
        cantidad: 0,
        costo_unitario: 0,
        fecha_vencimiento: null
      }
    ]);
  }

  function removeDetailRow(index: number) {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDetailChange(index: number, field: keyof FormDetailRow, value: unknown) {
    setDetalles((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [field]: value };
      })
    );
  }

  function togglePurchaseDetails(id: string) {
    setExpandedPurchaseId((prev) => (prev === id ? null : id));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);

    if (!proveedor.trim()) {
      setAlert({ ok: false, message: "El proveedor es un dato obligatorio." });
      return;
    }
    if (!factura.trim()) {
      setAlert({ ok: false, message: "El número de factura/remisión es obligatorio." });
      return;
    }
    if (detalles.length === 0) {
      setAlert({ ok: false, message: "Debe agregar al menos un material al detalle." });
      return;
    }

    // Validar ítems
    for (const item of detalles) {
      if (!item.materia_prima_id) {
        setAlert({ ok: false, message: "Debe seleccionar un material en cada fila del detalle." });
        return;
      }
      if (item.cantidad <= 0) {
        setAlert({ ok: false, message: "La cantidad comprada debe ser mayor que cero." });
        return;
      }
      if (item.costo_unitario < 0) {
        setAlert({ ok: false, message: "El costo unitario no puede ser negativo." });
        return;
      }
    }

    startTransition(async () => {
      const result = await registrarCompraAction({
        proveedor: proveedor.trim(),
        factura: factura.trim(),
        fecha_compra: fechaCompra,
        total: totalGeneral,
        detalles: detalles.map((d) => ({
          materia_prima_id: d.materia_prima_id,
          cantidad: d.cantidad,
          costo_unitario: d.costo_unitario,
          fecha_vencimiento: d.fecha_vencimiento
        }))
      });

      setAlert(result);

      if (result.ok) {
        // Cierre exitoso y limpieza
        setTimeout(() => {
          closeDrawer();
          router.refresh();
        }, 1200);
      }
    });
  }


  return (
    <div className="app-page">
      <header className="app-header px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-3 animate-fade-in">
          <Link
            href="/admin/inventario"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors rounded px-1 py-0.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Inventario
          </Link>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#8B2E54]">Abastecimiento de materiales</p>
            <h1 className="brand-heading mt-1 text-3xl font-semibold">Registro de compras</h1>
          </div>
          <button
            type="button"
            onClick={openCreateDrawer}
            className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
          >
            <Plus className="h-5 w-5" />
            Registrar compra
          </button>
        </div>
      </header>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#4A2B32]">Historial de facturas</h2>
            <p className="text-sm text-[#6F4A52]">{purchases.length} compras documentadas</p>
          </div>
          <div className="w-full sm:w-96">
            {alert && !isDrawerOpen && (
              <div
                className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  alert.ok ? "status-success" : "status-danger"
                }`}
              >
                {alert.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{alert.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {purchases.length === 0 ? (
            <div className="animate-fade-in rounded-xl border border-dashed border-[var(--border-soft)] bg-white px-4 py-14 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-[#F48CAA]" />
              <p className="mt-3 text-sm font-semibold text-[#4A2B32]">Sin registros de compra</p>
              <p className="mt-1 text-sm text-[#6F4A52]">Comienza a registrar compras para abastecer madera, herrajes y consumibles.</p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-4">
              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)] md:block">
                <table className="min-w-full divide-y divide-[var(--border-soft)]">
                  <thead className="bg-[var(--cream)]">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)] w-36">
                        Fecha de Compra
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)] w-44">
                        N° Factura / Remisión
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                        Proveedor
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                        Detalle de materiales
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)] w-36">
                        Monto Total
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)] w-24">
                        Detalles
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)] bg-white">
                    {purchases.map((row) => {
                      const isExpanded = expandedPurchaseId === row.id;
                      const names = row.compra_detalles
                        .map((d: CompraDetalleRow) => d.materias_primas?.nombre || "Material desconocido")
                        .join(", ");

                      return (
                        <React.Fragment key={row.id}>
                          <tr className="transition-colors duration-150 hover:bg-[var(--cream)] border-t border-[var(--border-soft)]">
                            <td className="px-4 py-3.5 text-sm text-[var(--cacao)] w-36">
                              {formatDate(row.fecha_compra)}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[var(--cacao)] w-44 font-semibold">
                              {row.factura}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[var(--cacao)] font-semibold">
                              {row.proveedor}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[var(--cacao)]">
                              <div className="max-w-xs sm:max-w-md md:max-w-lg truncate text-xs text-[#6F4A52]" title={names}>
                                {names}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[var(--cacao)] text-right font-black text-[#8B2E54] w-36">
                              {formatCurrency(row.total)}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[var(--cacao)] text-right w-24">
                              <button
                                type="button"
                                onClick={() => togglePurchaseDetails(row.id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#F2D6DE] text-[#6F4A52] hover:bg-[#FFF9F5] transition"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-[#FFF9F5]/40">
                              <td colSpan={6} className="border-t border-[#F2D6DE] p-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B2E54] mb-3">
                                  Desglose de factura
                                </h4>
                                <div className="overflow-x-auto rounded-lg border border-[#F2D6DE] bg-white">
                                  <table className="min-w-full divide-y divide-[#F2D6DE] text-xs">
                                    <thead className="bg-[#FFF6F6] font-bold text-[#4A2B32]">
                                      <tr>
                                        <th className="px-4 py-2 text-left">Material</th>
                                        <th className="px-4 py-2 text-right">Cantidad</th>
                                        <th className="px-4 py-2 text-right">Costo Unitario</th>
                                        <th className="px-4 py-2 text-right">Fecha lote</th>
                                        <th className="px-4 py-2 text-right">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F2D6DE] text-[#6F4A52]">
                                      {row.compra_detalles.map((d: CompraDetalleRow) => (
                                        <tr key={d.id} className="hover:bg-[#FFF9F5]/30">
                                          <td className="px-4 py-2 font-semibold text-[#4A2B32]">
                                            {d.materias_primas?.nombre || "Material desconocido"}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            {d.cantidad} {d.materias_primas?.unidad_medida || "ud"}
                                          </td>
                                          <td className="px-4 py-2 text-right">{formatCurrency(d.costo_unitario)}</td>
                                          <td className="px-4 py-2 text-right">{d.fecha_vencimiento ? formatDate(d.fecha_vencimiento) : "-"}</td>
                                          <td className="px-4 py-2 text-right font-semibold text-[#4A2B32]">
                                            {formatCurrency(d.cantidad * d.costo_unitario)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-2.5 md:hidden">
                {purchases.map((row) => {
                  const isExpanded = expandedPurchaseId === row.id;
                  const names = row.compra_detalles
                    .map((d: CompraDetalleRow) => d.materias_primas?.nombre || "Material desconocido")
                    .join(", ");

                  return (
                    <article key={row.id} className="surface-card rounded-xl p-4 bg-white border border-[var(--border-soft)]">
                      <dl className="space-y-2.5">
                        <div className="grid gap-0.5">
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                            Fecha de Compra
                          </dt>
                          <dd className="text-sm text-[var(--cacao)]">{formatDate(row.fecha_compra)}</dd>
                        </div>
                        <div className="grid gap-0.5">
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                            N° Factura / Remisión
                          </dt>
                          <dd className="text-sm text-[var(--cacao)] font-semibold">{row.factura}</dd>
                        </div>
                        <div className="grid gap-0.5">
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                            Proveedor
                          </dt>
                          <dd className="text-sm text-[var(--cacao)] font-semibold">{row.proveedor}</dd>
                        </div>
                        <div className="grid gap-0.5">
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                            Detalle de materiales
                          </dt>
                          <dd className="text-sm text-[var(--cacao)]">{names}</dd>
                        </div>
                        <div className="grid gap-0.5">
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                            Monto Total
                          </dt>
                          <dd className="text-sm font-black text-[#8B2E54]">{formatCurrency(row.total)}</dd>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => togglePurchaseDetails(row.id)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#F2D6DE] px-3 text-xs font-bold text-[#6F4A52] hover:bg-[#FFF9F5] transition"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Ocultar desglose
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Ver desglose
                              </>
                            )}
                          </button>
                        </div>
                      </dl>

                      {isExpanded && (
                        <div className="mt-4 border-t border-[#F2D6DE] pt-3 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B2E54]">
                            Desglose de factura
                          </h4>
                          <div className="space-y-2.5">
                            {row.compra_detalles.map((d: CompraDetalleRow) => (
                              <div key={d.id} className="rounded-lg border border-[#F2D6DE] bg-[#FFF9F5]/30 p-2.5 text-xs text-[#6F4A52] space-y-1">
                                <div className="flex justify-between font-semibold text-[#4A2B32]">
                                  <span>{d.materias_primas?.nombre || "Material desconocido"}</span>
                                  <span>{formatCurrency(d.cantidad * d.costo_unitario)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-[#8A6C72]">
                                  <span>
                                    Cantidad: {d.cantidad} {d.materias_primas?.unidad_medida || "ud"}
                                  </span>
                                  <span>Costo U: {formatCurrency(d.costo_unitario)}</span>
                                </div>
                                {d.fecha_vencimiento && (
                                  <div className="text-[10px] text-[#8A6C72] pt-0.5 border-t border-dashed border-[#F2D6DE]/60">
                                    Fecha lote: {formatDate(d.fecha_vencimiento)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Drawer Maestro-Detalle de Compras */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#4A2B32]/40 backdrop-blur-xs">
          <aside className="w-full max-w-2xl h-full bg-[#FFF9F5] shadow-2xl flex flex-col animate-fade-in-left">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F2D6DE] bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#4A2B32]">Registrar compra de materiales</h2>
                <p className="text-xs text-[#6F4A52]">
                  Esta acción incrementa el stock y recalcula el costo ponderado (CMP) en tiempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F2D6DE] text-[#6F4A52] hover:bg-[#FFF6F6] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {alert && alert.ok && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{alert.message}</span>
                  </div>
                )}
                {alert && !alert.ok && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                    <span>{alert.message}</span>
                  </div>
                )}

                {/* Datos de cabecera */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8B2E54] flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Proveedor
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Maderas San José"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      className="field-control mt-1 h-11 w-full rounded-lg px-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8B2E54] flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> N° Factura / Remisión
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. FAC-9908"
                      value={factura}
                      onChange={(e) => setFactura(e.target.value)}
                      className="field-control mt-1 h-11 w-full rounded-lg px-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8B2E54] flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Fecha Compra
                    </span>
                    <input
                      type="date"
                      required
                      value={fechaCompra}
                      onChange={(e) => setFechaCompra(e.target.value)}
                      className="field-control mt-1 h-11 w-full rounded-lg px-3 text-sm"
                    />
                  </label>
                </div>

                <hr className="border-[#F2D6DE]" />

                {/* Maestro-Detalle: Lista de items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#4A2B32] flex items-center gap-1">
                      <Layers className="h-4 w-4 text-[#8B2E54]" /> Detalle de materiales facturados
                    </h3>
                    <button
                      type="button"
                      onClick={addDetailRow}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#F2D6DE] bg-white px-3 py-1.5 text-xs font-bold text-[#6F4A52] hover:bg-[#FFF9F5] hover:text-[#B83E6C] transition-colors"
                    >
                      <Plus className="h-4.5 w-4.5" /> Agregar material
                    </button>
                  </div>

                  {detalles.map((row, index) => (
                    <article
                      key={row.uniqueId}
                      className="rounded-xl border border-[#F2D6DE] bg-white p-4 shadow-sm space-y-3 relative"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-[#6F4A52]">Material</span>
                          <select
                            required
                            value={row.materia_prima_id}
                            onChange={(e) => handleDetailChange(index, "materia_prima_id", e.target.value)}
                            className="field-control mt-1 h-11 w-full rounded-lg px-3 text-sm"
                          >
                            <option value="">Seleccionar material...</option>
                            {rawMaterials.map((mp) => (
                              <option key={mp.id} value={mp.id}>
                                {mp.nombre} ({mp.unidad_medida})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-[#6F4A52]">Fecha de lote/revisión</span>
                          <input
                            type="date"
                            value={row.fecha_vencimiento || ""}
                            onChange={(e) => handleDetailChange(index, "fecha_vencimiento", e.target.value || null)}
                            className="field-control mt-1 h-11 w-full rounded-lg px-3 text-sm"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-3 items-end">
                        <label className="block">
                          <span className="text-xs font-semibold text-[#6F4A52]">Cantidad</span>
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            value={row.cantidad || ""}
                            onChange={(e) => handleDetailChange(index, "cantidad", Number(e.target.value))}
                            className="field-control mt-1 h-11 w-full rounded-lg px-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-[#6F4A52]">Costo Unitario (C$)</span>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={row.costo_unitario || ""}
                            onChange={(e) => handleDetailChange(index, "costo_unitario", Number(e.target.value))}
                            className="field-control mt-1 h-11 w-full rounded-lg px-3 text-sm"
                          />
                        </label>
                        <div className="flex items-center justify-between h-11 pb-1">
                          <div className="text-right flex-1 pr-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B58B96] block">
                              Subtotal
                            </span>
                            <span className="text-sm font-black text-[#4A2B32]">
                              {formatCurrency(row.cantidad * row.costo_unitario)}
                            </span>
                          </div>
                          {detalles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDetailRow(index)}
                              className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Quitar ítem"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Botón Guardar / Footer */}
              <div className="border-t border-[#F2D6DE] bg-white p-5 flex items-center justify-between gap-5">
                <div>
                  <span className="text-xs font-bold text-[#6F4A52] uppercase block">Total Facturado</span>
                  <span className="text-2xl font-black text-[#8B2E54]">{formatCurrency(totalGeneral)}</span>
                </div>
                <button
                  type="submit"
                  disabled={isPending || detalles.length === 0}
                  className="btn-primary inline-flex h-12 w-48 items-center justify-center gap-2 rounded-lg font-bold text-sm uppercase tracking-wider transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#D7A1B6]"
                >
                  {isPending ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {isPending ? "Guardando..." : "Guardar Compra"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
