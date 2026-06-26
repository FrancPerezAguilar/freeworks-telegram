/**
 * TrabajoView — vista detalle de un trabajo para Telegram Mini App.
 * Recibe el trabajoId vía props (desde tab nav o deep link).
 */

import { useQuery } from "@tanstack/react-query";
import { getTrabajo } from "../api/trabajos";
import type { Trabajo } from "../api/trabajos";
import { useTelegramBackButton } from "../lib/TelegramContext";
import { ESTADOS, PRIORIDADES, fmtDate } from "../lib/constants";
import { MapPin, Calendar, Building2, AlertTriangle, Check, Clock, ArrowLeft } from "lucide-react";

// ── Componente ────────────────────────────────────────────────

function TrabajoCard({ trabajo }: { trabajo: Trabajo }) {
  const estado = ESTADOS[trabajo.estado] ?? ESTADOS.pendiente;
  const prioridad = PRIORIDADES[trabajo.prioridad] ?? PRIORIDADES.media;
  const checklistDone = trabajo.checklist?.filter((c) => c.completado).length ?? 0;
  const checklistTotal = trabajo.checklist?.length ?? 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold flex-1" style={{ color: "var(--tg-theme-text_color)" }}>
            {trabajo.titulo}
          </h1>
          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${estado.color}`}>
            {estado.label}
          </span>
        </div>
        <span className={`text-xs font-medium ${prioridad.color}`}>
          <AlertTriangle className="h-3 w-3 inline mr-1" />{prioridad.label}
        </span>
      </div>

      {/* Datos */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {trabajo.cliente_nombre && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
            <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
            <span className="truncate">{trabajo.cliente_nombre}</span>
          </div>
        )}
        {trabajo.fecha_inicio && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
            <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
            <span className="truncate">{fmtDate(trabajo.fecha_inicio)}</span>
          </div>
        )}
        {(trabajo.obra_municipio || trabajo.obra_calle) && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg col-span-2" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
            <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
            <span className="truncate">
              {[trabajo.obra_calle, trabajo.obra_numero].filter(Boolean).join(" ")}
              {trabajo.obra_municipio && `, ${trabajo.obra_municipio}`}
            </span>
          </div>
        )}
      </div>

      {/* Checklist */}
      {checklistTotal > 0 && (
        <div className="rounded-lg p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-4 w-4" style={{ color: "var(--tg-theme-accent_text_color)" }} />
            <span className="text-sm font-medium">Checklist ({checklistDone}/{checklistTotal})</span>
          </div>
          <div className="flex flex-col gap-1">
            {trabajo.checklist!.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 flex-shrink-0 ${item.completado ? "text-green-500" : ""}`}
                  style={!item.completado ? { color: "var(--tg-theme-hint_color)" } : undefined}>
                  {item.completado ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </span>
                <span className={item.completado ? "line-through opacity-60" : ""}
                  style={{ color: item.completado ? "var(--tg-theme-hint_color)" : "var(--tg-theme-text_color)" }}>
                  {item.descripcion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horas y coste */}
      {(trabajo.total_horas || trabajo.coste_total) && (
        <div className="flex gap-4 text-xs" style={{ color: "var(--tg-theme-hint_color)" }}>
          {trabajo.total_horas ? <span>⏱ {trabajo.total_horas}h</span> : null}
          {trabajo.coste_total ? <span>💰 {trabajo.coste_total.toLocaleString("es-ES")}€</span> : null}
        </div>
      )}
    </div>
  );
}

// ── Vista ─────────────────────────────────────────────────────

interface Props {
  trabajoId?: string;
  onBack?: () => void;
}

export default function TrabajoView({ trabajoId: propId, onBack }: Props) {
  // Leer de props o de URL (deep link)
  const params = new URLSearchParams(window.location.search);
  const urlId = params.get("trabajo_id");
  const trabajoId = propId || urlId || "";

  useTelegramBackButton(!onBack); // Solo usar BackButton nativo si no hay nav propia

  const { data: trabajo, isLoading, error } = useQuery({
    queryKey: ["trabajo", trabajoId],
    queryFn: () => getTrabajo(trabajoId),
    enabled: !!trabajoId,
  });

  // Sin ID
  if (!trabajoId) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center" style={{ color: "var(--tg-theme-hint_color)" }}>
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Selecciona un trabajo para ver sus detalles</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600" />
          <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>Cargando…</p>
        </div>
      </div>
    );
  }

  if (error || !trabajo) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
          <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
          <p className="text-sm font-medium">Error al cargar</p>
          <p className="text-xs mt-1 opacity-80">El trabajo no existe o no se puede acceder</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 px-4 pt-3 text-sm active:opacity-70"
          style={{ color: "var(--tg-theme-link_color)" }}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      )}
      <TrabajoCard trabajo={trabajo} />
    </div>
  );
}
