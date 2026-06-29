/**
 * Agenda — eventos del calendario + tareas con fecha de vencimiento.
 *
 * Permite:
 * - Crear evento desde aquí (modal flotante con título, fecha, hora, etc.)
 * - Borrar evento (long press / click → confirmación)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEventos, getChecklistConFecha,
  addEvento, deleteEvento,
  type EventoCreate,
} from "../api/trabajos";
import type { CalendarioEvento, ChecklistItem, Trabajo } from "../api/trabajos";
import {
  fmtDate, fmtTime, lunesEstaSemana, domingoEstaSemana, hoyISO, TIPOS_EVENTO,
} from "../lib/constants";
import {
  MapPin, Clock, CheckSquare, Plus, X, Calendar, Trash2,
} from "lucide-react";

// ── Tipos unificados ──────────────────────────────────────────

interface ItemBase {
  fecha: string;
  esTarea: boolean;
}

interface EventoAgenda extends ItemBase {
  esTarea: false;
  evento: CalendarioEvento;
}

interface TareaAgenda extends ItemBase {
  esTarea: true;
  item: ChecklistItem;
  trabajo: Trabajo;
}

type ItemAgenda = EventoAgenda | TareaAgenda;

// ── Colores para los tipos de evento (semánticos) ─────────────
// Tonos armoniosos que combinan con el tema Telegram.
// Usamos los mismos tokens que ya tenemos en index.css para que
// cambien automáticamente en modo oscuro.

const TIPO_COLORS: Record<string, string> = {
  cita: "#2481cc",
  visita_obra: "#f59e0b",
  instalacion: "#8b5cf6",
  mantenimiento: "#10b981",
  presupuesto: "#ec4899",
  llamada: "#06b6d4",
  otro: "#6b7280",
};

// ── Componentes ───────────────────────────────────────────────

function EventoCard({ evento, onLongPress }: { evento: CalendarioEvento; onLongPress?: () => void }) {
  const tipo = TIPOS_EVENTO[evento.tipo ?? ""] ?? TIPOS_EVENTO.otro;
  const color = evento.color || TIPO_COLORS[evento.tipo ?? ""] || TIPO_COLORS.otro;
  return (
    <button
      onClick={onLongPress}
      className="w-full text-left flex gap-2 py-2.5 active:opacity-70"
    >
      <div className="w-1 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>
            {fmtTime(evento.hora_evento) || "—"}
          </span>
          <span className="text-xs opacity-60">{tipo.icon}</span>
        </div>
        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--tg-theme-text_color)" }}>{evento.titulo}</p>
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>
          {evento.cliente_nombre && <span>{evento.cliente_nombre}</span>}
          {evento.ubicacion && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{evento.ubicacion}</span>}
          {evento.duracion_min && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{evento.duracion_min}min</span>}
        </div>
        {evento.descripcion && <p className="text-xs mt-1 opacity-70" style={{ color: "var(--tg-theme-hint_color)" }}>{evento.descripcion}</p>}
      </div>
    </button>
  );
}

function TareaCard({ item, trabajo }: { item: ChecklistItem; trabajo: Trabajo }) {
  return (
    <div className="flex gap-2 py-2.5">
      <div className="w-1 rounded-full flex-shrink-0" style={{ background: "#f59e0b" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>📋 Tarea</span>
          <CheckSquare className="h-3 w-3" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }} />
        </div>
        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--tg-theme-text_color)" }}>{item.descripcion}</p>
        <p className="text-xs mt-1" style={{ color: "var(--tg-theme-hint_color)" }}>
          🏗️ {trabajo.titulo}
        </p>
      </div>
    </div>
  );
}

function DiaGrupo({ fecha, items, onEventoPress }: {
  fecha: string;
  items: ItemAgenda[];
  onEventoPress: (appwriteId: string) => void;
}) {
  const esHoy = fecha === hoyISO();
  const fechaDate = new Date(fecha + "T00:00:00");
  const diaSemana = fechaDate.toLocaleDateString("es-ES", { weekday: "long" });
  const diaMes = fechaDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  return (
    <div>
      <div className="flex items-center gap-2 py-2 sticky top-0 z-10" style={{ background: "var(--tg-theme-bg_color)" }}>
        {esHoy ? (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--tg-theme-button_color)" }}>HOY</span>
        ) : (
          <span className="text-xs font-semibold capitalize" style={{ color: "var(--tg-theme-accent_text_color)" }}>{diaSemana}</span>
        )}
        <span className="text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>{diaMes}</span>
        <div className="flex-1 h-px" style={{ background: "var(--tg-theme-hint_color)", opacity: 0.15 }} />
      </div>
      <div className="flex flex-col">
        {items.map((item) =>
          item.esTarea ? (
            <TareaCard key={`t-${item.item.id}`} item={item.item} trabajo={item.trabajo} />
          ) : (
            <EventoCard
              key={`e-${item.evento.id}`}
              evento={item.evento}
              onLongPress={() => onEventoPress(item.evento.appwrite_id)}
            />
          ),
        )}
      </div>
    </div>
  );
}

// ── Modal: crear evento ───────────────────────────────────────

function NuevoEventoModal({
  open, onClose, fechaInicial,
}: { open: boolean; onClose: () => void; fechaInicial?: string }) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [fecha, setFecha] = useState(fechaInicial ?? hoyISO());
  const [hora, setHora] = useState("");
  const [duracion, setDuracion] = useState("");
  const [tipo, setTipo] = useState("cita");
  const [clienteNombre, setClienteNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: () => {
      const data: EventoCreate = {
        titulo: titulo.trim(),
        fecha_evento: fecha,
        tipo,
      };
      if (desc.trim()) data.descripcion = desc.trim();
      if (hora) data.hora_evento = hora;
      if (duracion) data.duracion_min = parseInt(duracion, 10) || undefined;
      if (clienteNombre.trim()) data.cliente_nombre = clienteNombre.trim();
      if (ubicacion.trim()) data.ubicacion = ubicacion.trim();
      // color automático según tipo
      data.color = TIPO_COLORS[tipo] ?? TIPO_COLORS.otro;
      return addEvento(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      handleClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleClose = () => {
    setTitulo("");
    setDesc("");
    setFecha(fechaInicial ?? hoyISO());
    setHora("");
    setDuracion("");
    setTipo("cita");
    setClienteNombre("");
    setUbicacion("");
    setError("");
    onClose();
  };

  const handleSubmit = () => {
    if (!titulo.trim()) {
      setError("Escribe un título");
      return;
    }
    if (!fecha) {
      setError("Selecciona una fecha");
      return;
    }
    setError("");
    createMutation.mutate();
  };

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    background: "var(--tg-theme-secondary_bg_color)",
    color: "var(--tg-theme-text_color)",
    colorScheme: "light dark",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{ background: "var(--tg-theme-bg_color)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "rgba(128,128,128,0.15)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--tg-theme-text_color)" }}>
            Nuevo evento
          </h2>
          <button onClick={handleClose} className="p-1 rounded active:opacity-70"
            style={{ color: "var(--tg-theme-hint_color)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Título */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
              Título *
            </label>
            <input
              type="text" value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Visita a García"
              autoFocus
              className="w-full text-sm py-2 px-3 rounded-lg outline-none"
              style={inputStyle}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(TIPOS_EVENTO).map(([key, info]) => {
                const selected = tipo === key;
                const c = TIPO_COLORS[key];
                return (
                  <button
                    key={key} type="button"
                    onClick={() => setTipo(key)}
                    className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs active:opacity-70"
                    style={{
                      background: selected ? c + "20" : "var(--tg-theme-secondary_bg_color)",
                      color: selected ? c : "var(--tg-theme-text_color)",
                      border: selected ? `1px solid ${c}` : "1px solid transparent",
                    }}
                  >
                    <span>{info.icon}</span>
                    <span className="truncate">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha + Hora: la fecha necesita más ancho (formato DD/MM/YYYY) que la hora (HH:MM) */}
          <div className="flex gap-2">
            <div className="flex-[2] min-w-0">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
                Fecha *
              </label>
              <input
                type="date" value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
                Hora
              </label>
              <input
                type="time" value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Duración + Cliente */}
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
                Duración (min)
              </label>
              <input
                type="number" value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder="60"
                min="1"
                className="w-full text-sm py-2 px-3 rounded-lg outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex-[2] min-w-0">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
                Cliente
              </label>
              <input
                type="text" value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Opcional"
                className="w-full text-sm py-2 px-3 rounded-lg outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
              Ubicación
            </label>
            <input
              type="text" value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: Calle Mayor 11, Barcelona"
              className="w-full text-sm py-2 px-3 rounded-lg outline-none"
              style={inputStyle}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--tg-theme-hint_color)" }}>
              Notas
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Detalles adicionales…"
              rows={2}
              className="w-full text-sm py-2 px-3 rounded-lg outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-3 border-t flex-shrink-0"
          style={{ borderColor: "rgba(128,128,128,0.15)" }}>
          <button onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium active:opacity-70"
            style={{ background: "var(--tg-theme-secondary_bg_color)", color: "var(--tg-theme-text_color)" }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={createMutation.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold active:opacity-80 disabled:opacity-50"
            style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)" }}>
            {createMutation.isPending ? "Creando…" : "Crear evento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: confirmar borrado ──────────────────────────────────

function ConfirmDeleteModal({
  open, onClose, onConfirm, titulo,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; titulo: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl flex flex-col p-4 gap-3"
        style={{ background: "var(--tg-theme-bg_color)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" style={{ color: "var(--tg-theme-destructive_text_color)" }} />
          <h3 className="text-base font-semibold" style={{ color: "var(--tg-theme-text_color)" }}>
            Eliminar evento
          </h3>
        </div>
        <p className="text-sm" style={{ color: "var(--tg-theme-text_color)" }}>
          ¿Seguro que quieres eliminar <strong>{titulo}</strong>?
        </p>
        <div className="flex gap-2 mt-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium active:opacity-70"
            style={{ background: "var(--tg-theme-secondary_bg_color)", color: "var(--tg-theme-text_color)" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold active:opacity-80"
            style={{ background: "var(--tg-theme-destructive_text_color)", color: "#ffffff" }}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────

export default function AgendaView() {
  const queryClient = useQueryClient();
  const lunes = lunesEstaSemana();
  const domingo = domingoEstaSemana();

  const [showModal, setShowModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; titulo: string } | null>(null);

  const { data: eventos = [], isLoading: loadingEv } = useQuery({
    queryKey: ["eventos", lunes, domingo],
    queryFn: () => getEventos(lunes, domingo),
  });

  const { data: tareasConFecha = [], isLoading: loadingT } = useQuery({
    queryKey: ["checklist", "conFecha"],
    queryFn: getChecklistConFecha,
  });

  const deleteMutation = useMutation({
    mutationFn: (appwriteId: string) => deleteEvento(appwriteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      setPendingDelete(null);
    },
  });

  const isLoading = loadingEv || loadingT;

  // Merge: eventos + tareas con fecha dentro de esta semana
  const itemsPorFecha = new Map<string, ItemAgenda[]>();

  for (const e of eventos) {
    const f = e.fecha_evento;
    if (f >= lunes && f <= domingo) {
      if (!itemsPorFecha.has(f)) itemsPorFecha.set(f, []);
      itemsPorFecha.get(f)!.push({ fecha: f, esTarea: false, evento: e });
    }
  }

  for (const { item, trabajo } of tareasConFecha) {
    const f = item.fecha!;
    if (f >= lunes && f <= domingo) {
      if (!itemsPorFecha.has(f)) itemsPorFecha.set(f, []);
      itemsPorFecha.get(f)!.push({ fecha: f, esTarea: true, item, trabajo });
    }
  }

  const fechas = Array.from(itemsPorFecha.keys()).sort();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-4 pb-20">
      {/* Header con botón "+" */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text_color)" }}>Agenda</h1>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
            {fmtDate(lunes)} — {fmtDate(domingo)}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70 flex-shrink-0"
          style={{
            background: "var(--tg-theme-button_color)",
            color: "var(--tg-theme-button_text_color)",
          }}
          aria-label="Nuevo evento"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {fechas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 mb-3 opacity-20" style={{ color: "var(--tg-theme-hint_color)" }} />
          <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
            No hay eventos ni tareas esta semana
          </p>
          <p className="text-xs mt-1 opacity-60 mb-4" style={{ color: "var(--tg-theme-hint_color)" }}>
            Pulsa + para añadir el primero
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium active:opacity-80"
            style={{
              background: "var(--tg-theme-button_color)",
              color: "var(--tg-theme-button_text_color)",
            }}
          >
            Crear primer evento
          </button>
        </div>
      ) : (
        fechas.map((fecha) => (
          <DiaGrupo
            key={fecha}
            fecha={fecha}
            items={itemsPorFecha.get(fecha)!}
            onEventoPress={(id) => {
              const ev = eventos.find((e) => e.appwrite_id === id);
              if (ev) setPendingDelete({ id, titulo: ev.titulo });
            }}
          />
        ))
      )}

      {/* Modal de creación */}
      <NuevoEventoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        fechaInicial={hoyISO()}
      />

      {/* Modal de confirmación de borrado */}
      <ConfirmDeleteModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
        titulo={pendingDelete?.titulo ?? ""}
      />
    </div>
  );
}