/**
 * ClienteDetailView — vista editable de cliente (click-to-edit, estilo TrabajoView).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCliente, updateCliente, getTrabajosDeCliente } from "../api/trabajos";
import type { Cliente } from "../api/trabajos";
import { EstadoBadge } from "../lib/constants";
import { Phone, MapPin, ChevronRight, ArrowLeft, MessageSquare } from "lucide-react";

interface Props {
  clienteId: string;
  onBack: () => void;
  onTrabajoClick: (id: string) => void;
}

// ── Click-to-edit Field (same pattern as TrabajoView) ───────────

const inputStyle: React.CSSProperties = {
  color: "var(--tg-theme-text_color)",
  boxShadow: "0 0 0 1px var(--tg-theme-button_color)",
  background: "transparent",
  resize: "none",
};

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

// ── Section wrapper ─────────────────────────────────────────────

function Section({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--tg-theme-accent_text_color)" }}>
          <Icon className="h-4 w-4 flex-shrink-0" />
        </span>
        <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main View ───────────────────────────────────────────────────

export default function ClienteDetailView({ clienteId, onBack, onTrabajoClick }: Props) {
  const queryClient = useQueryClient();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => getCliente(clienteId),
    enabled: !!clienteId,
  });

  const { data: trabajos = [] } = useQuery({
    queryKey: ["trabajos", "cliente", clienteId],
    queryFn: () => getTrabajosDeCliente(clienteId),
    enabled: !!clienteId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => updateCliente(clienteId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] }),
  });

  const handleUpdate = useCallback((field: string, value: string | null) => {
    updateMutation.mutate({ [field]: value || null } as Partial<Cliente>);
  }, [updateMutation]);

  if (isLoading || !cliente) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <button onClick={onBack} className="active:opacity-70">
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--tg-theme-link_color)" }} />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate" style={{ color: "var(--tg-theme-text_color)" }}>
          {cliente.nombre} {cliente.apellidos || ""}
        </h1>
      </div>

      {/* Editable fields */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* ── Datos personales ── */}
        <Section icon={({ className }) => <span className={className}>👤</span>} label="Datos personales">
          <Field label="Nombre" value={cliente.nombre || ""}
            onChange={(v) => handleUpdate("nombre", v || null)} placeholder="Nombre del cliente" />
          <Field label="Apellidos" value={cliente.apellidos || ""}
            onChange={(v) => handleUpdate("apellidos", v || null)} placeholder="Apellidos" />
        </Section>

        {/* ── Contacto ── */}
        <Section icon={Phone} label="Contacto">
          <Field label="Teléfono" value={cliente.telefono_principal || ""} type="tel"
            onChange={(v) => handleUpdate("telefono_principal", v || null)} placeholder="+34 600 000 000" />
          <Field label="Email" value={cliente.email || ""} type="email"
            onChange={(v) => handleUpdate("email", v || null)} placeholder="cliente@email.com" />
        </Section>

        {/* ── Dirección ── */}
        <Section icon={MapPin} label="Dirección">
          <div className="flex gap-2">
            <div className="flex-[3]">
              <Field label="Calle" value={cliente.direccion_calle || ""}
                onChange={(v) => handleUpdate("direccion_calle", v || null)} placeholder="Calle" />
            </div>
            <div className="flex-1">
              <Field label="Nº" value={cliente.direccion_numero || ""}
                onChange={(v) => handleUpdate("direccion_numero", v || null)} placeholder="Nº" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Municipio" value={cliente.direccion_municipio || ""}
                onChange={(v) => handleUpdate("direccion_municipio", v || null)} placeholder="Municipio" />
            </div>
            <div className="flex-1">
              <Field label="Provincia" value={cliente.direccion_provincia || ""}
                onChange={(v) => handleUpdate("direccion_provincia", v || null)} placeholder="Provincia" />
            </div>
          </div>
        </Section>

        {/* ── Notas ── */}
        <Section icon={MessageSquare} label="Notas">
          <Field label="Notas internas" value={cliente.notas || ""} multiline
            onChange={(v) => handleUpdate("notas", v || null)} placeholder="Notas sobre el cliente…" />
        </Section>

        {/* ── Trabajos vinculados ── */}
        <div>
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--tg-theme-text_color)" }}>
            Trabajos ({trabajos.length})
          </h2>
          {trabajos.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }}>Sin trabajos vinculados</p>
          ) : (
            <div className="flex flex-col gap-1">
              {trabajos.map((t) => (
                <button key={t.id} onClick={() => onTrabajoClick(t.appwrite_id)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left active:opacity-70"
                  style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--tg-theme-text_color)" }}>{t.titulo}</p>
                    <EstadoBadge estado={t.estado} />
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
