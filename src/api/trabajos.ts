/**
 * API calls para la Mini App — Appwrite SDK con sesión de usuario (db).
 */

import { Query, Permission, Role } from "appwrite";
import { db, DB, storage, normalizeDoc, type AppwriteDoc } from "../lib/appwrite";

import { getCurrentUserId } from "../lib/telegramAuth";

/** Genera permisos para el usuario actual + admin (Franc) */
async function getUserPerms(): Promise<string[]> {
  const userId = await getCurrentUserId();
  const base = userId ? [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ] : [
    Permission.read(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.any()),
  ];
  // Añadir a Franc como admin en todos los docs
  base.push(Permission.read(Role.user("6a3abbe6001bea1b9386")));
  base.push(Permission.update(Role.user("6a3abbe6001bea1b9386")));
  base.push(Permission.delete(Role.user("6a3abbe6001bea1b9386")));
  return base;
}

// ── Tipos ─────────────────────────────────────────────────────

export interface ChecklistItem {
  id: number; appwrite_id: string;
  descripcion: string; completado: boolean;
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
  notas?: string; activo?: boolean;
  checklist?: ChecklistItem[];
}

export interface Cliente {
  id: number; appwrite_id: string;
  nombre: string; apellidos?: string;
  telefono_principal?: string; email?: string;
  direccion_calle?: string; direccion_numero?: string;
  direccion_municipio?: string; direccion_provincia?: string;
  estado?: string; activo?: boolean;
  notas?: string;
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
  estado?: string; search?: string; limite?: number;
}): Promise<Trabajo[]> {
  const queries: string[] = [];
  if (params?.estado) queries.push(Query.equal("estado", params.estado));
  if (params?.search) queries.push(Query.search("titulo", params.search));
  queries.push(Query.orderDesc("fecha_inicio"));
  queries.push(Query.limit(params?.limite ?? 50));

  const res = await db.listDocuments(DB, "trabajos", queries);
  return res.documents.map((d) => normalizeDoc<Trabajo>(d as AppwriteDoc));
}

export async function updateTrabajo(id: string, data: Partial<Trabajo>): Promise<void> {
  const { id: _id, appwrite_id: _aid, checklist: _cl, ...payload } = data as Record<string, unknown>;
  void _id; void _aid; void _cl;
  await db.updateDocument(DB, "trabajos", id, payload as Record<string, unknown>);
}

export async function updateChecklistItem(appwriteId: string, data: { completado?: boolean; descripcion?: string }): Promise<void> {
  await db.updateDocument(DB, "trabajo_checklist", appwriteId, data as Record<string, unknown>);
}

export async function addChecklistItem(trabajoId: string, descripcion: string): Promise<void> {
  await db.createDocument(DB, "trabajo_checklist", "unique()", {
    trabajo_id: trabajoId, descripcion, completado: false,
  } as Record<string, unknown>, await getUserPerms());
}

export async function deleteChecklistItem(appwriteId: string): Promise<void> {
  await db.deleteDocument(DB, "trabajo_checklist", appwriteId);
}


// ── Comentarios ───────────────────────────────────────────────

export interface ComentarioItem {
  id: number; appwrite_id: string;
  entity_type: string; entity_id: string;
  contenido: string; autor?: string; fecha?: string;
}

export async function getComentarios(entityType: string, entityId: string): Promise<ComentarioItem[]> {
  const res = await db.listDocuments(DB, "comentarios", [
    Query.equal("entity_type", entityType),
    Query.equal("entity_id", entityId),
    Query.orderAsc("fecha"),
  ]);
  return res.documents.map((d) => normalizeDoc<ComentarioItem>(d as AppwriteDoc));
}

export async function addComentario(entityType: string, entityId: string, data: { contenido: string; autor?: string }): Promise<void> {
  await db.createDocument(DB, "comentarios", "unique()", {
    entity_type: entityType, entity_id: entityId,
    contenido: data.contenido, autor: data.autor ?? "Usuario",
    fecha: new Date().toISOString(),
  } as Record<string, unknown>, await getUserPerms());
}

export async function deleteComentario(appwriteId: string): Promise<void> {
  await db.deleteDocument(DB, "comentarios", appwriteId);
}

