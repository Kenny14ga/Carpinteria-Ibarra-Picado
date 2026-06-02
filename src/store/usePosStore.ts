"use client";

import { create } from "zustand";
import { db, type Producto, type StockVitrina, type SyncQueueItem } from "@/lib/db";

export type PosCartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
};

type PosProductInput = Pick<Producto, "id" | "nombre" | "precio_venta"> & {
  stock_vitrina: number;
};

type SalePayloadProduct = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type CreateSalePayload = {
  saleId: string;
  products: SalePayloadProduct[];
  total: number;
  timestamp: number;
};

type PosStore = {
  cart: PosCartItem[];
  isCheckingOut: boolean;
  lastSaleId: string | null;
  error: string | null;
  addToCart: (product: PosProductInput) => void;
  decrementFromCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  checkout: () => Promise<string | null>;
};

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function createQueueId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function normalizeStock(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

async function getStockRow(product: Producto): Promise<StockVitrina> {
  const existingStock = await db.stock_vitrina.get(product.id);

  if (existingStock) {
    return existingStock;
  }

  const fallbackStock: StockVitrina = {
    producto_id: product.id,
    cantidad: normalizeStock(product.stock_vitrina),
    updated_at: Date.now()
  };

  await db.stock_vitrina.put(fallbackStock);
  return fallbackStock;
}

export const usePosStore = create<PosStore>((set, get) => ({
  cart: [],
  isCheckingOut: false,
  lastSaleId: null,
  error: null,

  addToCart: (product) => {
    set((state) => {
      const availableStock = normalizeStock(product.stock_vitrina);
      const currentItem = state.cart.find((item) => item.productId === product.id);
      const currentQuantity = currentItem?.quantity ?? 0;

      if (currentQuantity >= availableStock) {
        return {
          error: `Stock maximo para ${product.nombre}: ${availableStock}`
        };
      }

      if (currentItem) {
        return {
          error: null,
          lastSaleId: null,
          cart: state.cart.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1, availableStock }
              : item
          )
        };
      }

      return {
        error: null,
        lastSaleId: null,
        cart: [
          ...state.cart,
          {
            productId: product.id,
            name: product.nombre,
            unitPrice: product.precio_venta,
            quantity: 1,
            availableStock
          }
        ]
      };
    });
  },

  decrementFromCart: (productId) => {
    set((state) => ({
      error: null,
      cart: state.cart
        .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    }));
  },

  removeFromCart: (productId) => {
    set((state) => ({
      error: null,
      cart: state.cart.filter((item) => item.productId !== productId)
    }));
  },

  clearCart: () => {
    set({
      cart: [],
      error: null
    });
  },

  checkout: async () => {
    const cartSnapshot = get().cart;

    if (cartSnapshot.length === 0) {
      return null;
    }

    set({ isCheckingOut: true, error: null });

    try {
      const saleId = createId("sale");
      const timestamp = Date.now();

      await db.transaction("rw", db.stock_vitrina, db.productos, db.sync_queue, async () => {
        const productIds = cartSnapshot.map((item) => item.productId);
        const products = await db.productos.bulkGet(productIds);
        const productsPayload: SalePayloadProduct[] = [];

        for (const item of cartSnapshot) {
          const product = products.find((currentProduct) => currentProduct?.id === item.productId);

          if (!product) {
            throw new Error(`Producto no encontrado: ${item.name}`);
          }

          if (product.es_terminado !== true || product.en_vitrina !== true) {
            throw new Error(`${product.nombre} ya no esta disponible en vitrina.`);
          }

          const stockRow = await getStockRow(product);

          if (item.quantity > stockRow.cantidad) {
            throw new Error(`Stock insuficiente para ${product.nombre}. Disponible: ${stockRow.cantidad}`);
          }

          const nextStock = stockRow.cantidad - item.quantity;
          const subtotal = product.precio_venta * item.quantity;

          await db.stock_vitrina.put({
            producto_id: product.id,
            cantidad: nextStock,
            updated_at: timestamp
          });

          await db.productos.update(product.id, {
            stock_vitrina: nextStock,
            sync_status: "PENDING"
          });

          productsPayload.push({
            id: product.id,
            name: product.nombre,
            quantity: item.quantity,
            unitPrice: product.precio_venta,
            subtotal
          });
        }

        const payload: CreateSalePayload = {
          saleId,
          products: productsPayload,
          total: productsPayload.reduce((total, item) => total + item.subtotal, 0),
          timestamp
        };

        let queueId = createQueueId();

        while (await db.sync_queue.get(queueId)) {
          queueId = createQueueId();
        }

        const queueItem: SyncQueueItem = {
          id: queueId,
          action: "CREATE_SALE",
          accion: "CREATE_SALE",
          payload,
          timestamp,
          synced: false,
          estado: "PENDING"
        };

        await db.sync_queue.add(queueItem);
      });

      set({
        cart: [],
        isCheckingOut: false,
        lastSaleId: saleId,
        error: null
      });

      return saleId;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo procesar la venta.";

      set({
        isCheckingOut: false,
        error: message
      });

      return null;
    }
  }
}));
