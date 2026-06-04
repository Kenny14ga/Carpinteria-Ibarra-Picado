"use client";

import React, { useState, useEffect } from "react";
import { 
  CircleDollarSign, 
  TrendingDown, 
  TrendingUp, 
  ReceiptText, 
  Calendar 
} from "lucide-react";
import { AdminSection, MetricCard } from "@/components/admin/AdminSection";
import { 
  obtenerReporteFinancieroAction, 
  type ReporteFinancieroData 
} from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2,
  }).format(value);
}

export function FinanzasClient() {
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getThirtyDaysAgoString = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [fechaInicio, setFechaInicio] = useState(getThirtyDaysAgoString());
  const [fechaFin, setFechaFin] = useState(getTodayString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteFinancieroData | null>(null);

  const fetchReporte = async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await obtenerReporteFinancieroAction(start, end);
      if (res.ok && res.data) {
        setReporte(res.data);
      } else {
        setError(res.message);
        setReporte(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
      setReporte(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReporte(fechaInicio, fechaFin);
  }, []);

  const handleFetchReporte = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchReporte(fechaInicio, fechaFin);
  };

  return (
    <AdminSection
      eyebrow="Reportes Financieros"
      title="Finanzas y Rentabilidad"
      description="Consulte en tiempo real los ingresos brutos, costos de producción (COGS) y ganancia neta para entender la salud de su negocio."
    >
      {/* Date Range Selector */}
      <div className="surface-card rounded-xl p-6 mb-6">
        <h2 className="text-base font-bold text-[var(--cacao)] mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[var(--brand)]" />
          Seleccione el Rango de Fechas
        </h2>
        <form onSubmit={handleFetchReporte} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="fecha-inicio" className="block text-xs font-semibold text-[var(--cacao-light)] mb-1">
              Fecha de Inicio
            </label>
            <input
              id="fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="field-control w-full rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="fecha-fin" className="block text-xs font-semibold text-[var(--cacao-light)] mb-1">
              Fecha de Fin
            </label>
            <input
              id="fecha-fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="field-control w-full rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary rounded-lg px-6 py-2 text-sm font-bold h-[38px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generando...
              </>
            ) : (
              "Generar Reporte"
            )}
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="animate-fade-in mb-6 rounded-lg bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Report Indicators */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="surface-card rounded-xl p-4 animate-pulse">
              <div className="h-10 w-10 bg-stone-200 rounded-lg" />
              <div className="h-6 w-24 bg-stone-200 rounded mt-3" />
              <div className="h-4 w-32 bg-stone-200 rounded mt-2" />
            </div>
          ))}
        </div>
      ) : reporte ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Ingresos Brutos"
            value={formatCurrency(reporte.total_ingresos)}
            tone="success"
            helper="Ventas liquidadas en este rango."
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
          <MetricCard
            label="Costos de Producción (COGS)"
            value={formatCurrency(reporte.total_costos)}
            tone="danger"
            helper="Costo estimado de recetas asociadas."
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <MetricCard
            label="Utilidad Neta"
            value={formatCurrency(reporte.ganancia_neta)}
            tone="brand"
            helper="Ganancia real después de costos."
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            label="Número de Ventas"
            value={String(reporte.numero_ventas)}
            tone="info"
            helper="Cantidad total de tickets liquidados."
            icon={<ReceiptText className="h-5 w-5" />}
          />
        </div>
      ) : (
        <div className="surface-card rounded-xl p-8 text-center text-[var(--cacao-muted)]">
          Seleccione un rango de fechas y presione "Generar Reporte" para visualizar los indicadores financieros.
        </div>
      )}
    </AdminSection>
  );
}
