/**
 * Cliente Appwrite único para la Mini App.
 *
 * Estrategia (Junio 2026, post-expiración API key con scope users.write):
 *  - Usamos `setDevKey(API key)` directamente en el cliente.
 *  - NO hacemos `POST /users/{id}/tokens` (no funciona con la key actual).
 *  - NO creamos sesión de usuario real (no la necesitamos para esta app).
 *  - Para crear documentos, los permisos usan `Role.any()` (lectura/escritura
 *    global para esta Mini App de uso interno) + el admin de Franc
 *    hardcodeado por las dudas.
 *
 * Trade-off consciente: cualquier persona con este bundle puede leer y escribir
 * los datos de la app. Como solo la abre Franc desde Telegram (allowlist en
 * config.ts), esto es aceptable. Si en el futuro se quiere abrir a terceros,
 * migrar a Cloud Function + sesión real.
 */

import { Client, Databases, Account, Storage, type Models } from "appwrite";
import { APPWRITE_CONFIG, ADMIN_USER_ID } from "../config";

const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)
  .setDevKey(APPWRITE_CONFIG.apiKey);

/** Databases con API key — leer y escribir colecciones */
export const db = new Databases(client);

/** Storage con API key — bucket de adjuntos */
export const storage = new Storage(client);

/** Account (no se usa actualmente para auth — queda exportado por compatibilidad) */
export const account = new Account(client);

export const DB = APPWRITE_CONFIG.databaseId;

/** ID del operador/admin (Franc) — usado al crear permisos */
export const OPERATOR_USER_ID = ADMIN_USER_ID;

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