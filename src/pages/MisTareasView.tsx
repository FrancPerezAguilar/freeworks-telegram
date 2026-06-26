/**
 * MisTareasView — todas las tareas pendientes agrupadas por trabajo.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChecklistPendiente, updateChecklistItem } from "../api/trabajos";
import type { ChecklistItem, Trabajo } from "../api/trabajos";
import { ESTADOS, fmtDate } from "../lib/constants";
import { CheckSquare, ChevronRight } from "lucide-react";

// ── Agrupación ────────────────────────────────────────────────

type Grupo = { trabajo: Trabajo; tareas: ChecklistItem[] };

function agrupar(items: { item: ChecklistItem; trabajo: Trabajo }[]): Grupo[] {
  const map = new Map<number, Grupo>();
  for (const { item, trabajo } of items) {
    if (item.completado) continue;
    if (!map.has(trabajo.id)) {
      map.set(trabajo.id, { trabajo, tareas: [] });
    }
    map.get(trabajo.id)!.tareas.push(item);
  }
  return Array.from(map.values());
}

// ── Vista ─────────────────────────────────────────────────────

interface Props {
  onTrabajoClick: (id: string) => void;
}

export default function MisTareasView({ onTrabajoClick }: Props) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["checklist", "pendiente"],
    queryFn: getChecklistPendiente,
  });

  const toggleMutation = useMutation({
    mutationFn: (args: { appwriteId: string; completado: boolean }) =>
      updateChecklistItem(args.appwriteId, { completado: args.completado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist", "pendiente"] }),
  });

  const grupos = agrupar(items);
  const totalTareas = grupos.reduce((s, g) => s + g.tareas.length, 0);
  const totalTrabajos = grupos.length;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text_color)" }}>Mis Tareas</h1>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
            {totalTareas} tareas pendientes en {totalTrabajos} trabajos
          </p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckSquare className="h-12 w-12 mb-3 opacity-20" style={{ color: "var(--tg-theme-hint_color)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--tg-theme-text_color)" }}>¡Todo al día!</p>
          <p className="text-xs mt-1" style={{ color: "var(--tg-theme-hint_color)" }}>No tienes tareas pendientes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((g) => (
            <div key={g.trabajo.id} className="rounded-xl overflow-hidden"
              style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
              {/* Trabajo header */}
              <button
                onClick={() => onTrabajoClick(g.trabajo.appwrite_id)}
                className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: "var(--tg-theme-text_color)" }}>
                      {g.trabajo.titulo}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${(ESTADOS[g.trabajo.estado] ?? ESTADOS.pendiente).color}`}>
                      {(ESTADOS[g.trabajo.estado] ?? ESTADOS.pendiente).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {g.trabajo.cliente_nombre && (
                      <span className="text-xs truncate" style={{ color: "var(--tg-theme-hint_color)" }}>
                        {g.trabajo.cliente_nombre}
                      </span>
                    )}
                    <span className="text-xs font-medium" style={{ color: "var(--tg-theme-accent_text_color)" }}>
                      {g.tareas.length} pendiente{g.tareas.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
              </button>

              {/* Tareas */}
              <div className="border-t" style={{ borderColor: "rgba(128,128,128,0.1)" }}>
                {g.tareas.map((tarea) => (
                  <div key={tarea.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 active:opacity-70"
                    style={{ borderColor: "rgba(128,128,128,0.08)" }}
                    onClick={() => toggleMutation.mutate({ appwriteId: tarea.appwrite_id, completado: true })}
                  >
                    <div className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center cursor-pointer"
                      style={{ borderColor: "var(--tg-theme-hint_color)", opacity: 0.4 }}>
                      {/* empty checkbox */}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "var(--tg-theme-text_color)" }}>
                        {tarea.descripcion}
                      </p>
                      {tarea.fecha && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint_color)" }}>
                          📅 {fmtDate(tarea.fecha)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
