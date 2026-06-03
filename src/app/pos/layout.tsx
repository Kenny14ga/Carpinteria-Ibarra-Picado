"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logoutAction } from "@/app/auth/actions";

/* ─── TopBar: barra superior fija del POS ─── */
function TopBar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Vendedor");
  const [isOnline, setIsOnline] = useState(true);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

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

  const handleCloseShift = useCallback(async () => {
    if (isClosingShift) return;
    const confirmed = window.confirm(
      "¿Deseas cerrar tu turno y salir del sistema?"
    );
    if (!confirmed) return;

    setIsClosingShift(true);
    try {
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
        <div style={{ minWidth: 0 }}>
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

      {/* Centro: Reloj + estado de conexión */}
      <div
        style={{
          display: "flex",
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

      {/* Derecha: Botón Cerrar Turno */}
      <button
        id="pos-close-shift-btn"
        type="button"
        disabled={isClosingShift}
        onClick={handleCloseShift}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.6rem 1.25rem",
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
        {isClosingShift ? "Cerrando…" : "Cerrar Turno"}
      </button>
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
