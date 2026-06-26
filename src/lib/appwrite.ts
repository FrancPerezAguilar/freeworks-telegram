import { Client, Databases, Account, type Models } from "appwrite";
import { APPWRITE_CONFIG } from "../config";

// ── Cliente servidor (API key) ───────────────────────────────
// Para operaciones que requieren permisos elevados (users.*)

const serverClient = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)
  .setDevKey(APPWRITE_CONFIG.apiKey);

/** Databases con API key — para consultas server-side */
export const serverDb = new Databases(serverClient);

// ── Cliente de sesión (sin API key) ──────────────────────────
// Recibe la sesión vía account.createSession(). Una vez autenticado,
// todas las llamadas a databases/storage van con los permisos del usuario.

const sessionClient = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

/** Account — para login/sesión */
export const account = new Account(sessionClient);

/** Databases con sesión de usuario — usar tras authenticateWithTelegram() */
export const db = new Databases(sessionClient);

/** Client expuesto para que telegramAuth pueda crear sesiones */
export { sessionClient };

// ── Re-export ─────────────────────────────────────────────────

export const DB = APPWRITE_CONFIG.databaseId;

export type AppwriteDoc = Models.Document & Record<string, unknown>;

export function normalizeDoc<T>(doc: AppwriteDoc): T & { id: number; appwrite_id: string } {
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  void $permissions; void $databaseId; void $collectionId;
  return {
    ...(rest as Record<string, unknown>),
    id: hashId($id),
    appwrite_id: $id,
    fecha_creacion: $createdAt,
    fecha_modificacion: $updatedAt,
  } as unknown as T & { id: number; appwrite_id: string };
}

function hashId(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
