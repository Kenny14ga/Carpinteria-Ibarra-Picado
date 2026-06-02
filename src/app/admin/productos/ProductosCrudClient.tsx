"use client";

import { useState, useEffect, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  X
} from "lucide-react";
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/ui/ResponsiveTable";
import type { ProductoRow } from "@/lib/supabase";
import { createProductAction, deleteProductAction, updateProductAction, type ProductActionResult } from "./actions";

type ProductosCrudClientProps = {
  products: ProductoRow[];
  initialError: string | null;
};

type DrawerMode = "create" | "edit";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

function formatAllergens(product: ProductoRow) {
  return product.alergenos?.length ? product.alergenos.join(", ") : "";
}

function ProductPhoto({ product }: { product: ProductoRow }) {
  if (!product.imagen_url) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#FFF9F5]">
        <ImageIcon aria-hidden="true" className="h-5 w-5 text-[#F48CAA]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Miniatura remota simple dentro de una tabla administrativa.
    <img
      src={product.imagen_url}
      alt={product.nombre}
      className="h-12 w-12 rounded-md object-cover"
    />
  );
}

function Alert({ result }: { result: ProductActionResult | null }) {
  if (!result) {
    return null;
  }

  const Icon = result.ok ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm font-medium ${
        result.ok ? "status-success" : "status-danger"
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{result.message}</span>
    </div>
  );
}

