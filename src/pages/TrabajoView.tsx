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
  Plus, Trash2, MessageSquare, Paperclip, FileText,
  Calendar as CalendarIcon, MoreHorizontal, Pencil,
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

// ── Address Autocomplete (Photon/OSM) ────────────────────────

interface PhotonFeature {
  properties: {
    name?: string; housenumber?: string; street?: string;
    city?: string; state?: string; country?: string;
  };
}

function AddressAutocomplete({ calle, numero, municipio, provincia, onChange }: {
  calle: string; numero: string; municipio: string; provincia: string;
  onChange: (calle: string, numero: string, municipio: string, provincia: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [editing, setEditing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fullAddress = [calle, numero].filter(Boolean).join(" ") + 
    (municipio ? `, ${municipio}` : "") + 
    (provincia ? `, ${provincia}` : "");

  const search = (q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 3) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=es`);
        const data = await res.json();
        setResults(data.features || []);
        setShowResults(true);
      } catch { setResults([]); }
    }, 300);
  };

  const select = (f: PhotonFeature) => {
    const p = f.properties;
    const c = p.street || p.name || "";
    const n = p.housenumber || "";
    const m = p.city || "";
    const prov = p.state || "";
    onChange(c, n, m, prov);
    setQuery("");
    setResults([]);
    setShowResults(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => setEditing(true)}>
        <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>Dirección de obra</span>
        <div className="flex items-center gap-1">
          <span className="text-sm py-1 px-2 rounded-md border border-transparent group-hover:border-gray-200 transition-colors truncate"
            style={{ color: fullAddress ? "var(--tg-theme-text_color)" : "var(--tg-theme-hint_color)", opacity: fullAddress ? 1 : 0.5, background: "var(--tg-theme-secondary_bg_color)" }}>
            {fullAddress || "—"}
          </span>
          <span className="text-xs opacity-0 group-hover:opacity-30 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }}>✎</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 relative">
      <span className="text-xs font-medium" style={{ color: "var(--tg-theme-accent_text_color)" }}>Dirección de obra</span>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
        onBlur={() => setTimeout(() => { setShowResults(false); setEditing(false); }, 200)}
        onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setShowResults(false); } }}
        placeholder="Busca una dirección…"
        className="w-full bg-transparent text-sm py-1 px-2 rounded-md outline-none"
        style={inputStyle}
        autoFocus
      />
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1"
          style={{ background: "var(--tg-theme-bg_color)", border: "1px solid rgba(128,128,128,0.15)" }}>
          {results.map((f, i) => {
            const p = f.properties;
            const label = [p.street || p.name, p.housenumber].filter(Boolean).join(" ") + 
              (p.city ? `, ${p.city}` : "") + (p.state ? `, ${p.state}` : "");
            return (
              <button key={i} onMouseDown={() => select(f)}
                className="w-full text-left text-sm py-2 px-3 hover:opacity-80 active:opacity-60 border-b last:border-b-0"
                style={{ color: "var(--tg-theme-text_color)", borderColor: "rgba(128,128,128,0.1)" }}>
                {label}
              </button>
            );
          })}
        </div>
      )}
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
      <AddressAutocomplete
        calle={local.obra_calle ?? ""}
        numero={local.obra_numero ?? ""}
        municipio={local.obra_municipio ?? ""}
        provincia={local.obra_provincia ?? ""}
        onChange={(c, n, m, p) => {
          updateLocal("obra_calle", c);
          updateLocal("obra_numero", n);
          updateLocal("obra_municipio", m);
          updateLocal("obra_provincia", p);
        }}
      />
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

  const { data: tiempos = [], isLoading } = useQuery({
    queryKey: ["tiempos", trabajoId],
    queryFn: () => getTiempos(trabajoId),
    enabled: !!trabajoId,
  });

  if (isLoading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" /></div>;

  const total = tiempos.reduce((s, t) => s + (t.horas ?? 0), 0);

  return (
    <div className="flex flex-col gap-3 p-4">
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

  const { data: materiales = [], isLoading } = useQuery({
    queryKey: ["materiales", trabajoId],
    queryFn: () => getMaterialesUsados(trabajoId),
    enabled: !!trabajoId,
  });


  if (isLoading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" /></div>;

  const total = materiales.reduce((s, m) => s + (m.importe ?? 0), 0);

  return (
    <div className="flex flex-col gap-3 p-4">
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const { data: trabajo } = useQuery({
    queryKey: ["trabajo", trabajoId],
    queryFn: () => getTrabajo(trabajoId),
    enabled: !!trabajoId,
  });

  const checklist = trabajo?.checklist ?? [];


  const toggleItem = async (item: ChecklistItem) => {
    await updateChecklistItem(item.appwrite_id, { completado: !item.completado });
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  };

  const deleteItem = async (item: ChecklistItem) => {
    await deleteChecklistItem(item.appwrite_id);
    setMenuOpen(null);
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  };

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.descripcion);
    setEditFecha(item.fecha || "");
    setMenuOpen(null);
  };

  const saveEdit = async (item: ChecklistItem) => {
    if (!editText.trim()) return;
    await updateChecklistItem(item.appwrite_id, { descripcion: editText.trim() });
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] });
  };

  const done = checklist.filter(c => c.completado).length;
  const total = checklist.length;

  return (
    <div className="flex flex-col gap-3 p-4">
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
        <p className="text-center text-sm py-4" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }}>No hay tareas</p>
      ) : (
        <div className="flex flex-col gap-1">
          {checklist.map((item) => (
            <div key={item.id} className="relative">
              {editingId === item.id ? (
                /* ── Edit mode ── */
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
                  <button onClick={() => setEditingId(null)} className="flex-shrink-0"
                    style={{ color: item.completado ? "#10b981" : "var(--tg-theme-hint_color)" }}>
                    <CheckSquare className="h-4 w-4" />
                  </button>
                  <div className="flex-1 flex flex-col gap-1">
                    <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item); if (e.key === "Escape") setEditingId(null); }}
                      className="w-full bg-transparent text-sm py-1 px-2 rounded-md outline-none"
                      style={inputStyle} autoFocus />
                    <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)}
                      className="w-36 bg-transparent text-xs py-1 px-2 rounded-md outline-none"
                      style={inputStyle} />
                  </div>
                  <button onClick={() => saveEdit(item)}
                    className="text-xs px-2 py-1 rounded-md font-medium"
                    style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)" }}>
                    Guardar
                  </button>
                </div>
              ) : (
                /* ── Display mode ── */
                <div className="flex items-center gap-2 p-2 rounded-lg group"
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
                  </div>
                  {item.fecha && (
                    <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }}>
                      <CalendarIcon className="h-3 w-3" />{item.fecha}
                    </span>
                  )}
                  {/* Three-dot menu */}
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 active:opacity-100"
                      style={{ color: "var(--tg-theme-hint_color)" }}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen === item.id && (
                      <div className="absolute right-0 top-full mt-1 rounded-lg shadow-lg py-1 z-20 min-w-[120px]"
                        style={{ background: "var(--tg-theme-bg_color)", border: "1px solid rgba(128,128,128,0.15)" }}>
                        <button onClick={() => startEdit(item)}
                          className="w-full text-left text-sm px-3 py-1.5 active:opacity-70 flex items-center gap-2"
                          style={{ color: "var(--tg-theme-text_color)" }}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button onClick={() => deleteItem(item)}
                          className="w-full text-left text-sm px-3 py-1.5 active:opacity-70 flex items-center gap-2"
                          style={{ color: "var(--tg-theme-destructive_text_color)" }}>
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
  // Form states for tabs
  const [tpoHoras, setTpoHoras] = useState("");
  const [tpoDesc, setTpoDesc] = useState("");
  const [tpoFecha, setTpoFecha] = useState(new Date().toISOString().slice(0, 10));
  const [matNombre, setMatNombre] = useState("");
  const [matCantidad, setMatCantidad] = useState("");
  const [matPrecio, setMatPrecio] = useState("");
  const [tarDesc, setTarDesc] = useState("");
  const [tarFecha, setTarFecha] = useState("");
  const [tarShowDate, setTarShowDate] = useState(false);
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

      {/* Bottom bar — adaptativa según pestaña */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t flex-shrink-0"
        style={{ background: "var(--tg-theme-bg_color)", borderColor: "rgba(128,128,128,0.15)" }}>
        
        {/* Info: comentario + adjunto */}
        {tab === "info" && (
          <>
            <input type="text" value={comText} onChange={(e) => setComText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && comText.trim()) { addComentario("trabajo", trabajoId!, { contenido: comText.trim() }); setComText(""); queryClient.invalidateQueries({ queryKey: ["comentarios", trabajoId] }); } }}
              placeholder="Comentario…"
              className="flex-1 bg-transparent text-sm py-2 px-3 rounded-full outline-none"
              style={{ background: "var(--tg-theme-secondary_bg_color)", color: "var(--tg-theme-text_color)" }} />
            <button onClick={() => fileRef.current?.click()} className="p-2 rounded-full active:opacity-70 flex-shrink-0"
              style={{ color: "var(--tg-theme-hint_color)" }}><Paperclip className="h-5 w-5" /></button>
            <input ref={fileRef} type="file" onChange={async (e) => { const f = e.target.files?.[0]; if (!f || !trabajoId) return; await uploadAdjunto("trabajo", trabajoId, f); queryClient.invalidateQueries({ queryKey: ["adjuntos", trabajoId] }); if (fileRef.current) fileRef.current.value = ""; }} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
          </>
        )}

        {/* Tiempos: horas + fecha + desc */}
        {tab === "tiempos" && (
          <>
            <input type="number" value={tpoHoras} onChange={(e) => setTpoHoras(e.target.value)} placeholder="h"
              className="w-14 bg-transparent text-sm py-2 px-2 rounded-lg outline-none text-center"
              style={inputStyle} />
            <input type="date" value={tpoFecha} onChange={(e) => setTpoFecha(e.target.value)}
              className="w-32 bg-transparent text-sm py-2 px-2 rounded-lg outline-none"
              style={inputStyle} />
            <input type="text" value={tpoDesc} onChange={(e) => setTpoDesc(e.target.value)} placeholder="Descripción…"
              className="flex-1 bg-transparent text-sm py-2 px-3 rounded-lg outline-none"
              style={inputStyle} />
            <button onClick={async () => { if (!tpoHoras) return; await addTiempo(trabajoId!, { horas: parseFloat(tpoHoras), descripcion: tpoDesc || undefined, fecha: tpoFecha }); setTpoHoras(""); setTpoDesc(""); queryClient.invalidateQueries({ queryKey: ["tiempos", trabajoId] }); }}
              disabled={!tpoHoras} className="p-2 rounded-lg flex-shrink-0"
              style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: tpoHoras ? 1 : 0.4 }}><Plus className="h-4 w-4" /></button>
          </>
        )}

        {/* Materiales: nombre + cant + precio */}
        {tab === "materiales" && (
          <>
            <input type="text" value={matNombre} onChange={(e) => setMatNombre(e.target.value)} placeholder="Material"
              className="flex-1 bg-transparent text-sm py-2 px-3 rounded-lg outline-none"
              style={inputStyle} />
            <input type="number" value={matCantidad} onChange={(e) => setMatCantidad(e.target.value)} placeholder="Cant."
              className="w-16 bg-transparent text-sm py-2 px-2 rounded-lg outline-none"
              style={inputStyle} />
            <input type="number" value={matPrecio} onChange={(e) => setMatPrecio(e.target.value)} placeholder="€"
              className="w-16 bg-transparent text-sm py-2 px-2 rounded-lg outline-none"
              style={inputStyle} />
            <button onClick={async () => { if (!matNombre) return; await addMaterialUsado(trabajoId!, { nombre: matNombre, cantidad: parseFloat(matCantidad) || undefined, precio_unitario: parseFloat(matPrecio) || undefined }); setMatNombre(""); setMatCantidad(""); setMatPrecio(""); queryClient.invalidateQueries({ queryKey: ["materiales", trabajoId] }); }}
              disabled={!matNombre} className="p-2 rounded-lg flex-shrink-0"
              style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: matNombre ? 1 : 0.4 }}><Plus className="h-4 w-4" /></button>
          </>
        )}

        {/* Checklist: desc + fecha opcional */}
        {tab === "checklist" && (
          <>
            <input type="text" value={tarDesc} onChange={(e) => setTarDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && tarDesc.trim()) { addChecklistItem(trabajoId!, tarDesc.trim()); setTarDesc(""); setTarFecha(""); setTarShowDate(false); queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] }); } }}
              placeholder="Nueva tarea…"
              className="flex-1 bg-transparent text-sm py-2 px-3 rounded-lg outline-none"
              style={inputStyle} />
            {tarShowDate && (
              <input type="date" value={tarFecha} onChange={(e) => setTarFecha(e.target.value)}
                className="w-32 bg-transparent text-sm py-2 px-2 rounded-lg outline-none"
                style={inputStyle} />
            )}
            <button onClick={() => setTarShowDate(!tarShowDate)} className="p-2 rounded-lg active:opacity-70 flex-shrink-0"
              style={{ color: tarShowDate ? "var(--tg-theme-button_color)" : "var(--tg-theme-hint_color)", background: "var(--tg-theme-bg_color)" }}>
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button onClick={async () => { if (!tarDesc.trim()) return; await addChecklistItem(trabajoId!, tarDesc.trim()); setTarDesc(""); setTarFecha(""); setTarShowDate(false); queryClient.invalidateQueries({ queryKey: ["trabajo", trabajoId] }); }}
              disabled={!tarDesc.trim()} className="p-2 rounded-lg flex-shrink-0"
              style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)", opacity: tarDesc.trim() ? 1 : 0.4 }}><Plus className="h-4 w-4" /></button>
          </>
        )}
      </div>
    </div>
  );
}
