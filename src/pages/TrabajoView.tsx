/**
 * TrabajoView — vista detalle editable con 4 tabs:
 *   Info | Tiempos | Materiales | Checklist
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTrabajo, updateTrabajo,
  getTiempos, addTiempo, deleteTiempo,
  getMaterialesUsados, addMaterialUsado, deleteMaterialUsado,
  updateChecklistItem, addChecklistItem, deleteChecklistItem,
  getComentarios, addComentario, deleteComentario,
  getAdjuntos, uploadAdjunto, deleteAdjunto,
} from "../api/trabajos";
import type { Trabajo, ChecklistItem } from "../api/trabajos";
import { useTelegramBackButton } from "../lib/TelegramContext";
import {
  ArrowLeft, Info, Hammer, Package, CheckSquare,
  Clock, Plus, Trash2, MessageSquare, Paperclip, FileText,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────

function toInputDate(d?: string): string {
  if (!d) return "";
  return d.length === 10 ? d : d.slice(0, 10);
}

const inputStyle: React.CSSProperties = {
  color: "var(--tg-theme-text_color)",
  boxShadow: "0 0 0 1px var(--tg-theme-button_color)",
  background: "transparent",
  resize: "none",
};

// ── Click-to-edit Field ───────────────────────────────────────

function Field({ label, value, onChange, onBlur, type = "text", multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); if (!multiline) (ref.current as HTMLInputElement).select(); }
  }, [editing, multiline]);

  const display = value || placeholder || "—";
  const isEmpty = !value;

  if (!editing) {
    const Tag = multiline ? "div" : "span";
    return (
      <div className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => setEditing(true)}>
        <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>{label}</span>
        <div className="flex items-center gap-1">
          <Tag className={`text-sm py-1 px-2 rounded-md border border-transparent group-hover:border-gray-200 transition-colors ${multiline ? "whitespace-pre-wrap" : "truncate"}`}
            style={{ color: isEmpty ? "var(--tg-theme-hint_color)" : "var(--tg-theme-text_color)", opacity: isEmpty ? 0.5 : 1, background: "var(--tg-theme-secondary_bg_color)" }}>
            {display}
          </Tag>
          <span className="text-xs opacity-0 group-hover:opacity-30 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }}>✎</span>
        </div>
      </div>
    );
  }

  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium" style={{ color: "var(--tg-theme-accent_text_color)" }}>{label}</span>
      <Tag ref={ref as any} type={multiline ? undefined : type} value={value}
        onChange={(e: any) => onChange(e.target.value)} onBlur={() => { setEditing(false); onBlur?.(); }}
        onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
        placeholder={placeholder ?? "—"}
        className="w-full bg-transparent text-sm py-1 px-2 rounded-md outline-none"
        style={inputStyle} rows={multiline ? 2 : undefined} autoFocus />
    </div>
  );
}

function SelectField({ label, value, options, onChange, onBlur }: {
  label: string; value: string; options: Record<string, string>; onChange: (v: string) => void; onBlur?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <div className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => setEditing(true)}>
        <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm py-1 px-2 rounded-md border border-transparent group-hover:border-gray-200 transition-colors truncate"
            style={{ color: "var(--tg-theme-text_color)", background: "var(--tg-theme-secondary_bg_color)" }}>
            {options[value] ?? value}
          </span>
          <span className="text-xs opacity-0 group-hover:opacity-30 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }}>✎</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium" style={{ color: "var(--tg-theme-accent_text_color)" }}>{label}</span>
      <select value={value} onChange={(e) => { onChange(e.target.value); setEditing(false); }}
        onBlur={() => { setEditing(false); onBlur?.(); }}
        className="w-full bg-transparent text-sm py-1 px-2 rounded-md outline-none"
        style={inputStyle}>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────

type TabId = "info" | "tiempos" | "materiales" | "checklist";

const TABS: { id: TabId; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "info", icon: Info },
  { id: "tiempos", icon: Hammer },
  { id: "materiales", icon: Package },
  { id: "checklist", icon: CheckSquare },
];

function TabBar({ active, onSelect }: { active: TabId; onSelect: (t: TabId) => void }) {
  return (
    <div className="flex border-b" style={{ borderColor: "rgba(128,128,128,0.15)" }}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onSelect(tab.id)}
            className="flex-1 flex justify-center py-2.5 active:opacity-70"
          >
            <span style={{ color: isActive ? "var(--tg-theme-button_color)" : "var(--tg-theme-hint_color)", opacity: isActive ? 1 : 0.5 }}>
            <Icon className="h-5 w-5" />
          </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Sección: Info ─────────────────────────────────────────────

function InfoSection({ local, updateLocal }: {
  local: Partial<Trabajo>; updateLocal: (f: string, v: unknown) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
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
      <Field label="Cliente" value={local.cliente_nombre ?? ""} onChange={(v) => updateLocal("cliente_nombre", v)} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fecha inicio" type="date" value={toInputDate(local.fecha_inicio)} onChange={(v) => updateLocal("fecha_inicio", v)} />
        <Field label="Fin estimado" type="date" value={toInputDate(local.fecha_fin_estimada)} onChange={(v) => updateLocal("fecha_fin_estimada", v)} />
        <Field label="Fin real" type="date" value={toInputDate(local.fecha_fin_real)} onChange={(v) => updateLocal("fecha_fin_real", v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Calle" value={local.obra_calle ?? ""} onChange={(v) => updateLocal("obra_calle", v)} />
        <Field label="Número" value={local.obra_numero ?? ""} onChange={(v) => updateLocal("obra_numero", v)} />
        <Field label="Municipio" value={local.obra_municipio ?? ""} onChange={(v) => updateLocal("obra_municipio", v)} />
        <Field label="Provincia" value={local.obra_provincia ?? ""} onChange={(v) => updateLocal("obra_provincia", v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Total horas" type="number" value={local.total_horas?.toString() ?? ""} onChange={(v) => updateLocal("total_horas", parseFloat(v) || 0)} />
        <Field label="Coste total (€)" type="number" value={local.coste_total?.toString() ?? ""} onChange={(v) => updateLocal("coste_total", parseFloat(v) || 0)} />
      </div>
      {/* ── Comentarios dentro de Info ── */}
      <ComentariosSection trabajoId={local.appwrite_id ?? ""} />
      <AdjuntosSection trabajoId={local.appwrite_id ?? ""} />
    </div>
  );
}

