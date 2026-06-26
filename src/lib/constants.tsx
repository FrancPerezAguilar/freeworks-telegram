/** Constantes compartidas entre vistas */

export const ESTADOS: Record<string, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "bg-amber-100 text-amber-800" },
  en_curso:   { label: "En curso",   color: "bg-blue-100 text-blue-800" },
  completado: { label: "Completado", color: "bg-green-100 text-green-800" },
  cancelado:  { label: "Cancelado",  color: "bg-red-100 text-red-800" },
};

export const PRIORIDADES: Record<string, { label: string; color: string }> = {
  baja:   { label: "Baja",   color: "text-gray-400" },
  media:  { label: "Media",  color: "text-yellow-500" },
  alta:   { label: "Alta",   color: "text-orange-500" },
  urgente:{ label: "Urgente",color: "text-red-500" },
};

export const TIPOS_EVENTO: Record<string, { label: string; icon: string }> = {
  cita:        { label: "Cita",        icon: "📋" },
  visita_obra: { label: "Visita obra", icon: "🏗️" },
  instalacion: { label: "Instalación", icon: "🔧" },
  mantenimiento: { label: "Mantenimiento", icon: "🛠️" },
  presupuesto: { label: "Presupuesto", icon: "📄" },
  llamada:     { label: "Llamada",     icon: "📞" },
  otro:        { label: "Otro",        icon: "📌" },
};

export function fmtDate(d?: string): string {
  if (!d) return "—";
  try {
    return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("es-ES", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return d; }
}

export function fmtTime(t?: string): string {
  if (!t) return "";
  return t.substring(0, 5);
}

/** Lunes de esta semana en ISO YYYY-MM-DD */
export function lunesEstaSemana(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

/** Domingo de esta semana */
export function domingoEstaSemana(): string {
  const d = new Date(lunesEstaSemana() + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

/** Agrupa eventos por fecha */
export function agruparPorFecha<T extends { fecha_evento: string }>(eventos: T[]): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const e of eventos) {
    const f = e.fecha_evento;
    if (!grupos.has(f)) grupos.set(f, []);
    grupos.get(f)!.push(e);
  }
  return grupos;
}

/** Hoy en ISO */
export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
