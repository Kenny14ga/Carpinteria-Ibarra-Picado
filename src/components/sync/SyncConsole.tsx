"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Trash2 } from "lucide-react";
import { db, getSyncQueueAction, getSyncQueueStatus, type QueueStatus, type SyncQueueItem } from "@/lib/db";

const statusStyles: Record<QueueStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  FAILED: "bg-rose-100 text-rose-800"
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("es-NI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(timestamp);
}

function payloadPreview(item: SyncQueueItem) {
  const text = JSON.stringify(item.payload);
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

export function SyncConsole() {
  const queue = useLiveQuery(
    () => db.sync_queue.orderBy("timestamp").reverse().limit(12).toArray(),
    [],
    []
  );

  const stats = useMemo(() => {
    return queue.reduce(
      (current, item) => {
        current[getSyncQueueStatus(item)] += 1;
        return current;
      },
      { PENDING: 0, PROCESSING: 0, FAILED: 0 } satisfies Record<QueueStatus, number>
    );
  }, [queue]);

  async function markProcessing(id: number | undefined) {
    if (id === undefined) {
      return;
    }

    await db.sync_queue.update(id, { estado: "PROCESSING", synced: false });
  }

  async function clearQueue() {
    await db.sync_queue.clear();
  }

  return (
    <aside className="hidden min-h-screen border-l border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
        <div>
          <p className="text-sm font-semibold text-slate-950">Cola sync</p>
          <p className="text-xs text-slate-500">{queue.length} eventos locales</p>
        </div>
        <button
          type="button"
          title="Limpiar cola"
          onClick={clearQueue}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">Limpiar cola</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 p-4">
        <div className="rounded-md bg-amber-50 p-3">
          <Clock3 aria-hidden="true" className="h-4 w-4 text-amber-700" />
          <p className="mt-2 text-lg font-semibold text-slate-950">{stats.PENDING}</p>
          <p className="text-xs text-slate-500">Pend.</p>
        </div>
        <div className="rounded-md bg-sky-50 p-3">
          <RefreshCw aria-hidden="true" className="h-4 w-4 text-sky-700" />
          <p className="mt-2 text-lg font-semibold text-slate-950">{stats.PROCESSING}</p>
          <p className="text-xs text-slate-500">Proc.</p>
        </div>
        <div className="rounded-md bg-rose-50 p-3">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 text-rose-700" />
          <p className="mt-2 text-lg font-semibold text-slate-950">{stats.FAILED}</p>
          <p className="text-xs text-slate-500">Fallo</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {queue.length === 0 ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 p-6 text-center">
            <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-teal-700" />
            <p className="mt-3 text-sm font-semibold text-slate-950">Cola limpia</p>
            <p className="mt-1 text-xs text-slate-500">No hay eventos pendientes.</p>
          </div>
        ) : (
          queue.map((item) => {
            const status = getSyncQueueStatus(item);

            return (
              <article key={item.id ?? item.timestamp} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{getSyncQueueAction(item)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTime(item.timestamp)}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${statusStyles[status]}`}>
                    {status}
                  </span>
                </div>

                <pre className="mt-3 max-h-24 overflow-hidden whitespace-pre-wrap break-words rounded-md bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
                  {payloadPreview(item)}
                </pre>

                <button
                  type="button"
                  title="Marcar procesando"
                  onClick={() => markProcessing(item.id)}
                  className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Procesar
                </button>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