// ── Sección: Comentarios ──────────────────────────────────────

function ComentariosSection({ trabajoId }: { trabajoId: string }) {
  const queryClient = useQueryClient();

  const { data: comentarios = [] } = useQuery({
    queryKey: ["comentarios", trabajoId],
    queryFn: () => getComentarios("trabajo", trabajoId),
    enabled: !!trabajoId,
  });

  return (
    <div className="rounded-xl p-3 mt-1" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-4 w-4" style={{ color: "var(--tg-theme-accent_text_color)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Comentarios</span>
        {comentarios.length > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: 0.8 }}>
            {comentarios.length}
          </span>
        )}
      </div>

      {/* Lista */}
      {comentarios.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {comentarios.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--tg-theme-text_color)" }}>{c.contenido}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint_color)" }}>
                  {c.autor || "Usuario"} · {c.fecha ? new Date(c.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
              <button onClick={() => { deleteComentario(c.appwrite_id); queryClient.invalidateQueries({ queryKey: ["comentarios", trabajoId] }); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 flex-shrink-0" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Input movido a la barra inferior */}
    </div>
  );
}

// ── Sección: Adjuntos ────────────────────────────────────────

function AdjuntosSection({ trabajoId }: { trabajoId: string }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: adjuntos = [] } = useQuery({
    queryKey: ["adjuntos", trabajoId],
    queryFn: () => getAdjuntos("trabajo", trabajoId),
    enabled: !!trabajoId,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAdjunto("trabajo", trabajoId, file);
    queryClient.invalidateQueries({ queryKey: ["adjuntos", trabajoId] });
    if (fileRef.current) fileRef.current.value = "";
  };

  const esImagen = (tipo?: string) => tipo === "foto";

  return (
    <div className="rounded-xl p-3 mt-1" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" style={{ color: "var(--tg-theme-accent_text_color)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Adjuntos</span>
          {adjuntos.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: 0.8 }}>
              {adjuntos.length}
            </span>
          )}
        </div>
        <button onClick={() => fileRef.current?.click()} className="p-1 rounded-md active:opacity-70"
          style={{ color: "var(--tg-theme-button_color)" }}>
          <Plus className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
      </div>

      {adjuntos.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.4 }}>Sin archivos adjuntos</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {adjuntos.map((a) => (
            <div key={a.id}
              className="relative group rounded-lg overflow-hidden cursor-pointer active:opacity-90"
              style={{ background: "var(--tg-theme-bg_color)" }}
              onClick={() => esImagen(a.tipo) ? setPreviewUrl(a.url ?? null) : window.open(a.url, "_blank")}
            >
              {esImagen(a.tipo) && a.url ? (
                <div className="aspect-square">
                  <img src={a.url} alt={a.nombre} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3">
                  <span style={{ color: "var(--tg-theme-accent_text_color)" }}>
                    {a.tipo === "pdf" ? <FileText className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "var(--tg-theme-text_color)" }}>{a.nombre}</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-xs truncate text-white/90">{a.nombre}</p>
                {a.tamano && (
                  <p className="text-xs text-white/60">
                    {a.tamano > 1024 * 1024 ? `${(a.tamano / (1024 * 1024)).toFixed(1)} MB` : `${(a.tamano / 1024).toFixed(1)} KB`}
                  </p>
                )}
              </div>
              <button onClick={(ev) => { ev.stopPropagation(); deleteAdjunto(a.appwrite_id); queryClient.invalidateQueries({ queryKey: ["adjuntos", trabajoId] }); }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "white" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox preview */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewUrl(null)}>
          <button onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white active:opacity-70">
            ✕
          </button>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}


// ── Sección: Tiempos ──────────────────────────────────────────

function TiemposSection({ trabajoId }: { trabajoId: string }) {
  const queryClient = useQueryClient();
  const [horas, setHoras] = useState("");
  const [desc, setDesc] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  const { data: tiempos = [], isLoading } = useQuery({
    queryKey: ["tiempos", trabajoId],
    queryFn: () => getTiempos(trabajoId),
    enabled: !!trabajoId,
  });

  const handleAdd = async () => {
    if (!horas) return;
    await addTiempo(trabajoId, { horas: parseFloat(horas), descripcion: desc || undefined, fecha });
    setHoras(""); setDesc("");
    queryClient.invalidateQueries({ queryKey: ["tiempos", trabajoId] });
  };

  if (isLoading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" /></div>;

  const total = tiempos.reduce((s, t) => s + (t.horas ?? 0), 0);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Add form */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input type="number" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="Horas"
            className="bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
          <button onClick={handleAdd} disabled={!horas}
            className="text-sm py-1 px-3 rounded-md font-medium"
            style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: horas ? 1 : 0.4 }}>
            + Añadir
          </button>
        </div>
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción del trabajo realizado…"
          className="w-full bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
      </div>

      {/* List */}
      {tiempos.length === 0 ? (
        <p className="text-center text-sm py-4" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }}>Sin registros de tiempo</p>
      ) : (
        <div className="flex flex-col gap-1">
          {tiempos.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg group"
              style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
              <div className="w-12 text-center flex-shrink-0">
                <span className="text-sm font-bold" style={{ color: "var(--tg-theme-text_color)" }}>{t.horas}h</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--tg-theme-text_color)" }}>{t.descripcion || "Sin descripción"}</p>
                <p className="text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>{t.fecha}</p>
              </div>
              <button onClick={() => { deleteTiempo(t.appwrite_id); queryClient.invalidateQueries({ queryKey: ["tiempos", trabajoId] }); }}
                className="opacity-0 group-hover:opacity-100 p-1" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {total > 0 && <p className="text-xs text-right" style={{ color: "var(--tg-theme-hint_color)" }}>Total: {total}h</p>}
    </div>
  );
}

// ── Sección: Materiales ───────────────────────────────────────

function MaterialesSection({ trabajoId }: { trabajoId: string }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");

  const { data: materiales = [], isLoading } = useQuery({
    queryKey: ["materiales", trabajoId],
    queryFn: () => getMaterialesUsados(trabajoId),
    enabled: !!trabajoId,
  });

  const handleAdd = async () => {
    if (!nombre) return;
    await addMaterialUsado(trabajoId, {
      nombre, cantidad: parseFloat(cantidad) || undefined,
      precio_unitario: parseFloat(precio) || undefined,
    });
    setNombre(""); setCantidad(""); setPrecio("");
    queryClient.invalidateQueries({ queryKey: ["materiales", trabajoId] });
  };

  if (isLoading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" /></div>;

  const total = materiales.reduce((s, m) => s + (m.importe ?? 0), 0);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Add form */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <div className="flex gap-2 mb-2">
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Material"
            className="flex-1 bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
          <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Cant."
            className="w-20 bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
          <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="€/ud"
            className="w-20 bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
          <button onClick={handleAdd} disabled={!nombre}
            className="text-sm py-1 px-3 rounded-md font-medium flex-shrink-0"
            style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: nombre ? 1 : 0.4 }}>
            + Añadir
          </button>
        </div>
      </div>

      {materiales.length === 0 ? (
        <p className="text-center text-sm py-4" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }}>Sin materiales registrados</p>
      ) : (
        <div className="flex flex-col gap-1">
          {materiales.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg group"
              style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
              <Package className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--tg-theme-text_color)" }}>{m.nombre}</p>
                <p className="text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>
                  {m.cantidad} × {m.precio_unitario?.toFixed(2)}€ = {m.importe?.toFixed(2)}€
                </p>
              </div>
              <button onClick={() => { deleteMaterialUsado(m.appwrite_id); queryClient.invalidateQueries({ queryKey: ["materiales", trabajoId] }); }}
                className="opacity-0 group-hover:opacity-100 p-1" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {total > 0 && <p className="text-xs text-right" style={{ color: "var(--tg-theme-hint_color)" }}>Total materiales: {total.toFixed(2)}€</p>}
    </div>
  );
}

