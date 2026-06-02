import type { ReactNode } from "react";

type AdminSectionProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function AdminSection({ eyebrow, title, description, action, children }: AdminSectionProps) {
  return (
    <div className="app-page">
      <header className="app-header px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand)]">
              {eyebrow}
            </p>
            <h1 className="brand-heading mt-1.5 text-2xl font-bold sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cacao-light)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="animate-fade-in shrink-0" style={{ animationDelay: "100ms" }}>{action}</div> : null}
        </div>
      </header>
      <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "info";
};

const iconBgClasses = {
  brand: "bg-gradient-to-br from-[var(--brand-cream)] to-[rgba(244,140,170,0.2)] text-[var(--brand)]",
  success: "bg-[var(--success-bg)] text-[var(--success)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
  info: "bg-[var(--info-bg)] text-[var(--info)]"
};

const toneClasses = {
  brand: "bg-[var(--brand-cream)] text-[var(--brand-dark)]",
  success: "status-success",
  warning: "status-warning",
  danger: "status-danger",
  info: "status-info"
};

export function MetricCard({ label, value, helper, icon, tone = "brand" }: MetricCardProps) {
  return (
    <article className="surface-card group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${iconBgClasses[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--cacao)]">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--cacao-light)]">{label}</p>
      {helper ? (
        <p className="mt-2 text-xs leading-5 text-[var(--cacao-muted)]">{helper}</p>
      ) : null}
    </article>
  );
}

export function StatusBadge({
  label,
  tone
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "brand";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
