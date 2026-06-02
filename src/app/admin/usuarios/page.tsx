import { createClient } from "@supabase/supabase-js";
import { UsuariosClient } from "./UsuariosClient";
import type { Database } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function UsuariosPage() {
  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes("replace-this")) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-[var(--danger)]">
        <div className="glass-card max-w-md rounded-2xl border border-[rgba(180,35,24,0.1)] bg-[var(--danger-bg)] p-6 shadow-sm">
          <p className="font-semibold text-lg">Error de Configuración de Servidor</p>
          <p className="mt-2 text-sm leading-6">
            La variable de entorno <strong>SUPABASE_SERVICE_ROLE_KEY</strong> no está configurada o contiene el valor por defecto. 
            Es requerida en el servidor para acceder a la API de administración de Supabase sin desloguear usuarios.
          </p>
        </div>
      </div>
    );
  }

  try {
    // Instanciar cliente administrador para obtener la lista de usuarios de Auth
    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    const initialError = error ? `Error al cargar usuarios de Supabase: ${error.message}` : null;

    return (
      <UsuariosClient initialUsers={users || []} initialError={initialError} />
    );
  } catch (err) {
    console.error("[UsuariosPage] Error loading users:", err);
    return (
      <UsuariosClient 
        initialUsers={[]} 
        initialError={err instanceof Error ? err.message : "Error al conectar con la API de administración."} 
      />
    );
  }
}