// ── Sección: Checklist ────────────────────────────────────────

function ChecklistSection({ trabajoId }: { trabajoId: string }) {
  const queryClient = useQueryClient();
  const [desc, setDesc] = useState("");
  const [fecha, setFecha] = useState("");

  const { data: trabajo } = useQuery({
    queryKey: ["trabajo", trabajoId],
    queryFn: () => getTrabajo(trabajoId),
    enabled: !!trabajoId,
  });

  const checklist = trabajo?.checklist ?? [];

  const handleAdd = async () => {
    if (!desc.trim()) return;
    await addChecklistItem(trabajoId, desc.trim());
    setDesc(""); setFecha("");
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  };

  const toggleItem = async (item: ChecklistItem) => {
    await updateChecklistItem(item.appwrite_id, { completado: !item.completado });
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  };

  const deleteItem = async (item: ChecklistItem) => {
    await deleteChecklistItem(item.appwrite_id);
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  };

  const done = checklist.filter(c => c.completado).length;
  const total = checklist.length;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Add form */}
      <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <div className="flex gap-2">
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Nueva tarea…"
            className="flex-1 bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="w-32 bg-transparent text-sm py-1 px-2 rounded-md outline-none" style={inputStyle} />
          <button onClick={handleAdd} disabled={!desc.trim()}
            className="text-sm py-1 px-3 rounded-md font-medium flex-shrink-0"
            style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: desc.trim() ? 1 : 0.4 }}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: "var(--tg-theme-button_color)" }} />
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>{done}/{total}</span>
        </div>
      )}

      {/* List */}
      {checklist.length === 0 ? (
        <p className="text-center text-sm py-4" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }}>No hay tareas pendientes</p>
      ) : (
        <div className="flex flex-col gap-1">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg group"
              style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
              <button onClick={() => toggleItem(item)} className="flex-shrink-0"
                style={{ color: item.completado ? "#10b981" : "var(--tg-theme-hint_color)" }}>
                <CheckSquare className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${item.completado ? "line-through opacity-50" : ""}`}
                  style={{ color: item.completado ? "var(--tg-theme-hint_color)" : "var(--tg-theme-text_color)" }}>
                  {item.descripcion}
                </span>
                {item.fecha && (
                  <span className="text-xs ml-2" style={{ color: "var(--tg-theme-hint_color)" }}>
                    <Clock className="h-3 w-3 inline mr-0.5" />{item.fecha}
                  </span>
                )}
              </div>
              <button onClick={() => deleteItem(item)}
                className="opacity-0 group-hover:opacity-100 p-1" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────

interface Props { trabajoId?: string; onBack?: () => void; }

export default function TrabajoView({ trabajoId, onBack }: Props) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<Partial<Trabajo> | null>(null);
  const [tab, setTab] = useState<TabId>("info");
  const [comText, setComText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useTelegramBackButton(!onBack);

  const { data: trabajo, isLoading, error } = useQuery({
    queryKey: ["trabajo", trabajoId],
    queryFn: () => getTrabajo(trabajoId!),
    enabled: !!trabajoId,
  });

  useEffect(() => { if (trabajo && !local) setLocal({ ...trabajo }); }, [trabajo, local]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Trabajo>) => updateTrabajo(trabajoId!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] }),
  });

  const saveField = useCallback((field: string, value: unknown) => {
    if (!trabajoId) return;
    if (saveTimers.current[field]) clearTimeout(saveTimers.current[field]);
    saveTimers.current[field] = setTimeout(async () => {
      try { await updateMutation.mutateAsync({ [field]: value } as Partial<Trabajo>); } catch { /* noop */ }
    }, 600);
  }, [trabajoId, updateMutation]);

  const updateLocal = useCallback((field: string, value: unknown) => {
    setLocal((prev) => prev ? { ...prev, [field]: value } : prev);
    saveField(field, value);
  }, [saveField]);

  if (!trabajoId) return <div className="flex h-screen items-center justify-center"><p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>Selecciona un trabajo</p></div>;
  if (isLoading || !local) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600" /></div>;
  if (error) return <div className="flex h-screen items-center justify-center p-4"><div className="text-center" style={{ color: "var(--tg-theme-destructive_text_color)" }}><p className="text-sm font-medium">Error al cargar</p></div></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-1 flex-shrink-0">
        {onBack && <button onClick={onBack} className="active:opacity-70"><ArrowLeft className="h-5 w-5" style={{ color: "var(--tg-theme-link_color)" }} /></button>}
        <h1 className="text-base font-bold truncate flex-1" style={{ color: "var(--tg-theme-text_color)" }}>{local.titulo || "Sin título"}</h1>
      </div>

      {/* Tab bar */}
      <TabBar active={tab} onSelect={setTab} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "info" && <InfoSection local={local} updateLocal={updateLocal} />}
        {tab === "tiempos" && <TiemposSection trabajoId={trabajoId} />}
        {tab === "materiales" && <MaterialesSection trabajoId={trabajoId} />}
        {tab === "checklist" && <ChecklistSection trabajoId={trabajoId} />}
      </div>

      {/* Bottom bar: comentario + adjunto */}
      <div className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0"
        style={{ background: "var(--tg-theme-bg_color)", borderColor: "rgba(128,128,128,0.15)" }}>
        <input type="text" value={comText} onChange={(e) => setComText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && comText.trim()) {
              addComentario("trabajo", trabajoId!, { contenido: comText.trim() });
              setComText("");
              queryClient.invalidateQueries({ queryKey: ["comentarios", trabajoId] });
            }
          }}
          placeholder="Comentario…"
          className="flex-1 bg-transparent text-sm py-2 px-3 rounded-full outline-none"
          style={{ background: "var(--tg-theme-secondary_bg_color)", color: "var(--tg-theme-text_color)" }} />
        <button onClick={() => fileRef.current?.click()}
          className="p-2 rounded-full active:opacity-70 flex-shrink-0"
          style={{ color: "var(--tg-theme-hint_color)" }}>
          <Paperclip className="h-5 w-5" />
        </button>
        <input ref={fileRef} type="file" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !trabajoId) return;
          await uploadAdjunto("trabajo", trabajoId, file);
          queryClient.invalidateQueries({ queryKey: ["adjuntos", trabajoId] });
          if (fileRef.current) fileRef.current.value = "";
        }} className="hidden" />
      </div>
    </div>
  );
}
