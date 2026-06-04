"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePosStore } from "@/store/usePosStore";
import { X, Check, Trash2, Inbox, AlertTriangle, RefreshCw, AlertCircle, ChefHat } from "lucide-react";

type PedidoCliente = {
  id: string;
  cliente_nombre: string;
  telefono?: string;
  direccion?: string;
  detalles_personalizados?: string;
  items: { id: string; nombre: string; precio_unitario: number; cantidad: number }[];
  total: number;
  estado: "ESPERANDO_WSP" | "ACEPTADO" | "RECHAZADO";
  created_at: string;
};

type PedidosPendientesProps = {
  isOpen: boolean;
  onClose: () => void;
  onPendingCountChange?: (count: number) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2,
  }).format(value);
}

export function PedidosPendientes({ isOpen, onClose, onPendingCountChange }: PedidosPendientesProps) {
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localWarnings, setLocalWarnings] = useState<Record<string, string[]>>({});
  const loadClientOrder = usePosStore((s) => s.loadClientOrder);
  const onPendingCountChangeRef = useRef(onPendingCountChange);

  // Mantener la referencia actualizada de onPendingCountChange
  useEffect(() => {
    onPendingCountChangeRef.current = onPendingCountChange;
  }, [onPendingCountChange]);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await (supabase.from("pedidos_clientes" as any) as any)
        .select("*")
        .eq("estado", "ESPERANDO_WSP")
        .order("created_at", { ascending: false });

      if (fetchErr) {
        throw fetchErr;
      }

      const list = (data || []) as PedidoCliente[];
      setPedidos(list);
      onPendingCountChangeRef.current?.(list.length);
    } catch (err) {
      console.error("[PedidosPendientes] Error al cargar pedidos:", err);
      setError("No se pudieron cargar los pedidos pendientes de Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Suscripción Realtime y Window Online Event
  useEffect(() => {
    // 1. Cargar inicial
    fetchPedidos();

    // 2. Evento de red restablecida (online) para volver a consultar
    const handleOnline = () => {
      console.log("[PedidosPendientes] Red restablecida. Actualizando lista de pedidos...");
      fetchPedidos();
    };
    window.addEventListener("online", handleOnline);

    // 3. Suscripción a canal Realtime
    const channel = supabase
      .channel("pedidos")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pedidos_clientes",
        },
        (payload) => {
          console.log("[PedidosPendientes] Nuevo pedido insertado detectado:", payload);
          // Volver a consultar para asegurar consistencia del estado
          fetchPedidos();
        }
      )
      .subscribe();

    // Cleanup para evitar fugas de memoria
    return () => {
      window.removeEventListener("online", handleOnline);
      void supabase.removeChannel(channel);
    };
  }, [fetchPedidos]);

  // Acción Aprobar y Cargar al Ticket
  const handleAprobar = async (pedido: PedidoCliente) => {
    try {
      // 1. Actualizar estado en Supabase primero
      const { error: updateErr } = await (supabase.from("pedidos_clientes" as any) as any)
        .update({ estado: "ACEPTADO" })
        .eq("id", pedido.id);

      if (updateErr) {
        throw updateErr;
      }

      // 2. Transferir a Zustand Store
      const result = await loadClientOrder(pedido.items);

      if (result.warnings.length > 0) {
        // Guardar advertencias locales para mostrar feedback al vendedor
        setLocalWarnings((prev) => ({
          ...prev,
          [pedido.id]: result.warnings,
        }));
      }

      // 3. Remover localmente si no tiene alertas críticas, o refrescar
      fetchPedidos();
    } catch (err) {
      console.error("[PedidosPendientes] Error al aprobar pedido:", err);
      alert("Error al intentar aprobar el pedido. Revisa tu conexión a internet.");
    }
  };

  // Acción Descartar / Rechazar
  const handleDescartar = async (pedido: PedidoCliente) => {
    const confirmed = window.confirm(`¿Deseas rechazar y ocultar el pedido de "${pedido.cliente_nombre}"?`);
    if (!confirmed) return;

    try {
      const { error: updateErr } = await (supabase.from("pedidos_clientes" as any) as any)
        .update({ estado: "RECHAZADO" })
        .eq("id", pedido.id);

      if (updateErr) {
        throw updateErr;
      }

      // Limpiar advertencias si las hubiera
      setLocalWarnings((prev) => {
        const copy = { ...prev };
        delete copy[pedido.id];
        return copy;
      });

      fetchPedidos();
    } catch (err) {
      console.error("[PedidosPendientes] Error al descartar pedido:", err);
      alert("Error al descartar el pedido. Revisa tu conexión a internet.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="pedidos-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        id="pedidos-drawer"
        className="w-full max-w-md h-full bg-[#FFF9F5] border-l border-[#F2D6DE] shadow-2xl flex flex-col animate-fade-in-left"
        style={{ color: "var(--cacao)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <header className="flex h-16 items-center justify-between border-b border-[#F2D6DE] bg-white px-5">
          <div>
            <h3 className="font-bold text-lg text-[#8B2E54]">Pedidos por WhatsApp</h3>
            <p className="text-xs text-[#6F4A52]">Revisión y aprobación de carritos</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPedidos}
              disabled={loading}
              title="Refrescar lista"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F2D6DE] text-[#6F4A52] hover:bg-[#FFF6F6] transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F2D6DE] text-[#6F4A52] hover:bg-[#FFF6F6] transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex gap-2.5 rounded-xl bg-red-50 p-4 border border-red-200 text-red-800 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <p>{error}</p>
            </div>
          )}

          {pedidos.length === 0 && !loading ? (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0EE] text-[#F48CAA]">
                <Inbox className="h-7 w-7" />
              </div>
              <div>
                <p className="font-bold text-base text-[#4A2B32]">No hay pedidos en espera</p>
                <p className="text-xs text-[#6F4A52] max-w-[240px] mt-1 mx-auto">
                  Los pedidos pendientes que los clientes envíen por WhatsApp aparecerán aquí automáticamente.
                </p>
              </div>
            </div>
          ) : (
            pedidos.map((pedido) => {
              const shortCode = pedido.id.split("-")[0].toUpperCase();
              const warnings = localWarnings[pedido.id] || [];

              return (
                <article
                  key={pedido.id}
                  className="rounded-2xl border border-[#F2D6DE] bg-white p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col space-y-3"
                >
                  {/* Fila superior: Cliente y Código */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#4A2B32]">{pedido.cliente_nombre}</h4>
                      <p className="text-[11px] font-bold text-[#8B2E54] tracking-wide mt-0.5">
                        CÓDIGO: #{shortCode}
                      </p>
                    </div>
                    <span className="font-black text-base text-[#8B2E54]">
                      {formatCurrency(pedido.total)}
                    </span>
                  </div>

                  {/* Datos de contacto si existen */}
                  {(pedido.telefono || pedido.direccion) && (
                    <div className="text-[11px] text-[#6F4A52]/80 space-y-0.5 border-l-2 border-[#FDE1E6] pl-2">
                      {pedido.telefono && (
                        <p>
                          <strong>Teléfono:</strong> {pedido.telefono}
                        </p>
                      )}
                      {pedido.direccion && (
                        <p className="line-clamp-2" title={pedido.direccion}>
                          <strong>Dirección:</strong> {pedido.direccion}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Detalles personalizados para encargos especiales */}
                  {pedido.detalles_personalizados && (
                    <div className="rounded-xl bg-[#FFF5F6] border border-[#F2D6DE] p-2.5 text-xs text-[#8B2E54]">
                      <p className="font-bold flex items-center gap-1.5 text-[#8B2E54] mb-1">
                        <ChefHat className="h-3.5 w-3.5" />
                        Encargo Especial:
                      </p>
                      <p className="text-[#6F4A52] leading-relaxed italic">
                        "{pedido.detalles_personalizados}"
                      </p>
                    </div>
                  )}

                  {/* Listado de items del pedido */}
                  <div className="rounded-xl bg-[#FFF9F5] border border-[#FDE1E6] p-2.5 space-y-1.5">
                    {pedido.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-[#6F4A52]">
                          <strong className="text-[#8B2E54]">{item.cantidad}x</strong> {item.nombre}
                        </span>
                        <span className="font-semibold text-[#4A2B32]">
                          {formatCurrency(item.precio_unitario * item.cantidad)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Advertencias de stock */}
                  {warnings.length > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Advertencias de Inventario:</span>
                      </div>
                      {warnings.map((w, idx) => (
                        <p key={idx} className="text-[10px] text-amber-800 leading-tight pl-5 list-item">
                          {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAprobar(pedido)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs py-2.5 px-3 hover:bg-emerald-700 active:scale-95 transition"
                    >
                      <Check className="h-4 w-4" />
                      Aprobar y Cargar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDescartar(pedido)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 p-2.5 hover:bg-red-100 hover:text-red-800 active:scale-95 transition"
                      title="Descartar / Rechazar pedido"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
