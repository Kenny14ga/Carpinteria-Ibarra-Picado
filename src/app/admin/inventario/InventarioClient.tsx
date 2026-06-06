"use client";

import Link from "next/link";
import { Boxes, PackagePlus, ShoppingBag } from "lucide-react";
import { AdminSection, StatusBadge } from "@/components/admin/AdminSection";
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/ui/ResponsiveTable";

export type InventoryRow = {
  id: string;
  sku: string;
  nombre: string;
  tipo: "Producto" | "Material";
  categoria: string;
  cantidad: number;
  unidad: string;
  minimo: number;
  proveedor: string;
  vencimiento: string;
  costo: number;
  estado: "DISPONIBLE" | "STOCK_BAJO" | "AGOTADO" | "POR_VENCER" | "RESERVADO";
};

function statusTone(status: InventoryRow["estado"]) {
  if (status === "DISPONIBLE") return "success";
  if (status === "STOCK_BAJO" || status === "POR_VENCER") return "warning";
  if (status === "RESERVADO") return "info";
  return "danger";
}

function statusLabel(status: InventoryRow["estado"]) {
  const labels = {
    DISPONIBLE: "Disponible",
    STOCK_BAJO: "Stock bajo",
    AGOTADO: "Agotado",
    POR_VENCER: "Revisión próxima",
    RESERVADO: "Reservado"
  };

  return labels[status];
}

type InventarioClientProps = {
  rows: InventoryRow[];
  error: string | null;
};

export function InventarioClient({ rows, error }: InventarioClientProps) {
  const columns: Array<ResponsiveTableColumn<InventoryRow>> = [
    { key: "sku", header: "Codigo / SKU", className: "w-32", cell: (row) => row.sku },
    { key: "nombre", header: "Producto o material", cell: (row) => <span className="font-semibold">{row.nombre}</span> },
    { key: "categoria", header: "Categoria", cell: (row) => row.categoria },
    { key: "cantidad", header: "Cantidad actual", className: "w-36", cell: (row) => `${row.cantidad} ${row.unidad}` },
    { key: "minimo", header: "Stock minimo", className: "w-28", cell: (row) => row.minimo },
    { key: "proveedor", header: "Proveedor", cell: (row) => row.proveedor },
    { key: "vencimiento", header: "Fecha lote", className: "w-32", cell: (row) => row.vencimiento },
    { key: "costo", header: "Costo unitario", className: "w-32", cell: (row) => `C$ ${row.costo.toFixed(2)}` },
    { key: "estado", header: "Estado", className: "w-36", cell: (row) => <StatusBadge label={statusLabel(row.estado)} tone={statusTone(row.estado)} /> }
  ];

  return (
    <AdminSection
      eyebrow="Control de stock"
      title="Inventario"
      description="Tabla operativa para productos terminados, madera, herrajes, consumibles, proveedores y estados."
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/compras" className="btn-secondary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold">
            <ShoppingBag aria-hidden="true" className="h-4 w-4" />
            Compras
          </Link>
          <Link href="/admin/productos" className="btn-secondary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold">
            <PackagePlus aria-hidden="true" className="h-4 w-4" />
            Productos
          </Link>
          <Link href="/admin/materias-primas" className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold">
            <Boxes aria-hidden="true" className="h-4 w-4" />
            Materiales
          </Link>
        </div>
      }
    >
      {error ? <div className="animate-fade-in mb-4 rounded-lg bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{error}</div> : null}
      <ResponsiveTable rows={rows} columns={columns} getRowKey={(row) => row.id} />
    </AdminSection>
  );
}
