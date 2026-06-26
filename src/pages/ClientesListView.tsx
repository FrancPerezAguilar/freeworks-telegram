/**
 * ClientesListView — lista de clientes con búsqueda.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClientes } from "../api/trabajos";
import { Search, ChevronRight, Users, MapPin, Phone } from "lucide-react";

interface Props {
  onBack: () => void;
  onClienteClick: (id: string) => void;
}

export default function ClientesListView({ onBack, onClienteClick }: Props) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes", q],
    queryFn: () => getClientes(q || undefined),
  });

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <button onClick={onBack} className="active:opacity-70">
          <span className="text-sm" style={{ color: "var(--tg-theme-link_color)" }}>← Volver</span>
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: "var(--tg-theme-text_color)" }}>Clientes</h1>
      </div>

      {/* Search */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setQ(e.target.value); }}
            placeholder="Buscar cliente…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--tg-theme-text_color)" }} />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" /></div>
        ) : clientes.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "var(--tg-theme-hint_color)", opacity: 0.5 }}>No se encontraron clientes</p>
        ) : (
          <div className="flex flex-col gap-1">
            {clientes.map((c) => (
              <button key={c.id} onClick={() => onClienteClick(c.appwrite_id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left active:opacity-70"
                style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--tg-theme-button_color)", opacity: 0.15 }}>
                  <Users className="h-5 w-5" style={{ color: "var(--tg-theme-button_color)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--tg-theme-text_color)" }}>
                    {c.nombre} {c.apellidos || ""}
                  </p>
                  <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: "var(--tg-theme-hint_color)" }}>
                    {c.telefono_principal && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefono_principal}</span>}
                    {c.direccion_municipio && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.direccion_municipio}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
