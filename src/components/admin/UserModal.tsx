"use client";

import { useState, useTransition, type FormEvent } from "react";
import { AlertCircle, KeyRound, Mail, RefreshCw, Save, ShieldAlert, User, X } from "lucide-react";
import { createUserAction, type UserActionResult } from "@/app/admin/usuarios/actions";

type UserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function UserModal({ isOpen, onClose, onSuccess }: UserModalProps) {
  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<UserActionResult | null>(null);

  if (!isOpen) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createUserAction(formData);
      setAlert(result);

      if (result.ok) {
        onSuccess();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onClose}
        className="absolute inset-0 bg-[#4A2B32]/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Container */}
      <aside className="glass-card relative w-full max-w-md overflow-hidden rounded-2xl border border-[#F2D6DE] bg-white p-6 shadow-soft animate-scale-up md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2D6DE] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#4A2B32]">Nuevo Usuario</h2>
            <p className="text-xs text-[#6F4A52]">Registra un nuevo miembro en el personal.</p>
          </div>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6F4A52] transition hover:bg-[#FFF9F5] hover:text-[#4A2B32] focus:outline-none focus:ring-2 focus:ring-[#B83E6C]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>

        {/* Error Alert */}
        {alert && !alert.ok ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--danger-bg)] p-3 text-xs font-medium text-[var(--danger)] border border-[rgba(180,35,24,0.1)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{alert.message}</span>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">Nombre completo</span>
            <div className="relative mt-1">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58B96]" aria-hidden="true" />
              <input
                name="nombre"
                required
                placeholder="Juan Pérez"
                className="field-control h-11 w-full rounded-lg pl-9 pr-3 text-sm"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">Correo electrónico</span>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58B96]" aria-hidden="true" />
              <input
                name="email"
                type="email"
                required
                placeholder="juan.perez@riquiquisimo.com"
                className="field-control h-11 w-full rounded-lg pl-9 pr-3 text-sm"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">Contraseña</span>
            <div className="relative mt-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58B96]" aria-hidden="true" />
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="•••••• (Mínimo 6 caracteres)"
                className="field-control h-11 w-full rounded-lg pl-9 pr-3 text-sm"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4A2B32]">Rol de acceso</span>
            <div className="relative mt-1">
              <ShieldAlert className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58B96]" aria-hidden="true" />
              <select
                name="rol"
                defaultValue="vendedor"
                className="field-control h-11 w-full rounded-lg pl-9 pr-3 text-sm appearance-none bg-white"
              >
                <option value="vendedor">Vendedor / Cajero (POS)</option>
                <option value="admin">Administrador (Acceso Total)</option>
              </select>
            </div>
          </label>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end gap-2 border-t border-[#F2D6DE] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn-secondary h-11 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-[#D7A1B6]"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {isPending ? "Guardando..." : "Crear empleado"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
