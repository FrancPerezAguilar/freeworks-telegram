import { Client, Databases, type Models } from "appwrite";
import { APPWRITE_CONFIG } from "../config";

const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)
  .setDevKey(APPWRITE_CONFIG.apiKey);

export const databases = new Databases(client);
export const DB = APPWRITE_CONFIG.databaseId;

/** Tipo base de documento Appwrite */
export type AppwriteDoc = Models.Document & Record<string, unknown>;

/** Convierte un doc Appwrite a un objeto plano con id numérico */
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

/** Hash simple string → number para IDs */
function hashId(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
