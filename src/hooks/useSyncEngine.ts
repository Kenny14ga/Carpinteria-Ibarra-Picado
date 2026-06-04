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
  // Mapeo defensivo del payload: aseguramos que coincida estrictamente con las columnas de transacciones_sync.
  // Si en Dexie existe tipo_accion, se usa, de lo contrario se cae en action o accion.
  // La columna final en la base de datos es 'tipo_accion'.
  const payload = {
    tipo_accion: (item as any).tipo_accion || item.action || item.accion || "UNKNOWN_ACTION",
    payload: serializePayload(item.payload),
    creado_en_cliente: new Date(item.timestamp).toISOString(),
    estado: getSyncQueueStatus(item)
  };

  console.log("🚀 [Sync] Enviando payload: ", payload);

  const { data, error } = await supabase
    .from("transacciones_sync")
    .insert(payload)
    .select();

  if (error) {
    console.error("❌ [Sync] Error devuelto por Supabase:", error);
    if (error.message || error.details) {
      console.error("❌ [Sync] Detalles del error:", {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    }
    throw error;
  }

  console.log("✅ [Sync] Inserción exitosa en Supabase:", data);
  return data;
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

    console.log("🌐 [Sync] Conexión detectada. Iniciando...");

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

      console.log(`📦 [Sync] Transacciones pendientes encontradas: ${pendingItems.length}`);

      for (const item of pendingItems) {
        if (!getOnlineStatus()) {
          setIsOnline(false);
          console.warn("[SyncEngine] Conexion perdida. Se pausa la sincronizacion.");
          break;
        }

        if (item.id === undefined) {
          const message = "[SyncEngine] Registro de sync_queue sin id local. Se omite esta transacción.";
          console.warn(message, item);
          setLastError(message);
          continue;
        }

        try {
          await sendTransactionToSupabase(item);
          // Limpieza Automática (Auto-Clear) inmediatamente después del insert exitoso
          await db.sync_queue.delete(item.id);
          console.log(`🗑️ [Sync] Transacción ${item.id} eliminada con éxito de IndexedDB.`);
        } catch (error) {
          const message = describeError(error);
          console.error("❌ [Sync] Fallo al sincronizar transacción individual:", {
            queueId: item.id,
            accion: (item as any).tipo_accion || item.action || item.accion || "UNKNOWN_ACTION",
            error
          });

          // Tolerancia a fallos individuales: actualiza a FAILED en Dexie y continúa
          await db.sync_queue.update(item.id, { estado: "FAILED", synced: false });
          setLastError(message);
          continue;
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