export function ProductosCrudClient({ products, initialError }: ProductosCrudClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [selectedProduct, setSelectedProduct] = useState<ProductoRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [alert, setAlert] = useState<ProductActionResult | null>(
    initialError ? { ok: false, message: initialError } : null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [imagenUrl, setImagenUrl] = useState<string>("");
  const [isCompresing, setIsCompresing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  function compressAndSetImage(file: File) {
    setIsCompresing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setImagenUrl(dataUrl);
        }
        setIsCompresing(false);
      };
      img.onerror = () => {
        setIsCompresing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsCompresing(false);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!isDrawerOpen) return;

    function handleGlobalPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            compressAndSetImage(file);
          }
        }
      }
    }

    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [isDrawerOpen]);

  function handleDrag(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        compressAndSetImage(file);
      }
    }
  }

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedProduct(null);
    setImagenUrl("");
    setAlert(null);
    setIsDrawerOpen(true);
  }

  function openEditDrawer(product: ProductoRow) {
    setDrawerMode("edit");
    setSelectedProduct(product);
    setImagenUrl(product.imagen_url ?? "");
    setAlert(null);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setSelectedProduct(null);
    setImagenUrl("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const action = drawerMode === "edit" ? updateProductAction : createProductAction;

    startTransition(async () => {
      const result = await action(formData);
      setAlert(result);

      if (result.ok) {
        closeDrawer();
        router.refresh();
      }
    });
  }

  function handleDelete(product: ProductoRow) {
    const shouldDelete = window.confirm(`Eliminar ${product.nombre}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingId(product.id);
    setAlert(null);

    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      setAlert(result);
      setDeletingId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function handleShare(product: ProductoRow) {
    if (typeof window === "undefined") return;

    const catalogUrl = `${window.location.origin}/catalogo?q=${encodeURIComponent(product.nombre)}`;
    const title = `Riquiquísimo - ${product.nombre}`;
    const text = `¡Mira nuestro delicioso producto: ${product.nombre}! Recién horneado y disponible hoy en Riquiquísimo. 🎂✨`;

    if (navigator.share) {
      navigator.share({
        title,
        text,
        url: catalogUrl
      }).catch((error) => {
        console.log("Error sharing:", error);
      });
    } else {
      navigator.clipboard.writeText(catalogUrl)
        .then(() => {
          setAlert({
            ok: true,
            message: "¡Enlace del producto en catálogo copiado al portapapeles!"
          });
        })
        .catch(() => {
          setAlert({
            ok: false,
            message: "No se pudo copiar el enlace al portapapeles."
          });
        });
    }
  }

  const columns: Array<ResponsiveTableColumn<ProductoRow>> = [
    {
      key: "producto",
      header: "Producto",
      cell: (product) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductPhoto product={product} />
          <div className="min-w-0">
              <p className="truncate font-semibold text-[#4A2B32]">{product.nombre}</p>
              <p className="mt-1 line-clamp-1 text-xs text-[#6F4A52]">{product.descripcion || "Sin descripcion"}</p>
          </div>
        </div>
      )
    },
    {
      key: "precio",
      header: "Precio",
      className: "w-32",
      cell: (product) => <span className="font-semibold text-[#8B2E54]">{formatCurrency(product.precio_venta)}</span>
    },
    {
      key: "stock",
      header: "Stock",
      className: "w-28",
      cell: (product) => product.stock_vitrina ?? 0
    },
    {
      key: "estado",
      header: "Vitrina",
      className: "w-32",
      cell: (product) => (
        <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
            product.en_vitrina ? "status-success" : "status-brand"
          }`}
        >
          {product.en_vitrina ? "Visible" : "Oculto"}
        </span>
      )
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "w-48 text-right",
      cell: (product) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            title="Anunciar en redes"
            onClick={() => handleShare(product)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#F2D6DE] text-[#6F4A52] transition hover:bg-[#FFF9F5] hover:text-[#4A2B32] focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
          >
            <Share2 aria-hidden="true" className="h-4 w-4 text-[var(--brand)]" />
            <span className="sr-only">Anunciar en redes</span>
          </button>
          <button
            type="button"
            title="Editar producto"
            onClick={() => openEditDrawer(product)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#F2D6DE] text-[#6F4A52] transition hover:bg-[#FFF9F5] hover:text-[#4A2B32] focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Editar producto</span>
          </button>
          <button
            type="button"
            title="Eliminar producto"
            onClick={() => handleDelete(product)}
            disabled={deletingId === product.id}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#F2D6DE] text-[#6F4A52] transition hover:border-red-200 hover:bg-red-50 hover:text-[#B42318] focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingId === product.id ? (
              <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            )}
            <span className="sr-only">Eliminar producto</span>
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
            <p className="text-sm font-medium text-[#8B2E54]">Catalogo de venta</p>
            <h1 className="brand-heading mt-1 text-3xl font-semibold">Productos</h1>
          </div>
          <button
            type="button"
            onClick={openCreateDrawer}
            className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Nuevo producto
          </button>
        </div>
      </header>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#4A2B32]">Catalogo operativo</h2>
            <p className="text-sm text-[#6F4A52]">{products.length} productos registrados</p>
          </div>
          <div className="w-full sm:w-80">
            <Alert result={alert} />
          </div>
        </div>

        <ResponsiveTable
          rows={products}
          columns={columns}
          getRowKey={(product) => product.id}
          emptyState={
            <div>
              <ImageIcon aria-hidden="true" className="mx-auto h-10 w-10 text-[#F48CAA]" />
              <p className="mt-3 text-sm font-semibold text-[#4A2B32]">Sin productos</p>
              <p className="mt-1 text-sm text-[#6F4A52]">Crea el primer producto para vitrina, POS y catalogo.</p>
            </div>
          }
          renderMobileCard={(product) => (
            <div>
              <div className="flex items-start gap-3">
                <ProductPhoto product={product} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#4A2B32]">{product.nombre}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6F4A52]">
                    {product.descripcion || "Sin descripcion"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-[#FFF9F5] p-3">
                  <p className="text-xs font-semibold uppercase text-[#8B2E54]">Precio</p>
                  <p className="mt-1 font-semibold text-[#8B2E54]">{formatCurrency(product.precio_venta)}</p>
                </div>
                <div className="rounded-md bg-[#FFF9F5] p-3">
                  <p className="text-xs font-semibold uppercase text-[#8B2E54]">Stock</p>
                  <p className="mt-1 font-semibold text-[#4A2B32]">{product.stock_vitrina ?? 0}</p>
                </div>
              </div>

              {product.alergenos?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.alergenos.map((allergen) => (
                    <span key={allergen} className="rounded-md bg-[#FDE1E6] px-2.5 py-1 text-xs font-medium text-[#8B2E54]">
                      {allergen}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(product)}
                  className="btn-secondary inline-flex h-11 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
                >
                  <Share2 aria-hidden="true" className="h-4 w-4 text-[var(--brand)]" />
                  Anunciar
                </button>
                <button
                  type="button"
                  onClick={() => openEditDrawer(product)}
                  className="btn-secondary inline-flex h-11 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(product)}
                  disabled={deletingId === product.id}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-red-200 text-xs font-semibold text-[#B42318] transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === product.id ? (
                    <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          )}
        />
      </section>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar formulario"
            onClick={closeDrawer}
            className="absolute inset-0 bg-[#4A2B32]/40"
          />

          <aside className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-md bg-white shadow-soft md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[30rem] md:max-h-none md:rounded-none">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F2D6DE] bg-white px-4 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#4A2B32]">
                  {drawerMode === "edit" ? "Editar producto" : "Nuevo producto"}
                </h2>
                <p className="text-sm text-[#6F4A52]">Datos listos para catalogo, vitrina y POS.</p>
              </div>
              <button
                type="button"
                title="Cerrar"
                onClick={closeDrawer}
                className="flex h-10 w-10 items-center justify-center rounded-md text-[#6F4A52] transition hover:bg-[#FFF9F5] hover:text-[#4A2B32] focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2"
              >
                <X aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </button>
            </div>

            <form key={selectedProduct?.id ?? "create"} onSubmit={handleSubmit} className="space-y-4 p-4">
              {selectedProduct ? <input type="hidden" name="id" value={selectedProduct.id} /> : null}

              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Nombre</span>
                <input
                  name="nombre"
                  defaultValue={selectedProduct?.nombre ?? ""}
                  required
                  className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Descripcion</span>
                <textarea
                  name="descripcion"
                  defaultValue={selectedProduct?.descripcion ?? ""}
                  rows={4}
                  className="field-control mt-1 w-full resize-none rounded-md px-3 py-2 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Precio</span>
                  <input
                    name="precio_venta"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={selectedProduct?.precio_venta ?? ""}
                    required
                    className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#4A2B32]">Stock</span>
                  <input
                    name="stock_vitrina"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selectedProduct?.stock_vitrina ?? 0}
                    className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm"
                  />
                </label>
              </div>

              <div className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Foto del producto</span>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative mt-2 flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 ${
                    dragActive 
                      ? "border-[var(--brand)] bg-[var(--brand-cream)]/20" 
                      : "border-[var(--border-soft)] bg-[#FFF9F5] hover:border-[var(--brand-pastel)]"
                  }`}
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        compressAndSetImage(e.target.files[0]);
                      }
                    }}
                  />
                  <input type="hidden" name="imagen_url" value={imagenUrl} />
                  
                  {isCompresing ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-[var(--brand)]" />
                      <p className="text-xs font-semibold text-[var(--cacao-light)]">Procesando imagen...</p>
                    </div>
                  ) : imagenUrl ? (
                    <div className="relative group w-full flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagenUrl}
                        alt="Vista previa"
                        className="max-h-40 rounded-lg object-cover shadow-[var(--shadow-sm)]"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagenUrl("");
                        }}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow"
                        title="Eliminar imagen"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <p className="mt-2 text-[0.65rem] text-[var(--cacao-muted)]">
                        Haz clic o arrastra para reemplazar la foto
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="h-8 w-8 text-[var(--brand-pastel)]" />
                      <p className="text-xs font-bold text-[var(--cacao)]">
                        Toma una foto o selecciona un archivo
                      </p>
                      <p className="text-[0.65rem] text-[var(--cacao-muted)] mt-1 max-w-[200px]">
                        En PC puedes pegar una imagen directamente aquí usando <kbd className="bg-white px-1 py-0.5 border border-gray-200 rounded font-mono text-[0.6rem] shadow-xs">Ctrl + V</kbd>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[#4A2B32]">Alergenos</span>
                <input
                  name="alergenos"
                  placeholder="Gluten, leche, huevo"
                  defaultValue={selectedProduct ? formatAllergens(selectedProduct) : ""}
                  className="field-control mt-1 h-11 w-full rounded-md px-3 text-sm placeholder:text-[#B58B96]"
                />
              </label>

              <div className="grid gap-3 rounded-md bg-[#FFF9F5] p-3">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#4A2B32]">Visible en vitrina</span>
                  <input
                    name="en_vitrina"
                    type="checkbox"
                    defaultChecked={selectedProduct?.en_vitrina ?? true}
                    className="h-5 w-5 rounded border-[#F2D6DE] text-[#B83E6C] focus:ring-[#B83E6C]"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#4A2B32]">Requiere produccion</span>
                  <input
                    name="requiere_produccion"
                    type="checkbox"
                    defaultChecked={selectedProduct?.requiere_produccion ?? false}
                    className="h-5 w-5 rounded border-[#F2D6DE] text-[#B83E6C] focus:ring-[#B83E6C]"
                  />
                </label>
              </div>

              <div className="sticky bottom-0 -mx-4 border-t border-[#F2D6DE] bg-white p-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#B83E6C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#D7A1B6]"
                >
                  {isPending ? (
                    <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="h-5 w-5" />
                  )}
                  {isPending ? "Guardando" : "Guardar producto"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
