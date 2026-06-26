/**
 * API calls para la Mini App — Appwrite SDK con sesión de usuario (db).
 */

import { Query } from "appwrite";
import { db, DB, normalizeDoc, type AppwriteDoc } from "../lib/appwrite";

// ── Tipos ─────────────────────────────────────────────────────

export interface ChecklistItem {
  id: number; descripcion: string; completado: boolean;
  fecha?: string; hora?: string;
}

export interface Trabajo {
  id: number; appwrite_id: string;
  titulo: string; descripcion?: string;
  cliente_id?: string; cliente_nombre?: string;
  estado: string; prioridad: string;
  fecha_inicio?: string; fecha_fin_estimada?: string; fecha_fin_real?: string;
  obra_calle?: string; obra_numero?: string;
  obra_municipio?: string; obra_provincia?: string;
  total_horas?: number; coste_total?: number;
  checklist?: ChecklistItem[];
}

export interface Cliente {
  id: number; nombre: string; apellidos?: string;
  telefono_principal?: string; email?: string;
  direccion_municipio?: string; direccion_provincia?: string;
  estado?: string; activo?: boolean;
}

export interface CalendarioEvento {
  id: number; titulo: string; descripcion?: string;
  fecha_evento: string; hora_evento?: string;
  duracion_min?: number; tipo?: string;
  cliente_nombre?: string; ubicacion?: string;
  color?: string; estado?: string;
}

// ── Trabajos ──────────────────────────────────────────────────

export async function getTrabajo(id: string): Promise<Trabajo> {
  const doc = await db.getDocument(DB, "trabajos", id);
  const trabajo = normalizeDoc<Trabajo>(doc as AppwriteDoc);

  let checklist: ChecklistItem[] = [];
  try {
    const cl = await db.listDocuments(DB, "trabajo_checklist", [
      Query.equal("trabajo_id", id),
      Query.orderAsc("fecha"),
    ]);
    checklist = cl.documents.map((d) => normalizeDoc<ChecklistItem>(d as AppwriteDoc));
  } catch { /* noop */ }

  return { ...trabajo, checklist };
}

export async function getTrabajos(params?: {
  estado?: string; limite?: number;
}): Promise<Trabajo[]> {
  const queries: string[] = [];
  if (params?.estado) queries.push(Query.equal("estado", params.estado));
  queries.push(Query.orderDesc("fecha_inicio"));
  queries.push(Query.limit(params?.limite ?? 20));

  const res = await db.listDocuments(DB, "trabajos", queries);
  return res.documents.map((d) => normalizeDoc<Trabajo>(d as AppwriteDoc));
}

// ── Clientes ──────────────────────────────────────────────────

export async function getClientes(): Promise<Cliente[]> {
  const res = await db.listDocuments(DB, "clientes", [
    Query.equal("activo", true),
    Query.orderAsc("nombre"),
    Query.limit(50),
  ]);
  return res.documents.map((d) => normalizeDoc<Cliente>(d as AppwriteDoc));
}

// ── Calendario ────────────────────────────────────────────────

export async function getEventos(fechaDesde?: string, fechaHasta?: string): Promise<CalendarioEvento[]> {
  const queries: string[] = [];
  if (fechaDesde) queries.push(Query.greaterThanEqual("fecha_evento", fechaDesde));
  if (fechaHasta) queries.push(Query.lessThanEqual("fecha_evento", fechaHasta));
  queries.push(Query.orderAsc("fecha_evento"));
  queries.push(Query.orderAsc("hora_evento"));
  queries.push(Query.limit(50));

  const res = await db.listDocuments(DB, "calendario", queries);
  return res.documents.map((d) => normalizeDoc<CalendarioEvento>(d as AppwriteDoc));
}

// ── Checklist pendiente ───────────────────────────────────────

export async function getChecklistPendiente(): Promise<{ item: ChecklistItem; trabajo: Trabajo }[]> {
  // Solo podemos listar por colección. Listamos trabajos activos y sus checklists.
  const trabajos = await getTrabajos({ estado: "en_curso", limite: 10 });
  const pendientes = await getTrabajos({ estado: "pendiente", limite: 10 });
  const todos = [...trabajos, ...pendientes];

  const result: { item: ChecklistItem; trabajo: Trabajo }[] = [];
  for (const t of todos) {
    const checklist = t.checklist ?? [];
    for (const item of checklist) {
      if (!item.completado) {
        result.push({ item, trabajo: t });
      }
    }
  }
  return result.slice(0, 20);
}
