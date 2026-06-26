/**
 * ClienteDetailView — vista completa de un cliente + sus trabajos.
 */

import { useQuery } from "@tanstack/react-query";
import { getCliente, getTrabajosDeCliente } from "../api/trabajos";
import { ESTADOS } from "../lib/constants";
import { Phone, Mail, MapPin, ChevronRight, ArrowLeft } from "lucide-react";

interface Props {
  clienteId: string;
  onBack: () => void;
  onTrabajoClick: (id: string) => void;
}

export default function ClienteDetailView({ clienteId, onBack, onTrabajoClick }: Props) {
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Contacto */}
        <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Contacto</span>
          <div className="mt-2 flex flex-col gap-2">
            {cliente.telefono_principal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--tg-theme-text_color)" }}>
                <Phone className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
                <a href={`tel:${cliente.telefono_principal}`} className="active:opacity-70" style={{ color: "var(--tg-theme-link_color)" }}>
                  {cliente.telefono_principal}
                </a>
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--tg-theme-text_color)" }}>
                <Mail className="h-4 w-4 flex-shrink-0" style={{ color: "var(--tg-theme-hint_color)" }} />
                <a href={`mailto:${cliente.email}`} className="active:opacity-70" style={{ color: "var(--tg-theme-link_color)" }}>
                  {cliente.email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Dirección */}
        <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Dirección</span>
          <div className="mt-2 flex items-start gap-2 text-sm" style={{ color: "var(--tg-theme-text_color)" }}>
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--tg-theme-hint_color)" }} />
            <span>{[cliente.direccion_calle, cliente.direccion_numero].filter(Boolean).join(" ") || "—"}
              {cliente.direccion_municipio && `, ${cliente.direccion_municipio}`}
              {cliente.direccion_provincia && `, ${cliente.direccion_provincia}`}
            </span>
          </div>
        </div>

        {/* Notas */}
        {cliente.notas && (
          <div className="rounded-xl p-3" style={{ background: "var(--tg-theme-secondary_bg_color)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--tg-theme-accent_text_color)" }}>Notas</span>
            <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: "var(--tg-theme-text_color)" }}>{cliente.notas}</p>
          </div>
        )}

        {/* Trabajos vinculados */}
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
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${(ESTADOS[t.estado] ?? ESTADOS.pendiente).color}`}>
                      {(ESTADOS[t.estado] ?? ESTADOS.pendiente).label}
                    </span>
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
