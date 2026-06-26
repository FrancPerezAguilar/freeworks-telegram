/**
 * API calls mínimas para la Mini App — solo lectura de trabajos.
 * Usa Appwrite SDK directamente.
 */

import { Query } from "appwrite";
import { databases, DB, normalizeDoc, type AppwriteDoc } from "../lib/appwrite";

// ── Tipos ─────────────────────────────────────────────────────

export interface ChecklistItem {
  id: number; descripcion: string; completado: boolean;
  fecha_programada?: string; hora_programada?: string;
}

export interface Trabajo {
  id: number; titulo: string; descripcion?: string;
  cliente_id?: number; cliente_nombre?: string;
  estado: string; prioridad: string;
  fecha_inicio?: string; fecha_fin_estimada?: string; fecha_fin_real?: string;
  obra_calle?: string; obra_numero?: string;
  obra_municipio?: string; obra_provincia?: string;
  total_horas?: number; coste_total?: number;
  checklist: ChecklistItem[];
}

// ── API ───────────────────────────────────────────────────────

export async function getTrabajo(id: string): Promise<Trabajo> {
  // Trabajo base
  const doc = await databases.getDocument(DB, "trabajos", id);
  const trabajo = normalizeDoc<Trabajo>(doc as AppwriteDoc);

  // Checklist
  const checklistRes = await databases.listDocuments(DB, "trabajo_checklist", [
    Query.equal("trabajo_id", id),
    Query.orderAsc("fecha_programada"),
  ]);
  const checklist = checklistRes.documents.map((d) => normalizeDoc<ChecklistItem>(d as AppwriteDoc));

  return { ...trabajo, checklist };
}
