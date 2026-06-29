/**
 * MisTareasView — todas las tareas pendientes agrupadas por trabajo.
 *
 * Permite:
 * - Crear tarea nueva desde aquí (modal flotante con selector de trabajo)
 * - Editar descripción/fecha de cualquier tarea en línea
 * - Marcar como completada con un tap
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChecklistPendiente, updateChecklistItem, addChecklistItem, getTrabajos } from "../api/trabajos";
import type { ChecklistItem, Trabajo } from "../api/trabajos";
import { ESTADOS, fmtDate } from "../lib/constants";
import {
  CheckSquare, ChevronRight, Plus, X, Calendar, Search,
} from "lucide-react";

// ── Agrupación ────────────────────────────────────────────────

type Grupo = { trabajo: Trabajo; tareas: ChecklistItem[] };

function agrupar(items: { item: ChecklistItem; trabajo: Trabajo }[]): Grupo[] {
  const map = new Map<string, Grupo>(); // appwrite_id como clave
  for (const { item, trabajo } of items) {
    if (item.completado) continue;
    if (!map.has(trabajo.appwrite_id)) {
      map.set(trabajo.appwrite_id, { trabajo, tareas: [] });
    }
    map.get(trabajo.appwrite_id)!.tareas.push(item);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.trabajo.titulo.localeCompare(b.trabajo.titulo, "es"),
  );
}

// ── Modal: crear tarea nueva ──────────────────────────────────

interface NuevaTareaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function NuevaTareaModal({ open, onClose, onCreated }: NuevaTareaModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [trabajoSel, setTrabajoSel] = useState<Trabajo | null>(null);
  const [desc, setDesc] = useState("");
  const [fecha, setFecha] = useState("");
  const [showFecha, setShowFecha] = useState(false);
  const [error, setError] = useState("");

  const { data: trabajos = [], isLoading } = useQuery({
    queryKey: ["trabajos", "all"],
    queryFn: () => getTrabajos({ limite: 100 }),
    enabled: open,
  });

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return trabajos;
    return trabajos.filter(
      (t) => t.titulo?.toLowerCase().includes(q) || t.cliente_nombre?.toLowerCase().includes(q),
    );
  }, [trabajos, search]);

  const createMutation = useMutation({
    mutationFn: () =>
      addChecklistItem(trabajoSel!.appwrite_id, desc.trim(), fecha || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", "pendiente"] });
      queryClient.invalidateQueries({ queryKey: ["checklist", "conFecha"] });
      onCreated();
      handleClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleClose = () => {
    setSearch("");
    setTrabajoSel(null);
    setDesc("");
    setFecha("");
    setShowFecha(false);
    setError("");
    onClose();
  };

  const handleSubmit = () => {
    if (!trabajoSel) {
      setError("Selecciona un trabajo");
      return;
    }
    if (!desc.trim()) {
      setError("Escribe una descripción");
      return;
    }
    setError("");
    createMutation.mutate();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{
          background: "var(--tg-theme-bg_color)",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "rgba(128,128,128,0.15)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--tg-theme-text_color)" }}>
            Nueva tarea
          </h2>
          <button onClick={handleClose} className="p-1 rounded active:opacity-70"
            style={{ color: "var(--tg-theme-hint_color)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Selector de trabajo */}
          <div>
            <label className="text-xs font-medium mb-1 block"
              style={{ color: "var(--tg-theme-hint_color)" }}>
              Trabajo
            </label>
            {trabajoSel ? (
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate"
                    style={{ color: "var(--tg-theme-text_color)" }}>
                    {trabajoSel.titulo}
                  </p>
                  {trabajoSel.cliente_nombre && (
                    <p className="text-xs truncate"
                      style={{ color: "var(--tg-theme-hint_color)" }}>
                      {trabajoSel.cliente_nombre}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setTrabajoSel(null)}
                  className="p-1 rounded active:opacity-70"
                  style={{ color: "var(--tg-theme-hint_color)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                  style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
                  <Search className="h-4 w-4 flex-shrink-0"
                    style={{ color: "var(--tg-theme-hint_color)" }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar trabajo…"
                    autoFocus
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--tg-theme-text_color)" }}
                  />
                </div>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-center text-xs py-4"
                      style={{ color: "var(--tg-theme-hint_color)" }}>
                      Cargando…
                    </p>
                  ) : filtrados.length === 0 ? (
                    <p className="text-center text-xs py-4"
                      style={{ color: "var(--tg-theme-hint_color)" }}>
                      Sin trabajos
                    </p>
                  ) : (
                    filtrados.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTrabajoSel(t)}
                        className="flex items-center gap-2 p-2.5 rounded-lg text-left active:opacity-70"
                        style={{ background: "var(--tg-theme-secondary_bg_color)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate"
                            style={{ color: "var(--tg-theme-text_color)" }}>
                            {t.titulo}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${(ESTADOS[t.estado] ?? ESTADOS.pendiente).color}`}>
                              {(ESTADOS[t.estado] ?? ESTADOS.pendiente).label}
                            </span>
                            {t.cliente_nombre && (
                              <span className="text-xs truncate"
                                style={{ color: "var(--tg-theme-hint_color)" }}>
                                {t.cliente_nombre}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium mb-1 block"
              style={{ color: "var(--tg-theme-hint_color)" }}>
              Descripción
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              rows={2}
              className="w-full text-sm py-2 px-3 rounded-lg outline-none resize-none"
              style={{
                background: "var(--tg-theme-secondary_bg_color)",
                color: "var(--tg-theme-text_color)",
              }}
            />
          </div>

          {/* Fecha */}
          <div>
            {!showFecha ? (
              <button
                onClick={() => setShowFecha(true)}
                className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg active:opacity-70"
                style={{
                  background: "var(--tg-theme-secondary_bg_color)",
                  color: "var(--tg-theme-hint_color)",
                }}
              >
                <Calendar className="h-4 w-4" />
                Añadir fecha de vencimiento
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="flex-1 text-sm py-2 px-3 rounded-lg outline-none"
                  style={{
                    background: "var(--tg-theme-secondary_bg_color)",
                    color: "var(--tg-theme-text_color)",
                    colorScheme: "light dark",
                  }}
                />
                {fecha && (
                  <button
                    onClick={() => setFecha("")}
                    className="p-2 rounded-lg active:opacity-70"
                    style={{ color: "var(--tg-theme-hint_color)" }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs"
              style={{ color: "var(--tg-theme-destructive_text_color)" }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex gap-2 p-3 border-t"
          style={{ borderColor: "rgba(128,128,128,0.15)" }}>
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium active:opacity-70"
            style={{
              background: "var(--tg-theme-secondary_bg_color)",
              color: "var(--tg-theme-text_color)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold active:opacity-80 disabled:opacity-50"
            style={{
              background: "var(--tg-theme-button_color)",
              color: "var(--tg-theme-button_text_color)",
            }}
          >
            {createMutation.isPending ? "Creando…" : "Crear tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarea editable inline ─────────────────────────────────────

function TareaEditable({
  tarea,
}: {
  tarea: ChecklistItem;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(tarea.descripcion);
  const [editFecha, setEditFecha] = useState(tarea.fecha ?? "");

  const updateMutation = useMutation({
    mutationFn: (data: { descripcion?: string; fecha?: string | null }) =>
      updateChecklistItem(tarea.appwrite_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", "pendiente"] });
      queryClient.invalidateQueries({ queryKey: ["checklist", "conFecha"] });
      setEditing(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => updateChecklistItem(tarea.appwrite_id, { completado: true }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["checklist", "pendiente"] }),
  });

  const handleSave = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    updateMutation.mutate({
      descripcion: trimmed,
      fecha: editFecha || null,
    });
  };

  const handleCancel = () => {
    setEditText(tarea.descripcion);
    setEditFecha(tarea.fecha ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3"
        style={{ background: "var(--tg-theme-bg_color)" }}>
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          autoFocus
          rows={2}
          className="w-full text-sm py-2 px-3 rounded-lg outline-none resize-none"
          style={{
            background: "var(--tg-theme-secondary_bg_color)",
            color: "var(--tg-theme-text_color)",
          }}
        />
        <input
          type="date"
          value={editFecha}
          onChange={(e) => setEditFecha(e.target.value)}
          className="text-xs py-1.5 px-2 rounded-lg outline-none"
          style={{
            background: "var(--tg-theme-secondary_bg_color)",
            color: "var(--tg-theme-text_color)",
            colorScheme: "light dark",
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 py-2 rounded-lg text-xs font-medium active:opacity-70"
            style={{
              background: "var(--tg-theme-secondary_bg_color)",
              color: "var(--tg-theme-text_color)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!editText.trim() || updateMutation.isPending}
            className="flex-1 py-2 rounded-lg text-xs font-semibold active:opacity-80 disabled:opacity-50"
            style={{
              background: "var(--tg-theme-button_color)",
              color: "var(--tg-theme-button_text_color)",
            }}
          >
            {updateMutation.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 active:opacity-70"
      style={{ borderColor: "rgba(128,128,128,0.08)" }}
    >
      {/* Checkbox: marca como completada */}
      <button
        onClick={() => completeMutation.mutate()}
        disabled={completeMutation.isPending}
        className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center cursor-pointer"
        style={{
          borderColor: "var(--tg-theme-hint_color)",
          opacity: completeMutation.isPending ? 0.3 : 0.4,
        }}
        aria-label="Completar tarea"
      />
      {/* Texto: toca para editar */}
      <button
        onClick={() => setEditing(true)}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-sm truncate"
          style={{ color: "var(--tg-theme-text_color)" }}>
          {tarea.descripcion}
        </p>
        {tarea.fecha && (
          <p className="text-xs mt-0.5 flex items-center gap-1"
            style={{ color: "var(--tg-theme-hint_color)" }}>
            <Calendar className="h-3 w-3" />
            {fmtDate(tarea.fecha)}
          </p>
        )}
      </button>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────

interface Props {
  onTrabajoClick: (id: string) => void;
}

export default function MisTareasView({ onTrabajoClick }: Props) {
  const [showModal, setShowModal] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["checklist", "pendiente"],
    queryFn: getChecklistPendiente,
  });

  const grupos = agrupar(items);
  const totalTareas = grupos.reduce((s, g) => s + g.tareas.length, 0);
  const totalTrabajos = grupos.length;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header con botón "+" */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text_color)" }}>
            Mis Tareas
          </h1>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
            {totalTareas} tareas pendientes en {totalTrabajos} trabajos
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70 flex-shrink-0"
          style={{
            background: "var(--tg-theme-button_color)",
            color: "var(--tg-theme-button_text_color)",
          }}
          aria-label="Nueva tarea"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckSquare className="h-12 w-12 mb-3 opacity-20"
            style={{ color: "var(--tg-theme-hint_color)" }} />
          <p className="text-sm font-medium"
            style={{ color: "var(--tg-theme-text_color)" }}>
            ¡Todo al día!
          </p>
          <p className="text-xs mt-1"
            style={{ color: "var(--tg-theme-hint_color)" }}>
            No tienes tareas pendientes
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium active:opacity-80"
            style={{
              background: "var(--tg-theme-button_color)",
              color: "var(--tg-theme-button_text_color)",
            }}
          >
            Crear primera tarea
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((g) => (
            <div
              key={g.trabajo.appwrite_id}
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--tg-theme-secondary_bg_color)" }}
            >
              {/* Cabecera del trabajo: click → abre detalle */}
              <button
                onClick={() => onTrabajoClick(g.trabajo.appwrite_id)}
                className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate"
                      style={{ color: "var(--tg-theme-text_color)" }}>
                      {g.trabajo.titulo}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${(ESTADOS[g.trabajo.estado] ?? ESTADOS.pendiente).color}`}
                    >
                      {(ESTADOS[g.trabajo.estado] ?? ESTADOS.pendiente).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {g.trabajo.cliente_nombre && (
                      <span className="text-xs truncate"
                        style={{ color: "var(--tg-theme-hint_color)" }}>
                        {g.trabajo.cliente_nombre}
                      </span>
                    )}
                    <span className="text-xs font-medium"
                      style={{ color: "var(--tg-theme-accent_text_color)" }}>
                      {g.tareas.length} pendiente{g.tareas.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--tg-theme-hint_color)" }} />
              </button>

              {/* Tareas editables */}
              <div className="border-t" style={{ borderColor: "rgba(128,128,128,0.1)" }}>
                {g.tareas.map((tarea) => (
                  <TareaEditable
                    key={tarea.id}
                    tarea={tarea}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de creación */}
      <NuevaTareaModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          // invalidateQueries ya está en la mutation; este callback es por si
          // quisiéramos hacer algo extra tras crear
        }}
      />
    </div>
  );
}

// Re-export para tests / debug
export { agrupar };