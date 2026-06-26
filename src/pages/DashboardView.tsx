/**
 * Dashboard — vista global de Free Works.
 * Muestra resumen de trabajos, tareas pendientes y próximos eventos.
 */

import { useQuery } from "@tanstack/react-query";
import { getTrabajos, getEventos, getChecklistPendiente, getClientes } from "../api/trabajos";
import type { Trabajo, CalendarioEvento } from "../api/trabajos";
import {
  ESTADOS, fmtTime, hoyISO,
} from "../lib/constants";
import {
  Wrench, CheckSquare, Users, Calendar, ChevronRight,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: color + "20" }}>
        <span style={{ color }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--tg-theme-text_color)" }}>{value}</p>
        <p className="text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>{label}</p>
      </div>
    </div>
  );
}

function EventoMini({ evento }: { evento: CalendarioEvento }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-xs font-mono w-12 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }}>
        {fmtTime(evento.hora_evento) || "—"}
      </span>
      <div
        className="w-1 h-8 rounded-full flex-shrink-0"
        style={{ background: evento.color || "var(--tg-theme-button_color)" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: "var(--tg-theme-text_color)" }}>
          {evento.titulo}
        </p>
        {evento.cliente_nombre && (
          <p className="text-xs truncate" style={{ color: "var(--tg-theme-hint_color)" }}>{evento.cliente_nombre}</p>
        )}
      </div>
    </div>
  );
}

function TrabajoRow({ trabajo, onClick }: { trabajo: Trabajo; onClick?: () => void }) {
  const estado = ESTADOS[trabajo.estado] ?? ESTADOS.pendiente;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer active:opacity-70"
      style={{ background: "var(--tg-theme-secondary_bg_color)" }}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--tg-theme-text_color)" }}>
          {trabajo.titulo}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${estado.color}`}>
            {estado.label}
          </span>
          {trabajo.cliente_nombre && (
            <span className="text-xs truncate" style={{ color: "var(--tg-theme-hint_color)" }}>
              {trabajo.cliente_nombre}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
    </div>
  );
}

// ── Vista ─────────────────────────────────────────────────────

interface Props {
  onTrabajoClick: (id: string) => void;
  onClientesClick: () => void;
}

export default function DashboardView({ onTrabajoClick, onClientesClick }: Props) {
  const hoy = hoyISO();

  const { data: trabajos = [] } = useQuery({
    queryKey: ["trabajos", "dashboard"],
    queryFn: () => getTrabajos({ limite: 20 }),
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => getClientes(),
  });
  const { data: checklist = [] } = useQuery({
    queryKey: ["checklist", "pendiente"],
    queryFn: getChecklistPendiente,
  });
  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos", "semana"],
    queryFn: () => getEventos(hoy, undefined),
  });

  const pendientes = trabajos.filter((t) => t.estado === "pendiente").length;
  const enCurso = trabajos.filter((t) => t.estado === "en_curso").length;
  const tareasPendientes = checklist.length;
  const totalClientes = clientes.length;
  const hoyEventos = eventos.filter((e) => e.fecha_evento === hoy);

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text_color)" }}>Free Works</h1>
        <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
          {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Wrench} label="Pendientes" value={pendientes} color="#f59e0b" />
        <StatCard icon={Wrench} label="En curso" value={enCurso} color="#3b82f6" />
        <StatCard icon={CheckSquare} label="Tareas" value={tareasPendientes} color="#10b981" />
        <button onClick={onClientesClick} className="w-full active:opacity-70">
          <StatCard icon={Users} label="Clientes" value={totalClientes} color="#8b5cf6" />
        </button>
      </div>

      {/* Hoy */}
      {hoyEventos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4" style={{ color: "var(--tg-theme-accent_text_color)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--tg-theme-text_color)" }}>Hoy</h2>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
            {hoyEventos.slice(0, 3).map((e) => (
              <EventoMini key={e.id} evento={e} />
            ))}
          </div>
        </div>
      )}

      {/* Trabajos recientes */}
      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--tg-theme-text_color)" }}>
          Trabajos recientes
        </h2>
        <div className="flex flex-col gap-2">
          {trabajos.slice(0, 5).map((t) => (
            <TrabajoRow
              key={t.id}
              trabajo={t}
              onClick={() => onTrabajoClick?.(t.appwrite_id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
