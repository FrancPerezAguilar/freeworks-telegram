/**
 * TrabajoView — vista detalle editable de un trabajo.
 * Todos los campos visibles y editables. Autosave al perder foco.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTrabajo, updateTrabajo,
  updateChecklistItem, addChecklistItem, deleteChecklistItem,
} from "../api/trabajos";
import type { Trabajo, ChecklistItem } from "../api/trabajos";
import { useTelegramBackButton } from "../lib/TelegramContext";
import {
  ArrowLeft, Check, Clock, Plus, Trash2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────

function toInputDate(d?: string): string {
  if (!d) return "";
  return d.length === 10 ? d : d.slice(0, 10);
}

// ── Field (click-to-edit) ─────────────────────────────────────

function Field({ label, value, onChange, onBlur, type = "text", multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline) (inputRef.current as HTMLInputElement).select();
    }
  }, [editing, multiline]);

  const handleBlur = () => {
    setEditing(false);
    onBlur?.();
  };

  const display = value || placeholder || "—";
  const isEmpty = !value;

  if (!editing) {
    const Tag = multiline ? "div" : "span";
    return (
      <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => setEditing(true)}>
        <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>{label}</span>
        <div className="flex items-center gap-2">
          <Tag
            className={`text-sm py-1.5 px-2 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors ${multiline ? "" : "truncate"}`}
            style={{
              color: isEmpty ? "var(--tg-theme-hint_color)" : "var(--tg-theme-text_color)",
              opacity: isEmpty ? 0.5 : 1,
              background: "var(--tg-theme-secondary_bg_color)",
            }}
          >
            {display}
          </Tag>
          <span className="text-xs opacity-0 group-hover:opacity-40 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }}>✎</span>
        </div>
      </div>
    );
  }

  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: "var(--tg-theme-accent_text_color)" }}>{label}</span>
      <Tag
        ref={inputRef as any}
        type={multiline ? undefined : type}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); } }}
        placeholder={placeholder ?? "—"}
        className="w-full bg-transparent text-sm py-1.5 px-2 rounded-lg outline-none ring-1"
        style={{
          color: "var(--tg-theme-text_color)",
          boxShadow: "0 0 0 1px var(--tg-theme-button_color)",
          resize: multiline ? "vertical" : "none",
        }}
        rows={multiline ? 2 : undefined}
        autoFocus
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange, onBlur }: {
  label: string; value: string; options: Record<string, string>; onChange: (v: string) => void; onBlur?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && selectRef.current) selectRef.current.focus();
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    onBlur?.();
  };

  if (!editing) {
    const display = options[value] ?? value;
    return (
      <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => setEditing(true)}>
        <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm py-1.5 px-2 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors truncate"
            style={{ color: "var(--tg-theme-text_color)", background: "var(--tg-theme-secondary_bg_color)" }}>
            {display}
          </span>
          <span className="text-xs opacity-0 group-hover:opacity-40 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }}>✎</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: "var(--tg-theme-accent_text_color)" }}>{label}</span>
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setEditing(false); }}
        onBlur={handleBlur}
        className="w-full bg-transparent text-sm py-1.5 px-2 rounded-lg outline-none ring-1"
        style={{ color: "var(--tg-theme-text_color)", boxShadow: "0 0 0 1px var(--tg-theme-button_color)" }}
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </div>
  );
}

// ── Vista ─────────────────────────────────────────────────────

interface Props {
  trabajoId?: string;
  onBack?: () => void;
}

export default function TrabajoView({ trabajoId, onBack }: Props) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<Partial<Trabajo> | null>(null);
  const [newTarea, setNewTarea] = useState("");
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useTelegramBackButton(!onBack);

  const { data: trabajo, isLoading, error } = useQuery({
    queryKey: ["trabajo", trabajoId],
    queryFn: () => getTrabajo(trabajoId!),
    enabled: !!trabajoId,
  });

  // Sync remote → local
  useEffect(() => {
    if (trabajo && !local) setLocal({ ...trabajo });
  }, [trabajo, local]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Trabajo>) => updateTrabajo(trabajoId!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] }),
  });

  const saveField = useCallback((field: string, value: unknown) => {
    if (!trabajoId) return;

    if (saveTimers.current[field]) clearTimeout(saveTimers.current[field]);
    saveTimers.current[field] = setTimeout(async () => {
      try {
        await updateMutation.mutateAsync({ [field]: value } as Partial<Trabajo>);
      } catch { /* noop */ }
    }, 600);
  }, [trabajoId, updateMutation]);

  const updateLocal = useCallback((field: string, value: unknown) => {
    setLocal((prev) => prev ? { ...prev, [field]: value } : prev);
    saveField(field, value);
  }, [saveField]);

  // Checklist mutations
  const toggleChecklist = useCallback(async (item: ChecklistItem) => {
    if (!item.appwrite_id) return;
    const newVal = !item.completado;
    // Optimistic
    setLocal((prev) => {
      if (!prev?.checklist) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map((c) =>
          c.id === item.id ? { ...c, completado: newVal } : c
        ),
      };
    });
    await updateChecklistItem(item.appwrite_id, { completado: newVal });
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  }, [trabajoId, queryClient]);

  const handleAddTarea = useCallback(async () => {
    if (!newTarea.trim() || !trabajoId) return;
    await addChecklistItem(trabajoId, newTarea.trim());
    setNewTarea("");
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  }, [newTarea, trabajoId, queryClient]);

  const handleDeleteTarea = useCallback(async (item: ChecklistItem) => {
    if (!item.appwrite_id) return;
    await deleteChecklistItem(item.appwrite_id);
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  }, [trabajoId, queryClient]);

  // ── Render ──────────────────────────────────────────────────

  if (!trabajoId) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>Selecciona un trabajo</p>
      </div>
    );
  }

  if (isLoading || !local) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
          <p className="text-sm font-medium">Error al cargar</p>
          <p className="text-xs mt-1">El trabajo no existe o no se puede acceder</p>
        </div>
      </div>
    );
  }

  const checklist = local.checklist ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header + back */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="active:opacity-70">
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--tg-theme-link_color)" }} />
          </button>
        )}
        <h1 className="text-lg font-bold flex-1" style={{ color: "var(--tg-theme-text_color)" }}>
          {local.titulo || "Sin título"}
        </h1>
      </div>

      {/* ── Básicos ── */}
      <Field label="Título" value={local.titulo ?? ""} onChange={(v) => updateLocal("titulo", v)} />
      <Field label="Descripción" value={local.descripcion ?? ""} onChange={(v) => updateLocal("descripcion", v)} multiline />
      <Field label="Código" value={local.codigo_trabajo ?? ""} onChange={(v) => updateLocal("codigo_trabajo", v)} />

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Estado" value={local.estado ?? "pendiente"}
          options={{ pendiente: "Pendiente", en_curso: "En curso", completado: "Completado", cancelado: "Cancelado" }}
          onChange={(v) => updateLocal("estado", v)} />
        <SelectField label="Prioridad" value={local.prioridad ?? "media"}
          options={{ baja: "Baja", media: "Media", alta: "Alta", urgente: "Urgente" }}
          onChange={(v) => updateLocal("prioridad", v)} />
      </div>

      {/* ── Cliente ── */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Cliente</span>
        <div className="mt-2 flex flex-col gap-2">
          <Field label="Nombre" value={local.cliente_nombre ?? ""} onChange={(v) => updateLocal("cliente_nombre", v)} />
        </div>
      </div>

      {/* ── Fechas ── */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Fechas</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="Inicio" type="date" value={toInputDate(local.fecha_inicio)} onChange={(v) => updateLocal("fecha_inicio", v)} />
          <Field label="Fin estimado" type="date" value={toInputDate(local.fecha_fin_estimada)} onChange={(v) => updateLocal("fecha_fin_estimada", v)} />
          <Field label="Fin real" type="date" value={toInputDate(local.fecha_fin_real)} onChange={(v) => updateLocal("fecha_fin_real", v)} />
        </div>
      </div>

      {/* ── Dirección obra ── */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Dirección de obra</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="Calle" value={local.obra_calle ?? ""} onChange={(v) => updateLocal("obra_calle", v)} />
          <Field label="Número" value={local.obra_numero ?? ""} onChange={(v) => updateLocal("obra_numero", v)} />
          <Field label="Municipio" value={local.obra_municipio ?? ""} onChange={(v) => updateLocal("obra_municipio", v)} />
          <Field label="Provincia" value={local.obra_provincia ?? ""} onChange={(v) => updateLocal("obra_provincia", v)} />
        </div>
      </div>

      {/* ── Costes ── */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Costes</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="Total horas" type="number" value={local.total_horas?.toString() ?? ""} onChange={(v) => updateLocal("total_horas", parseFloat(v) || 0)} />
          <Field label="Coste total (€)" type="number" value={local.coste_total?.toString() ?? ""} onChange={(v) => updateLocal("coste_total", parseFloat(v) || 0)} />
        </div>
      </div>

      {/* ── Notas ── */}
      <Field label="Notas" value={local.notas ?? ""} onChange={(v) => updateLocal("notas", v)} multiline />

      {/* ── Checklist ── */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>
            Checklist ({checklist.filter(c => c.completado).length}/{checklist.length})
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleChecklist(item)}
                className="flex-shrink-0 p-0.5 rounded"
                style={{ color: item.completado ? "#10b981" : "var(--tg-theme-hint_color)" }}
              >
                {item.completado ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </button>
              <span
                className={`flex-1 text-sm ${item.completado ? "line-through opacity-60" : ""}`}
                style={{ color: item.completado ? "var(--tg-theme-hint_color)" : "var(--tg-theme-text_color)" }}
              >
                {item.descripcion}
              </span>
              <button onClick={() => handleDeleteTarea(item)} className="opacity-0 group-hover:opacity-100 active:opacity-100 p-0.5"
                style={{ color: "var(--tg-theme-destructive_text_color)" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {/* Add new */}
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={newTarea}
              onChange={(e) => setNewTarea(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTarea(); }}
              placeholder="Nueva tarea…"
              className="flex-1 bg-transparent text-sm py-1 px-2 rounded-lg outline-none border"
              style={{ borderColor: "var(--tg-theme-hint_color)", opacity: 0.4, color: "var(--tg-theme-text_color)" }}
            />
            <button onClick={handleAddTarea} disabled={!newTarea.trim()}
              className="p-1 rounded-lg" style={{ background: "var(--tg-theme-button_color)", opacity: newTarea.trim() ? 1 : 0.4 }}>
              <Plus className="h-4 w-4" style={{ color: "var(--tg-theme-button_text_color)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Save indicator */}
      <div className="text-center text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>
        Los cambios se guardan automáticamente al salir del campo
      </div>
    </div>
  );
}
