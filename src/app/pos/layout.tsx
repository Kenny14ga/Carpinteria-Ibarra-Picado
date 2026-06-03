"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logoutAction } from "@/app/auth/actions";
import { db } from "@/lib/db";
import { Bell } from "lucide-react";
import { PedidosPendientes } from "@/components/pos/PedidosPendientes";

/* ─── TopBar: barra superior fija del POS ─── */
function TopBar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Vendedor");
  const [isOnline, setIsOnline] = useState(true);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [isPedidosOpen, setIsPedidosOpen] = useState(false);

  useEffect(() => {
    // Resolver el nombre del usuario desde Supabase Auth
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const name =
          user.user_metadata?.nombre ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Vendedor";
        setUserName(name);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Indicador de conexión en tiempo real
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // Reloj en tiempo real
    const tick = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Suscripción al conteo de pedidos pendientes de WhatsApp
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count, error } = await (supabase.from("pedidos_clientes" as any) as any)
          .select("*", { count: "exact", head: true })
          .eq("estado", "ESPERANDO_WSP");
        if (!error && count !== null) {
          setPendingCount(count);
        }
      } catch (err) {
        console.error("Error al consultar conteo de pedidos:", err);
      }
    };
    fetchCount();

    const channel = supabase
      .channel("topbar_pedidos_count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_clientes" },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleCloseShift = useCallback(async () => {
    if (isClosingShift) return;

    try {
      // Validar si hay elementos pendientes en la cola local de Dexie
      const pendingSyncs = await db.sync_queue.toArray();
      const pendingSyncCount = pendingSyncs.filter(
        (item) => item.synced === false || item.estado === "PENDING"
      ).length;

      if (pendingSyncCount > 0) {
        const confirmed = window.confirm(
          `⚠️ Tienes ${pendingSyncCount} transacciones pendientes de sincronizar en este dispositivo.\n\n` +
            "Si cierras tu turno ahora, las ventas se guardarán localmente en el navegador, pero no estarán reflejadas en el servidor hasta que vuelvas a iniciar sesión y te conectes a internet.\n\n" +
            "¿Deseas cerrar tu turno de todos modos?"
        );
        if (!confirmed) return;
      } else {
        const confirmed = window.confirm(
          "¿Deseas cerrar tu turno y salir del sistema?"
        );
        if (!confirmed) return;
      }

      setIsClosingShift(true);
      await logoutAction();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("[POS] Error al cerrar turno:", error);
      setIsClosingShift(false);
    }
  }, [isClosingShift, router]);

  return (
    <header
      id="pos-topbar"
      className="pos-topbar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "var(--pos-topbar-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.25rem",
        borderBottom: "1px solid var(--border-soft)",
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
      }}
    >
      {/* Izquierda: Logo + nombre de usuario */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: "2.25rem",
            height: "2.25rem",
            borderRadius: "0.625rem",
            background:
              "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(184, 62, 108, 0.25)",
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" x2="21" y1="6" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <div className="hidden sm:block" style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--brand)",
              lineHeight: 1,
              marginBottom: "0.125rem",
            }}
          >
            Punto de Venta
          </p>
          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 800,
              color: "var(--cacao)",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "12rem",
            }}
          >
            {userName}
          </p>
        </div>
      </div>

      {/* Centro: Reloj + estado de conexión (Oculto en móvil) */}
      <div
        className="hidden sm:flex"
        style={{
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {/* Reloj */}
        <span
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--cacao)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.02em",
          }}
        >
          {currentTime}
        </span>

        {/* Indicador Online / Offline */}
        <div
          id="pos-connection-indicator"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.3rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            transition: "all 0.3s ease",
            background: isOnline ? "var(--success-bg)" : "var(--danger-bg)",
            color: isOnline ? "var(--success)" : "var(--danger)",
            border: `1.5px solid ${isOnline ? "rgba(22, 163, 74, 0.15)" : "rgba(220, 38, 38, 0.15)"}`,
          }}
        >
          <span
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: isOnline ? "var(--success)" : "var(--danger)",
              animation: isOnline ? "none" : "pulse-soft 1.5s ease-in-out infinite",
            }}
          />
          {isOnline ? "En Línea" : "Sin Conexión"}
        </div>
      </div>

      {/* Derecha: Notificaciones + Botón Cerrar Turno */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        {/* Campana de Pedidos Pendientes */}
        <button
          id="pos-pedidos-bell-btn"
          type="button"
          onClick={() => setIsPedidosOpen(true)}
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "0.75rem",
            border: "1.5px solid var(--border-soft)",
            background: "transparent",
            color: "var(--cacao)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            WebkitTapHighlightColor: "transparent",
          }}
          title="Pedidos pendientes de WhatsApp"
        >
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-0.25rem",
                right: "-0.25rem",
                background: "var(--danger)",
                color: "white",
                fontSize: "0.65rem",
                fontWeight: 900,
                minWidth: "1.25rem",
                height: "1.25rem",
                padding: "0 0.25rem",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(220, 38, 38, 0.35)",
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          id="pos-close-shift-btn"
          type="button"
          disabled={isClosingShift}
          onClick={handleCloseShift}
          className="py-2 px-2.5 sm:px-4"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.75rem",
            border: "1.5px solid var(--danger)",
            background: isClosingShift ? "var(--danger-bg)" : "transparent",
            color: "var(--danger)",
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: isClosingShift ? "not-allowed" : "pointer",
            opacity: isClosingShift ? 0.5 : 1,
            transition: "all 0.2s ease",
            WebkitTapHighlightColor: "transparent",
            flexShrink: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          <span className="hidden sm:inline">
            {isClosingShift ? "Cerrando…" : "Cerrar Turno"}
          </span>
        </button>
      </div>

      <PedidosPendientes
        isOpen={isPedidosOpen}
        onClose={() => setIsPedidosOpen(false)}
        onPendingCountChange={setPendingCount}
      />
    </header>
  );
}

/* ─── POS Layout: contenedor estricto full-screen ─── */
export default function PosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style>{`
        :root {
          --pos-topbar-height: 3.75rem;
        }
      `}</style>
      <div
        id="pos-shell"
        style={{
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          background: "var(--blush)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TopBar />
        <main
          id="pos-main"
          style={{
            flex: 1,
            marginTop: "var(--pos-topbar-height)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
