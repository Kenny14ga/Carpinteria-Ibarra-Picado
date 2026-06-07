import { createBrowserClient } from "@supabase/ssr";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TransaccionSyncTable = {
  Row: {
    id: string;
    tipo_accion: string;
    payload: Json;
    creado_en_cliente: string;
    estado: string;
    procesado_en_servidor: string;
  };
  Insert: {
    id?: string;
    tipo_accion: string;
    payload: Json;
    creado_en_cliente: string;
    estado?: string;
    procesado_en_servidor?: string;
  };
  Update: {
    id?: string;
    tipo_accion?: string;
    payload?: Json;
    creado_en_cliente?: string;
    estado?: string;
    procesado_en_servidor?: string;
  };
  Relationships: [];
};

export type PerfilRow = {
  id: string;
  rol: string;
  created_at: string | null;
  updated_at: string | null;
};

type PerfilInsert = {
  id: string;
  rol?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type PerfilUpdate = Partial<PerfilInsert>;

type PerfilesTable = {
  Row: PerfilRow;
  Insert: PerfilInsert;
  Update: PerfilUpdate;
  Relationships: [];
};

export type ProductoRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  imagen_url: string | null;
  alergenos: string[] | null;
  requiere_produccion: boolean | null;
  es_terminado: boolean | null;
  en_vitrina: boolean | null;
  stock_vitrina: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProductoInsert = {
  id?: string;
  nombre: string;
  descripcion?: string | null;
  precio_venta: number;
  imagen_url?: string | null;
  alergenos?: string[] | null;
  requiere_produccion?: boolean | null;
  es_terminado?: boolean | null;
  en_vitrina?: boolean | null;
  stock_vitrina?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProductoUpdate = Partial<ProductoInsert>;

type ProductosTable = {
  Row: ProductoRow;
  Insert: ProductoInsert;
  Update: ProductoUpdate;
  Relationships: [];
};

export type MateriaPrimaRow = {
  id: string;
  sku: string | null;
  nombre: string;
  categoria: string | null;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number | null;
  proveedor: string | null;
  fecha_vencimiento: string | null;
  costo_unitario: number;
  estado: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type MateriaPrimaInsert = {
  id?: string;
  sku?: string | null;
  nombre: string;
  categoria?: string | null;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo?: number | null;
  proveedor?: string | null;
  fecha_vencimiento?: string | null;
  costo_unitario: number;
  estado?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MateriaPrimaUpdate = Partial<MateriaPrimaInsert>;

type MateriasPrimasTable = {
  Row: MateriaPrimaRow;
  Insert: MateriaPrimaInsert;
  Update: MateriaPrimaUpdate;
  Relationships: [];
};

export type RecetaRow = {
  id: string;
  producto_id: string | null;
  nombre: string;
  rendimiento: number | null;
  rendimiento_unidades: number | null;
  costo_estimado: number | null;
  estado: string | null;
  instrucciones: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type RecetaInsert = {
  id?: string;
  producto_id?: string | null;
  nombre: string;
  rendimiento?: number | null;
  rendimiento_unidades?: number | null;
  costo_estimado?: number | null;
  estado?: string | null;
  instrucciones?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RecetaUpdate = Partial<RecetaInsert>;

type RecetasTable = {
  Row: RecetaRow;
  Insert: RecetaInsert;
  Update: RecetaUpdate;
  Relationships: [];
};

export type ProduccionRow = {
  id: string;
  receta_id: string | null;
  producto_id: string | null;
  usuario_id: string | null;
  nombre: string;
  lotes: number | null;
  cantidad_planificada: number;
  cantidad_terminada: number | null;
  estado: string | null;
  fecha_programada: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProduccionInsert = {
  id?: string;
  receta_id?: string | null;
  producto_id?: string | null;
  usuario_id?: string | null;
  nombre: string;
  lotes?: number | null;
  cantidad_planificada: number;
  cantidad_terminada?: number | null;
  estado?: string | null;
  fecha_programada?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProduccionUpdate = Partial<ProduccionInsert>;

type ProduccionTable = {
  Row: ProduccionRow;
  Insert: ProduccionInsert;
  Update: ProduccionUpdate;
  Relationships: [];
};

export type RecetaInsumoRow = {
  id: string;
  receta_id: string;
  materia_prima_id: string;
  cantidad_insumo: number;
  created_at: string | null;
  updated_at: string | null;
};

type RecetaInsumoInsert = {
  id?: string;
  receta_id: string;
  materia_prima_id: string;
  cantidad_insumo: number;
  created_at?: string | null;
  updated_at?: string | null;
};

type RecetaInsumoUpdate = Partial<RecetaInsumoInsert>;

type RecetaInsumosTable = {
  Row: RecetaInsumoRow;
  Insert: RecetaInsumoInsert;
  Update: RecetaInsumoUpdate;
  Relationships: [];
};

export type PedidoClienteRow = {
  id: string;
  cliente_nombre: string;
  telefono: string | null;
  direccion: string | null;
  detalles_personalizados: string | null;
  items: Json;
  total: number;
  estado: string;
  created_at: string;
};

type PedidoClienteInsert = {
  id?: string;
  cliente_nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  detalles_personalizados?: string | null;
  items: Json;
  total: number;
  estado?: string;
  created_at?: string;
};

type PedidoClienteUpdate = Partial<PedidoClienteInsert>;

type PedidosClientesTable = {
  Row: PedidoClienteRow;
  Insert: PedidoClienteInsert;
  Update: PedidoClienteUpdate;
  Relationships: [];
};

type ProcesarProduccionResult = {
  lote_id: string;
  receta_id: string;
  producto_id: string;
  lotes: number;
  unidades_producidas: number;
};

type RecetaRpcResult = {
  ok: boolean;
  message: string;
  costo_estimado?: number;
  action?: "ARCHIVED" | "DELETED";
};

type ReporteFinancieroRpcResult = {
  total_ingresos: number;
  total_costos: number;
  ganancia_neta: number;
  numero_ventas: number;
};

export type Database = {
  public: {
    Tables: {
      perfiles: PerfilesTable;
      materias_primas: MateriasPrimasTable;
      productos: ProductosTable;
      produccion_lotes: ProduccionTable;
      receta_insumos: RecetaInsumosTable;
      recetas: RecetasTable;
      transacciones_sync: TransaccionSyncTable;
      pedidos_clientes: PedidosClientesTable;
    };
    Views: Record<string, never>;
    Functions: {
      procesar_produccion: {
        Args: {
          p_receta_id: string;
          p_lotes: number;
          p_usuario_id: string;
        };
        Returns: ProcesarProduccionResult;
      };
      registrar_compra: {
        Args: {
          p_compra: Json;
        };
        Returns: Json;
      };
      actualizar_receta_completa: {
        Args: {
          p_id: string;
          p_nombre: string;
          p_producto_id: string | null;
          p_rendimiento: number;
          p_rendimiento_unidades: number;
          p_estado: string;
          p_instrucciones: string | null;
          p_insumos: Json;
        };
        Returns: RecetaRpcResult;
      };
      eliminar_receta_segura: {
        Args: {
          p_receta_id: string;
        };
        Returns: RecetaRpcResult;
      };
      obtener_reporte_financiero: {
        Args: {
          p_fecha_inicio: string;
          p_fecha_fin: string;
        };
        Returns: ReporteFinancieroRpcResult;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const fallbackUrl = "https://example.supabase.co";
const fallbackAnonKey = "replace-with-supabase-anon-key";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("tu-proyecto") &&
    !supabaseAnonKey.includes("tu-anon-key") &&
    !supabaseAnonKey.includes("replace")
);

export const supabase = createBrowserClient<Database>(
  supabaseUrl ?? fallbackUrl,
  supabaseAnonKey ?? fallbackAnonKey
);
