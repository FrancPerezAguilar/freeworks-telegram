/** Constantes compartidas entre vistas */

/**
 * Colores de estado — definidos como CSS vars semánticas para que se adapten
 * automáticamente al modo claro/oscuro. Aplicar así:
 *
 *   <EstadoBadge estado="pendiente" />
 *
 * Los valores se cambian en src/index.css bajo `:root.dark` y
 * `@media (prefers-color-scheme: dark)`.
 */
export const ESTADO_COLORS: Record<string, { bg: string; fg: string }> = {
  pendiente:  { bg: "var(--tg-state-pendiente-bg)",  fg: "var(--tg-state-pendiente-fg)" },
  en_curso:   { bg: "var(--tg-state-en_curso-bg)",   fg: "var(--tg-state-en_curso-fg)" },
  completado: { bg: "var(--tg-state-completado-bg)", fg: "var(--tg-state-completado-fg)" },
  cancelado:  { bg: "var(--tg-state-cancelado-bg)",  fg: "var(--tg-state-cancelado-fg)" },
};

export const ESTADOS: Record<string, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "" },
  en_curso:   { label: "En curso",   color: "" },
  completado: { label: "Completado", color: "" },
  cancelado:  { label: "Cancelado",  color: "" },
};

/**
 * <EstadoBadge> — chip de estado que se adapta al tema oscuro automáticamente.
 * Reemplaza al antiguo patrón `${ESTADOS[x].color}` que usaba clases Tailwind
 * hardcodeadas y no se veían bien en dark mode.
 */
export function EstadoBadge({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? ESTADOS.pendiente;
  const colors = ESTADO_COLORS[estado] ?? ESTADO_COLORS.pendiente;
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded-full"
      style={{ background: colors.bg, color: colors.fg }}
    >
      {e.label}
    </span>
  );
}

/** Colores de prioridad (solo color de texto — sin fondo) */
export const PRIORIDAD_COLORS: Record<string, string> = {
  baja:    "var(--tg-prio-baja-fg)",
  media:   "var(--tg-prio-media-fg)",
  alta:    "var(--tg-prio-alta-fg)",
  urgente: "var(--tg-prio-urgente-fg)",
};

export const PRIORIDADES: Record<string, { label: string; color: string }> = {
  baja:    { label: "Baja",    color: "var(--tg-prio-baja-fg)" },
  media:   { label: "Media",   color: "var(--tg-prio-media-fg)" },
  alta:    { label: "Alta",    color: "var(--tg-prio-alta-fg)" },
  urgente: { label: "Urgente", color: "var(--tg-prio-urgente-fg)" },
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