// ── Tiempos ───────────────────────────────────────────────────

export interface TiempoItem {
  id: number; appwrite_id: string;
  trabajo_id: string; horas: number;
  descripcion?: string; fecha?: string;
}

export async function getTiempos(trabajoId: string): Promise<TiempoItem[]> {
  const res = await db.listDocuments(DB, "trabajo_tiempos", [
    Query.equal("trabajo_id", trabajoId),
    Query.orderDesc("fecha"),
  ]);
  return res.documents.map((d) => normalizeDoc<TiempoItem>(d as AppwriteDoc));
}

export async function addTiempo(trabajoId: string, data: { horas: number; descripcion?: string; fecha?: string }): Promise<void> {
  await db.createDocument(DB, "trabajo_tiempos", "unique()", {
    trabajo_id: trabajoId, ...data,
  } as Record<string, unknown>, await getUserPerms());
}

export async function deleteTiempo(appwriteId: string): Promise<void> {
  await db.deleteDocument(DB, "trabajo_tiempos", appwriteId);
}

// ── Materiales usados ─────────────────────────────────────────

export interface MaterialUsadoItem {
  id: number; appwrite_id: string;
  trabajo_id: string; nombre: string;
  cantidad?: number; precio_unitario?: number; importe?: number;
}

export async function getMaterialesUsados(trabajoId: string): Promise<MaterialUsadoItem[]> {
  const res = await db.listDocuments(DB, "trabajo_materiales", [
    Query.equal("trabajo_id", trabajoId),
    Query.orderDesc("\$createdAt"),
  ]);
  return res.documents.map((d) => normalizeDoc<MaterialUsadoItem>(d as AppwriteDoc));
}

export async function addMaterialUsado(trabajoId: string, data: {
  nombre: string; cantidad?: number; precio_unitario?: number;
}): Promise<void> {
  const importe = (data.cantidad ?? 0) * (data.precio_unitario ?? 0);
  await db.createDocument(DB, "trabajo_materiales", "unique()", {
    trabajo_id: trabajoId, ...data, importe,
  } as Record<string, unknown>, await getUserPerms());
}

export async function deleteMaterialUsado(appwriteId: string): Promise<void> {
  await db.deleteDocument(DB, "trabajo_materiales", appwriteId);
}

// ── Técnicos ──────────────────────────────────────────────────

export interface TecnicoItem {
  id: number; appwrite_id: string;
  nombre: string; especialidad?: string; activo?: boolean;
}

export async function getTecnicos(): Promise<TecnicoItem[]> {
  const res = await db.listDocuments(DB, "tecnicos", [
    Query.equal("activo", true),
    Query.orderAsc("nombre"),
    Query.limit(50),
  ]);
  return res.documents.map((d) => normalizeDoc<TecnicoItem>(d as AppwriteDoc));
}


// ── Clientes ──────────────────────────────────────────────────

export async function getClientes(search?: string): Promise<Cliente[]> {
  // Fetch all clientes, filter client-side (more reliable than Appwrite fulltext index)
  const res = await db.listDocuments(DB, "clientes", [
    Query.orderAsc("nombre"),
    Query.limit(100),
  ]);
  let clientes = res.documents.map((d) => normalizeDoc<Cliente>(d as AppwriteDoc));
  if (search) {
    const q = search.toLowerCase();
    clientes = clientes.filter((c) => 
      c.nombre.toLowerCase().includes(q) || 
      (c.apellidos ?? "").toLowerCase().includes(q) ||
      (c.direccion_municipio ?? "").toLowerCase().includes(q)
    );
  }
  return clientes;
}

export async function getCliente(id: string): Promise<Cliente> {
  const doc = await db.getDocument(DB, "clientes", id);
  return normalizeDoc<Cliente>(doc as AppwriteDoc);
}

/** Busca trabajos vinculados a un cliente */
export async function getTrabajosDeCliente(clienteId: string): Promise<Trabajo[]> {
  const res = await db.listDocuments(DB, "trabajos", [
    Query.equal("cliente_id", clienteId),
    Query.orderDesc("fecha_inicio"),
    Query.limit(20),
  ]);
  return res.documents.map((d) => normalizeDoc<Trabajo>(d as AppwriteDoc));
}


