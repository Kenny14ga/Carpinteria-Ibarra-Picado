"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Trash2, User as UserIcon, Users } from "lucide-react";
import { AdminSection, MetricCard } from "@/components/admin/AdminSection";
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/ui/ResponsiveTable";
import { UserModal } from "@/components/admin/UserModal";
import { deleteUserAction, type UserActionResult } from "./actions";
import type { User } from "@supabase/supabase-js";

type UsuariosClientProps = {
  initialUsers: User[];
  initialError: string | null;
};

function Alert({ result }: { result: UserActionResult | null }) {
  if (!result) return null;
  const Icon = result.ok ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium ${result.ok ? "status-success" : "status-danger"}`}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{result.message}</span>
    </div>
  );
}

export function UsuariosClient({ initialUsers, initialError }: UsuariosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alert, setAlert] = useState<UserActionResult | null>(
    initialError ? { ok: false, message: initialError } : null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const adminUsers = initialUsers.filter(u => {
    const role = (u.user_metadata?.role || "vendedor").toUpperCase();
    return role === "ADMIN" || role === "SUPERADMIN";
  });

  const vendedorUsers = initialUsers.filter(u => {
    const role = (u.user_metadata?.role || "vendedor").toUpperCase();
    return role === "VENDEDOR" || role === "EMPLEADO";
  });

  function handleDelete(user: User) {
    const name = user.user_metadata?.nombre || user.email;
    const shouldDelete = window.confirm(`¿Está seguro de que desea dar de baja (eliminar) a ${name}? Esta acción es irreversible.`);

    if (!shouldDelete) return;

    setDeletingId(user.id);
    setAlert(null);

    startTransition(async () => {
      const result = await deleteUserAction(user.id);
      setAlert(result);
      setDeletingId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  const columns: Array<ResponsiveTableColumn<User>> = [
    {
      key: "usuario",
      header: "Empleado",
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-cream)] text-[var(--brand)]">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#4A2B32]">
              {user.user_metadata?.nombre || "Sin nombre"}
            </p>
            <p className="truncate text-xs text-[#6F4A52]/80">{user.email}</p>
          </div>
        </div>
      )
    },
    {
      key: "rol",
      header: "Rol de acceso",
      className: "w-44",
      cell: (user) => {
        const role = (user.user_metadata?.role || "vendedor").toUpperCase();
        const isAdmin = role === "ADMIN" || role === "SUPERADMIN";
        return (
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              isAdmin ? "status-success" : "status-brand"
            }`}
          >
            {isAdmin ? "Administrador" : "Vendedor / POS"}
          </span>
        );
      }
    },
    {
      key: "registro",
      header: "Fecha de registro",
      className: "w-48",
      cell: (user) =>
        new Date(user.created_at).toLocaleDateString("es-NI", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "w-36 text-right",
      cell: (user) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleDelete(user)}
            disabled={deletingId === user.id || isPending}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-[#B42318] transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[#B83E6C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingId === user.id ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Dar de baja</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="app-page">
      <header className="app-header px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#8B2E54]">Accesos y seguridad</p>
            <h1 className="brand-heading mt-1 text-3xl font-semibold">Usuarios del Sistema</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setAlert(null);
              setIsModalOpen(true);
            }}
            className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C]"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Nuevo usuario
          </button>
        </div>
      </header>

      {/* Metrics Section */}
      <section className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="stagger-children grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Total Personal"
            value={String(initialUsers.length)}
            helper="Cuentas activas en la pastelería."
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
          />
          <MetricCard
            label="Administradores"
            value={String(adminUsers.length)}
            tone="brand"
            helper="Acceso total a reportes e inventarios."
            icon={<UserIcon aria-hidden="true" className="h-5 w-5" />}
          />
          <MetricCard
            label="Vendedores / POS"
            value={String(vendedorUsers.length)}
            tone="info"
            helper="Personal operativo en caja registradora."
            icon={<UserIcon aria-hidden="true" className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Main Table Section */}
      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#4A2B32]">Lista de Empleados</h2>
            <p className="text-sm text-[#6F4A52]">{initialUsers.length} cuentas registradas en Supabase</p>
          </div>
          <div className="w-full sm:w-96">
            <Alert result={alert} />
          </div>
        </div>

        <ResponsiveTable
          rows={initialUsers}
          columns={columns}
          getRowKey={(user) => user.id}
          emptyState={
            <div>
              <UserIcon aria-hidden="true" className="mx-auto h-10 w-10 text-[#F48CAA]" />
              <p className="mt-3 text-sm font-semibold text-[#4A2B32]">Sin usuarios registrados</p>
              <p className="mt-1 text-sm text-[#6F4A52]">Crea la primera cuenta para habilitar accesos.</p>
            </div>
          }
          renderMobileCard={(user) => {
            const role = (user.user_metadata?.role || "vendedor").toUpperCase();
            const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

            return (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-cream)] text-[var(--brand)]">
                      <UserIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#4A2B32]">
                        {user.user_metadata?.nombre || "Sin nombre"}
                      </p>
                      <p className="truncate text-xs text-[#6F4A52]/80">{user.email}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase ${
                      isAdmin ? "status-success" : "status-brand"
                    }`}
                  >
                    {isAdmin ? "Admin" : "POS"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#6F4A52]">
                  <div className="rounded-md bg-[#FFF9F5] p-3">
                    <p className="text-[0.65rem] font-semibold uppercase text-[#8B2E54]">Registrado el</p>
                    <p className="mt-1 font-semibold">
                      {new Date(user.created_at).toLocaleDateString("es-NI", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id || isPending}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 text-xs font-semibold text-[#B42318] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === user.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Dar de baja
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </section>

      {/* User modal creation form */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
