"use client";

import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallBanner() {
  const { isInstallable, triggerInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isInstallable || isDismissed) {
    return null;
  }

  async function handleInstall() {
    setIsInstalling(true);

    try {
      await triggerInstall();
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <div className="animate-fade-in-up fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-[var(--border-soft)] bg-white/95 p-3.5 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:bottom-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-[0_2px_8px_rgba(139,94,52,0.28)]">
          <Smartphone aria-hidden className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--cacao)]">Instalar Ibarra Picado</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--cacao-light)]">
            Acceso rápido al POS, inventario y taller desde este dispositivo.
          </p>
        </div>
        <button
          type="button"
          title="Instalar app"
          onClick={handleInstall}
          disabled={isInstalling}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download aria-hidden className="h-5 w-5" />
          <span className="sr-only">Instalar app</span>
        </button>
        <button
          type="button"
          title="Cerrar aviso"
          onClick={() => setIsDismissed(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--cacao-light)] transition hover:bg-[var(--cream)] hover:text-[var(--cacao)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
        >
          <X aria-hidden className="h-4 w-4" />
          <span className="sr-only">Cerrar aviso</span>
        </button>
      </div>
    </div>
  );
}
