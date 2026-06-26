/**
 * TrabajosListView — lista y Kanban de trabajos con búsqueda.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrabajos } from "../api/trabajos";
import type { Trabajo } from "../api/trabajos";
import { ESTADOS, PRIORIDADES, fmtDate } from "../lib/constants";
import {
  Search, List, Columns, Wrench, MapPin, ChevronRight,
} from "lucide-react";

type ViewMode = "list" | "kanban";

const COLUMNAS: { estado: string; titulo: string; color: string }[] = [
  { estado: "pendiente",  titulo: "Pendiente",  color: "#f59e0b" },
  { estado: "en_curso",   titulo: "En curso",   color: "#3b82f6" },
  { estado: "completado", titulo: "Completado",  color: "#10b981" },
];

// ── TrabajoCard (compacta) ────────────────────────────────────

function TrabajoCard({ trabajo, onClick }: { trabajo: Trabajo; onClick: () => void }) {
  const estado = ESTADOS[trabajo.estado] ?? ESTADOS.pendiente;
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl active:opacity-70 cursor-pointer"
      style={{ background: "var(--tg-theme-secondary_bg_color)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--tg-theme-text_color)" }}>
          {trabajo.titulo}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${estado.color}`}>
            {estado.label}
          </span>
          {trabajo.cliente_nombre && (
            <span className="text-xs truncate" style={{ color: "var(--tg-theme-hint_color)" }}>
              {trabajo.cliente_nombre}
            </span>
          )}
          {trabajo.obra_municipio && (
            <span className="text-xs flex items-center gap-0.5 truncate" style={{ color: "var(--tg-theme-hint_color)" }}>
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {trabajo.obra_municipio}
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--tg-theme-hint_color)" }}>
          {fmtDate(trabajo.fecha_inicio)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 mt-1" style={{ color: "var(--tg-theme-hint_color)" }} />
    </div>
  );
}

// ── KanbanCard ────────────────────────────────────────────────

function KanbanCard({ trabajo, onClick }: { trabajo: Trabajo; onClick: () => void }) {
  const prioridad = PRIORIDADES[trabajo.prioridad] ?? PRIORIDADES.media;
  return (
    <div
      onClick={onClick}
      className="p-2.5 rounded-lg mb-2 cursor-pointer active:opacity-70"
      style={{ background: "var(--tg-theme-bg_color)" }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--tg-theme-text_color)" }}>
        {trabajo.titulo}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs ${prioridad.color}`}>{prioridad.label}</span>
        {trabajo.cliente_nombre && (
          <span className="text-xs truncate" style={{ color: "var(--tg-theme-hint_color)" }}>
            {trabajo.cliente_nombre}
          </span>
        )}
      </div>
      {trabajo.fecha_inicio && (
        <p className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint_color)" }}>
          {fmtDate(trabajo.fecha_inicio)}
        </p>
      )}
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────

interface Props {
  onTrabajoClick: (id: string) => void;
}

export default function TrabajosListView({ onTrabajoClick }: Props) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const { data: trabajos = [], isLoading } = useQuery({
    queryKey: ["trabajos", "all"],
    queryFn: () => getTrabajos({ limite: 50 }),
  });

  const filtrados = useMemo(() => {
    if (!search.trim()) return trabajos;
    const q = search.toLowerCase();
    return trabajos.filter(
      (t) =>
        t.titulo?.toLowerCase().includes(q) ||
        t.cliente_nombre?.toLowerCase().includes(q) ||
        t.obra_municipio?.toLowerCase().includes(q)
    );
  }, [trabajos, search]);

  const kanbanGrupos = useMemo(() => {
    const g: Record<string, Trabajo[]> = {};
    for (const col of COLUMNAS) g[col.estado] = [];
    for (const t of filtrados) {
      const e = t.estado || "pendiente";
      if (!g[e]) g[e] = [];
      g[e].push(t);
    }
    return g;
  }, [filtrados]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 p-4 ${viewMode === "kanban" ? "h-[calc(100vh-3.5rem)]" : "pb-20"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text_color)" }}>Trabajos</h1>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
          <button
            onClick={() => setViewMode("list")}
            className="p-1.5 rounded-md"
            style={{ background: viewMode === "list" ? "var(--tg-theme-bg_color)" : "transparent" }}
          >
            <List className="h-4 w-4" style={{ color: viewMode === "list" ? "var(--tg-theme-button_color)" : "var(--tg-theme-hint_color)" }} />
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className="p-1.5 rounded-md"
            style={{ background: viewMode === "kanban" ? "var(--tg-theme-bg_color)" : "transparent" }}
          >
            <Columns className="h-4 w-4" style={{ color: viewMode === "kanban" ? "var(--tg-theme-button_color)" : "var(--tg-theme-hint_color)" }} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
        <Search className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, cliente o ubicación…"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--tg-theme-text_color)" }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--tg-theme-hint_color)", color: "var(--tg-theme-bg_color)" }}>
            ✕
          </button>
        )}
      </div>

      {/* List view */}
      {viewMode === "list" && (
        <div className="flex flex-col gap-2">
          {filtrados.length === 0 ? (
            <div className="text-center py-8" style={{ color: "var(--tg-theme-hint_color)" }}>
              <Wrench className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search ? "Sin resultados" : "No hay trabajos"}</p>
            </div>
          ) : (
            filtrados.map((t) => (
              <TrabajoCard key={t.id} trabajo={t} onClick={() => onTrabajoClick(t.appwrite_id)} />
            ))
          )}
        </div>
      )}

      {/* Kanban view — columnas a ancho completo con scroll horizontal */}
      {viewMode === "kanban" && (
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Column indicator dots */}
          <div className="flex justify-center gap-1.5 py-1 flex-shrink-0">
            {COLUMNAS.map((col) => (
              <button
                key={col.estado}
                onClick={() => {
                  const el = document.getElementById(`kanban-col-${col.estado}`);
                  el?.scrollIntoView({ behavior: "smooth", inline: "center" });
                }}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: col.color, opacity: 0.6 }}
              />
            ))}
          </div>

          {/* Scrollable columns — ocupan todo el alto disponible */}
          <div
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {COLUMNAS.map((col) => (
              <div
                key={col.estado}
                id={`kanban-col-${col.estado}`}
                className="flex-shrink-0 w-[calc(100vw-2rem)] snap-center flex flex-col"
                style={{ minHeight: 0 }}
              >
                <div className="flex items-center gap-2 mb-2 px-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: col.color }} />
                  <span className="text-sm font-bold" style={{ color: "var(--tg-theme-text_color)" }}>
                    {col.titulo}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: col.color + "20", color: col.color }}>
                    {kanbanGrupos[col.estado]?.length ?? 0}
                  </span>
                </div>
                <div className="rounded-xl p-2 flex-1 overflow-y-auto" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
                  {kanbanGrupos[col.estado]?.map((t) => (
                    <KanbanCard key={t.id} trabajo={t} onClick={() => onTrabajoClick(t.appwrite_id)} />
                  ))}
                  {(!kanbanGrupos[col.estado] || kanbanGrupos[col.estado].length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Wrench className="h-8 w-8 mb-2 opacity-20" style={{ color: col.color }} />
                      <p className="text-xs" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }}>
                        Sin trabajos {col.titulo.toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
