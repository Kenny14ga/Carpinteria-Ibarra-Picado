"use client";

import type { ReactNode } from "react";

export type ResponsiveTableColumn<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
  mobileLabel?: ReactNode;
};

type ResponsiveTableProps<T> = {
  rows: T[];
  columns: Array<ResponsiveTableColumn<T>>;
  getRowKey: (row: T) => string;
  emptyState?: ReactNode;
  renderMobileCard?: (row: T) => ReactNode;
};

export function ResponsiveTable<T>({
  rows,
  columns,
  getRowKey,
  emptyState,
  renderMobileCard
}: ResponsiveTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="animate-fade-in rounded-xl border border-dashed border-[var(--border-soft)] bg-white px-4 py-14 text-center">
        {emptyState ?? (
          <p className="text-sm font-medium text-[var(--cacao-light)]">No hay registros.</p>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)] md:block">
        <table className="min-w-full divide-y divide-[var(--border-soft)]">
          <thead className="bg-[var(--cream)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)] ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)] bg-white">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="transition-colors duration-150 hover:bg-[var(--cream)]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3.5 text-sm text-[var(--cacao)] ${column.className ?? ""}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((row) => (
          <article
            key={getRowKey(row)}
            className="surface-card rounded-xl p-4"
          >
            {renderMobileCard ? (
              renderMobileCard(row)
            ) : (
              <dl className="space-y-2.5">
                {columns.map((column) => (
                  <div key={column.key} className="grid gap-0.5">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--brand)]">
                      {column.mobileLabel ?? column.header}
                    </dt>
                    <dd className="text-sm text-[var(--cacao)]">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
