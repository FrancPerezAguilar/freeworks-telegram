/**
 * Configuración de Free Works para Appwrite.
 *
 * Las credenciales se leen de variables de entorno VITE_APPWRITE_* en `.env.local`
 * (no committeado) o `.env` (committeado solo si no contiene secretos).
 *
 * Para desarrollo rápido sin .env, se mantiene un fallback en este archivo.
 */

export const APPWRITE_CONFIG = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1",
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "6a3a9bfd00036f813523",
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID ?? "freeworks",
  // API key de servidor. Se usa con setDevKey() para bypasear la necesidad de
  // sesión de usuario y no depender de POST /users/{id}/tokens (que requiere
  // scope 'users.write').
  apiKey: import.meta.env.VITE_APPWRITE_API_KEY ?? "",
};

/**
 * Allowlist de Telegram IDs autorizados a usar la Mini App.
 *
 * Flujo: cuando la Mini App abre, lee `Telegram.WebApp.initDataUnsafe.user.id`
 * y solo permite el acceso si está en este set. Si no está, rechaza la entrada.
 *
 * Para añadir un técnico/socio, añadir su Telegram ID numérico al array.
 */
export const ALLOWED_TELEGRAM_IDS: readonly number[] = [
  6341670106, // Franc Pérez — admin
] as const;

/**
 * IDs de Appwrite hardcodeados (operador/admin de la cuenta que se usa al
 * crear documentos — siempre será Franc porque es el único autorizado).
 */
export const ADMIN_USER_ID = "6a3abbe6001bea1b9386";

/**
 * Nombres de las colecciones Appwrite.
 */
export const COLLECTIONS = {
  clientes: "clientes",
  trabajos: "trabajos",
  trabajoChecklist: "trabajo_checklist",
  trabajoTiempos: "trabajo_tiempos",
  trabajoMateriales: "trabajo_materiales",
  materiales: "materiales",
  presupuestos: "presupuestos",
  presupuestoLineas: "presupuesto_lineas",
  facturas: "facturas",
  facturaLineas: "factura_lineas",
  oportunidades: "oportunidades",
  calendario: "calendario",
  tecnicos: "tecnicos",
  comentarios: "comentarios",
  waitlist: "waitlist",
  adjuntos: "adjuntos",
  userTelegram: "user_telegram",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;