// ── Adjuntos ──────────────────────────────────────────────────

export interface AdjuntoItem {
  id: number; appwrite_id: string;
  entity_type: string; entity_id: string;
  nombre: string; tipo?: string; tamano?: number; url?: string;
  bucket_file_id?: string;
}

const BUCKET_ID = "adjuntos";

export async function getAdjuntos(entityType: string, entityId: string): Promise<AdjuntoItem[]> {
  const res = await db.listDocuments(DB, "adjuntos", [
    Query.equal("entity_type", entityType),
    Query.equal("entity_id", entityId),
    Query.orderDesc("\$createdAt"),
  ]);
  return res.documents.map((d) => {
    const doc = normalizeDoc<AdjuntoItem>(d as AppwriteDoc);
    // Build public URL
    const bfid = (d as any).bucket_file_id;
    if (bfid) {
      doc.url = `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${bfid}/view?project=6a3a9bfd00036f813523`;
    }
    return doc;
  });
}

export async function uploadAdjunto(entityType: string, entityId: string, file: File): Promise<void> {
  // 1) Upload to Storage
  const uploaded = await storage.createFile(BUCKET_ID, "unique()", file);
  
  // 2) Create metadata in adjuntos collection
  const tipo = file.type.startsWith("image/") ? "foto" 
    : file.type === "application/pdf" ? "pdf" 
    : file.type.startsWith("audio/") ? "audio" 
    : "documento";
  
  await db.createDocument(DB, "adjuntos", "unique()", {
    entity_type: entityType, entity_id: entityId,
    nombre: file.name, tipo, tamano: file.size,
    bucket_file_id: uploaded.$id,
  } as Record<string, unknown>, await getUserPerms());
}

export async function deleteAdjunto(appwriteId: string): Promise<void> {
  // Try to get bucket_file_id before deleting
  try {
    const doc = await db.getDocument(DB, "adjuntos", appwriteId);
    const bfid = (doc as any).bucket_file_id;
    if (bfid) {
      await storage.deleteFile(BUCKET_ID, bfid);
    }
  } catch { /* file already deleted */ }
  await db.deleteDocument(DB, "adjuntos", appwriteId);
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
  // Consultar directamente trabajo_checklist por items NO completados
  const res = await db.listDocuments(DB, "trabajo_checklist", [
    Query.equal("completado", false),
    Query.orderAsc("fecha"),
    Query.limit(50),
  ]);
  const items = res.documents.map((d) => normalizeDoc<ChecklistItem>(d as AppwriteDoc));

  // Agrupar por trabajo_id y cargar los trabajos
  const trabajoIds = [...new Set(items.map((i) => (i as any).trabajo_id as string))];
  const result: { item: ChecklistItem; trabajo: Trabajo }[] = [];

  for (const tid of trabajoIds) {
    try {
      const trabajo = await getTrabajo(tid);
      const tareas = items.filter((i) => (i as any).trabajo_id === tid);
      for (const item of tareas) {
        if (!item.completado) {
          result.push({ item, trabajo });
        }
      }
    } catch { /* skip trabajos sin acceso */ }
  }

  return result.slice(0, 30);
}

/** Checklist items pendientes CON fecha de vencimiento (para la agenda) */
export async function getChecklistConFecha(): Promise<{ item: ChecklistItem; trabajo: Trabajo }[]> {
  const res = await db.listDocuments(DB, "trabajo_checklist", [
    Query.equal("completado", false),
    Query.isNotNull("fecha"),
    Query.orderAsc("fecha"),
    Query.limit(50),
  ]);
  const items = res.documents.map((d) => normalizeDoc<ChecklistItem>(d as AppwriteDoc));

  // Cargar trabajos padre
  const trabajoIds = [...new Set(items.map((i) => (i as any).trabajo_id as string))];
  const trabajoMap = new Map<string, Trabajo>();
  for (const tid of trabajoIds) {
    try { trabajoMap.set(tid, await getTrabajo(tid)); } catch { /* sin acceso */ }
  }

  return items
    .filter((i) => (i as any).trabajo_id && trabajoMap.has((i as any).trabajo_id))
    .map((i) => ({ item: i, trabajo: trabajoMap.get((i as any).trabajo_id)! }));
}
