/**
 * Agenda — vista de eventos del calendario para esta semana.
 */

import { useQuery } from "@tanstack/react-query";
import { getEventos } from "../api/trabajos";
import type { CalendarioEvento } from "../api/trabajos";
import {
  fmtDate, fmtTime, lunesEstaSemana, domingoEstaSemana, agruparPorFecha, hoyISO, TIPOS_EVENTO,
} from "../lib/constants";
import { MapPin, Clock } from "lucide-react";

// ── Componentes ───────────────────────────────────────────────

function EventoCard({ evento }: { evento: CalendarioEvento }) {
  const tipo = TIPOS_EVENTO[evento.tipo ?? ""] ?? TIPOS_EVENTO.otro;
  return (
    <div className="flex gap-2 py-2.5">
      {/* Barra de color */}
      <div
        className="w-1 rounded-full flex-shrink-0"
        style={{ background: evento.color || "var(--tg-theme-button_color)" }}
      />
      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium" style={{ color: "var(--tg-theme-hint_color)" }}>
            {fmtTime(evento.hora_evento) || "—"}
          </span>
          <span className="text-xs opacity-60">{tipo.icon}</span>
        </div>
        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--tg-theme-text_color)" }}>
          {evento.titulo}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>
          {evento.cliente_nombre && (
            <span>{evento.cliente_nombre}</span>
          )}
          {evento.ubicacion && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />{evento.ubicacion}
            </span>
          )}
          {evento.duracion_min && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{evento.duracion_min}min
            </span>
          )}
        </div>
        {evento.descripcion && (
          <p className="text-xs mt-1 opacity-70" style={{ color: "var(--tg-theme-hint_color)" }}>
            {evento.descripcion}
          </p>
        )}
      </div>
    </div>
  );
}

function DiaGrupo({ fecha, eventos }: { fecha: string; eventos: CalendarioEvento[] }) {
  const esHoy = fecha === hoyISO();
  const fechaDate = new Date(fecha + "T00:00:00");
  const diaSemana = fechaDate.toLocaleDateString("es-ES", { weekday: "long" });
  const diaMes = fechaDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  return (
    <div>
      <div className="flex items-center gap-2 py-2 sticky top-0 z-10" style={{ background: "var(--tg-theme-bg_color)" }}>
        <div className="flex items-center gap-2">
          {esHoy ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--tg-theme-button_color)" }}>
              HOY
            </span>
          ) : (
            <span className="text-xs font-semibold capitalize" style={{ color: "var(--tg-theme-accent_text_color)" }}>
              {diaSemana}
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>{diaMes}</span>
        </div>
        <div className="flex-1 h-px" style={{ background: "var(--tg-theme-hint_color)", opacity: 0.15 }} />
      </div>
      <div className="flex flex-col">
        {eventos.map((e) => (
          <EventoCard key={e.id} evento={e} />
        ))}
      </div>
    </div>
  );
}

// ── Vista ─────────────────────────────────────────────────────

export default function AgendaView() {
  const lunes = lunesEstaSemana();
  const domingo = domingoEstaSemana();

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos", lunes, domingo],
    queryFn: () => getEventos(lunes, domingo),
  });

  const grupos = agruparPorFecha(eventos);
  const fechas = Array.from(grupos.keys()).sort();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-4 pb-20">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text_color)" }}>Agenda</h1>
        <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
          {fmtDate(lunes)} — {fmtDate(domingo)}
        </p>
      </div>

      {fechas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
            No hay eventos esta semana
          </p>
          <p className="text-xs mt-1 opacity-60" style={{ color: "var(--tg-theme-hint_color)" }}>
            Añade eventos desde el chat de Free Works
          </p>
        </div>
      ) : (
        fechas.map((fecha) => (
          <DiaGrupo key={fecha} fecha={fecha} eventos={grupos.get(fecha)!} />
        ))
      )}
    </div>
  );
}
