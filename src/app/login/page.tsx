"use client";

import { useState, useTransition, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowLeft, KeyRound, Mail, RefreshCw } from "lucide-react";
import { loginAction, type LoginActionResult } from "./actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<LoginActionResult | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      setAlert(result);

      if (result.ok && result.redirectTo) {
        const nextParam = searchParams.get("next");
        const destination = nextParam && nextParam.startsWith("/") ? nextParam : result.redirectTo;
        router.push(destination);
        router.refresh();
      }
    });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#FFF6F6] p-4 text-[#4A2B32]">
      {/* Background gradients for premium ambient lighting */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-pastel)]/40 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--brand-cream)]/50 blur-[100px]" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Back Link to Catalog */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded px-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al catálogo
          </Link>
        </div>

        {/* Login Card */}
        <div className="glass-card overflow-hidden rounded-2xl border border-[#F2D6DE] bg-white/70 p-6 shadow-[0_8px_32px_0_rgba(139,46,84,0.06)] backdrop-blur-md sm:p-8">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/LOGOS/logo-mark.svg"
              alt="Riquiquísimo"
              width={64}
              height={64}
              className="rounded-xl shadow-sm"
              priority
            />
            <h1 className="brand-heading mt-4 text-2xl font-bold">Portal de Empleados</h1>
            <p className="mt-1 text-sm text-[var(--cacao-light)]">
              Inicia sesión para acceder a la caja o administración.
            </p>
          </div>

          {/* Alert messages */}
          {alert && !alert.ok ? (
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-[var(--danger-bg)] p-3.5 text-xs font-medium text-[var(--danger)] border border-[rgba(180,35,24,0.1)]">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{alert.message}</span>
            </div>
          ) : null}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--cacao)]">Correo electrónico</span>
              <div className="relative mt-1">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cacao-muted)]"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ejemplo@riquiquisimo.com"
                  autoComplete="email"
                  className="field-control h-11 w-full rounded-lg pl-9 pr-3 text-sm placeholder:text-[var(--cacao-muted)]"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--cacao)]">Contraseña</span>
              <div className="relative mt-1">
                <KeyRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cacao-muted)]"
                />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="field-control h-11 w-full rounded-lg pl-9 pr-3 text-sm placeholder:text-[var(--cacao-muted)]"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#D7A1B6]"
            >
              {isPending ? (
                <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                null
              )}
              {isPending ? "Autenticando..." : "Entrar al sistema"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="relative flex min-h-screen items-center justify-center bg-[#FFF6F6] p-4 text-[#4A2B32]">
        <RefreshCw aria-hidden="true" className="h-8 w-8 animate-spin text-[var(--brand)]" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
