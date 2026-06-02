import Dexie, { type Table } from "dexie";

export type SyncStatus = "SYNCED" | "PENDING" | "FAILED";
export type QueueStatus = "PENDING" | "PROCESSING" | "FAILED";
export type SyncQueueAction = "CREATE_SALE" | "UPSERT_MATERIA_PRIMA" | "NUEVA_VENTA" | string;

export interface MateriaPrima {
  id: string;
  nombre: string;
  unidad_medida: string;
  stock_actual: number;
  costo_unitario: number;
  sync_status: SyncStatus;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio_venta: number;
  requiere_produccion: boolean;
  es_terminado: boolean;
  en_vitrina: boolean;
  stock_vitrina: number;
  alergenos: string[];
  imagen_url?: string;
  imagen_blob?: Blob;
  sync_status: SyncStatus;
}

export interface StockVitrina {
  producto_id: string;
  cantidad: number;
  updated_at: number;
}

export interface Receta {
  id: string;
  producto_id: string;
  materia_prima_id: string;
  cantidad_necesaria: number;
  sync_status: SyncStatus;
}

export interface SyncQueueItem {
  id?: number;
  action?: SyncQueueAction;
  accion?: string;
  payload: unknown;
  timestamp: number;
  synced?: boolean;
  estado?: QueueStatus;
}

export function getSyncQueueAction(item: SyncQueueItem) {
  return item.action ?? item.accion ?? "UNKNOWN_ACTION";
}

export function getSyncQueueStatus(item: SyncQueueItem): QueueStatus {
  if (item.estado) {
    return item.estado;
  }

  return item.synced === false ? "PENDING" : "PENDING";
}

export function isPendingSyncQueueItem(item: SyncQueueItem) {
  if (item.estado) {
    return item.estado === "PENDING";
  }

  return item.synced === false;
}

export class PasteleriaDB extends Dexie {
  materias_primas!: Table<MateriaPrima, string>;
  productos!: Table<Producto, string>;
  stock_vitrina!: Table<StockVitrina, string>;
  recetas!: Table<Receta, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super("PasteleriaDB");

    this.version(1).stores({
      materias_primas: "id, nombre, sync_status",
      productos: "id, nombre, sync_status",
      recetas: "id, producto_id, materia_prima_id, sync_status",
      sync_queue: "++id, estado, timestamp, accion"
    });

    this.version(2)
      .stores({
        materias_primas: "id, nombre, sync_status",
        productos: "id, nombre, sync_status, en_vitrina, es_terminado, stock_vitrina",
        recetas: "id, producto_id, materia_prima_id, sync_status",
        sync_queue: "++id, estado, timestamp, accion, action, synced"
      })
      .upgrade(async (tx) => {
        await tx
          .table("productos")
          .toCollection()
          .modify((producto: Partial<Producto>) => {
            producto.descripcion ??= "";
            producto.es_terminado ??= true;
            producto.en_vitrina ??= false;
            producto.stock_vitrina ??= 0;
            producto.alergenos ??= [];
          });

        await tx
          .table("sync_queue")
          .toCollection()
          .modify((item: SyncQueueItem) => {
            item.action ??= item.accion;
            item.synced ??= false;
          });
      });

    this.version(3)
      .stores({
        materias_primas: "id, nombre, sync_status",
        productos: "id, nombre, sync_status, en_vitrina, es_terminado, stock_vitrina",
        stock_vitrina: "producto_id, cantidad, updated_at",
        recetas: "id, producto_id, materia_prima_id, sync_status",
        sync_queue: "++id, estado, timestamp, accion, action, synced"
      })
      .upgrade(async (tx) => {
        const productos = await tx.table<Producto, string>("productos").toArray();
        const stockTable = tx.table<StockVitrina, string>("stock_vitrina");
        const now = Date.now();

        await stockTable.bulkPut(
          productos.map((producto) => ({
            producto_id: producto.id,
            cantidad: Number.isFinite(producto.stock_vitrina) ? producto.stock_vitrina : 0,
            updated_at: now
          }))
        );
      });
  }
}

export const db = new PasteleriaDB();
