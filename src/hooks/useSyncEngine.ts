"use client";

import { liveQuery } from "dexie";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  db,
  getSyncQueueAction,
  getSyncQueueStatus,
  isPendingSyncQueueItem,
  type SyncQueueItem
} from "@/lib/db";
import { isSupabaseConfigured, supabase, type Json } from "@/lib/supabase";

type SyncEngineState = {
  isOnline: boolean;
  isSyncing: boolean;
  lastError: string | null;
  processSyncQueue: () => Promise<void>;
};

function getOnlineStatus() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

function isSuccessfulStatus(status: number | null) {
  return typeof status === "number" && status >= 200 && status < 300;
}

function serializePayload(payload: unknown): Json {
  try {
    return JSON.parse(JSON.stringify(payload ?? null)) as Json;
  } catch (error) {
    console.warn("[SyncEngine] No se pudo serializar el payload original.", error);
    return {
      error: "PAYLOAD_NOT_SERIALIZABLE",
      value: String(payload)
    };
  }
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function sendTransactionToSupabase(item: SyncQueueItem) {
  const { error, status, statusText } = await supabase.from("transacciones_sync").insert({
    accion: getSyncQueueAction(item),
    payload: serializePayload(item.payload),
    timestamp: new Date(item.timestamp).toISOString(),
    estado: getSyncQueueStatus(item)
  });

  if (error || !isSuccessfulStatus(status)) {
    throw new Error(error?.message ?? `Supabase respondio ${status} ${statusText}`);
  }
}

export function useSyncEngine(): SyncEngineState {
  const [isOnline, setIsOnline] = useState(getOnlineStatus);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const warnedMissingConfigRef = useRef(false);

  const processSyncQueue = useCallback(async () => {
    if (isSyncingRef.current) {
      return;
    }

    if (!getOnlineStatus()) {
      setIsOnline(false);
      return;
    }

    if (!isSupabaseConfigured) {
      if (!warnedMissingConfigRef.current) {
        console.warn(
          "[SyncEngine] Supabase no esta configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
        warnedMissingConfigRef.current = true;
      }

      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setLastError(null);

    try {
      const pendingItems = (await db.sync_queue.orderBy("timestamp").toArray()).filter(isPendingSyncQueueItem);

      for (const item of pendingItems) {
        if (!getOnlineStatus()) {
          setIsOnline(false);
          console.warn("[SyncEngine] Conexion perdida. Se pausa la sincronizacion.");
          break;
        }

        if (item.id === undefined) {
          const message = "[SyncEngine] Registro de sync_queue sin id local. Se interrumpe el ciclo.";
          console.warn(message, item);
          setLastError(message);
          break;
        }

        try {
          await sendTransactionToSupabase(item);
          await db.sync_queue.delete(item.id);
        } catch (error) {
          const message = describeError(error);
          console.warn("[SyncEngine] Fallo al sincronizar. La cola queda detenida para mantener orden FIFO.", {
            queueId: item.id,
            accion: getSyncQueueAction(item),
            error
          });

          await db.sync_queue.update(item.id, { estado: "FAILED", synced: false });
          setLastError(message);
          break;
        }
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      void processSyncQueue();
    }

    function handleOffline() {
      setIsOnline(false);
      console.warn("[SyncEngine] Cliente offline. Las transacciones quedan en Dexie.");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const initialSyncTimer = window.setTimeout(() => {
      if (getOnlineStatus()) {
        void processSyncQueue();
      }
    }, 0);

    return () => {
      window.clearTimeout(initialSyncTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processSyncQueue]);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.sync_queue.toArray().then((items) => items.filter(isPendingSyncQueueItem).length)
    ).subscribe({
      next: (pendingCount) => {
        if (pendingCount > 0 && getOnlineStatus()) {
          void processSyncQueue();
        }
      },
      error: (error) => {
        console.warn("[SyncEngine] No se pudo observar sync_queue.", error);
      }
    });

    return () => subscription.unsubscribe();
  }, [processSyncQueue]);

  return {
    isOnline,
    isSyncing,
    lastError,
    processSyncQueue
  };
}

export function SyncEngineRuntime() {
  useSyncEngine();
  return null;
}
