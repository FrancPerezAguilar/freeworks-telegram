import { useEffect, useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTelegram } from "./lib/TelegramContext";
import { authenticateWithTelegram, type AuthResult } from "./lib/telegramAuth";
import DashboardView from "./pages/DashboardView";
import AgendaView from "./pages/AgendaView";
import TrabajoView from "./pages/TrabajoView";
import TrabajosListView from "./pages/TrabajosListView";
import { LayoutDashboard, Calendar, Wrench } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// ── Auth screens ──────────────────────────────────────────────

function AuthLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600" />
        <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>Verificando identidad…</p>
      </div>
    </div>
  );
}

function AuthError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
          Error de autenticación
        </p>
        <p className="text-xs mt-1 opacity-70" style={{ color: "var(--tg-theme-hint_color)" }}>{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 text-sm rounded-lg font-medium"
          style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)" }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────

type View = "dashboard" | "agenda" | "trabajos" | "trabajo";

function TabBar({ active, onSelect }: { active: View; onSelect: (v: View) => void }) {
  const tabs: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
    { id: "trabajos", label: "Trabajos", icon: Wrench },
    { id: "agenda", label: "Agenda", icon: Calendar },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 flex border-t z-20"
      style={{ background: "var(--tg-theme-bg_color)", borderColor: "rgba(128,128,128,0.15)" }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        const activeColor = "var(--tg-theme-button_color)";
        const inactiveColor = "var(--tg-theme-hint_color)";
        return (
          <button key={tab.id} onClick={() => onSelect(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 active:opacity-70"
          >
            <span style={{ color: isActive ? activeColor : inactiveColor }}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-sm" style={{
              color: isActive ? "var(--tg-theme-button_color)" : "var(--tg-theme-hint_color)",
              fontWeight: isActive ? 600 : 400,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  const { isTelegram, user: tgUser } = useTelegram();
  const [auth, setAuth] = useState<AuthResult | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Navegación
  const [view, setView] = useState<View>("dashboard");
  const [selectedTrabajoId, setSelectedTrabajoId] = useState<string | null>(null);

  // Leer trabajo_id de deep link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("trabajo_id");
    if (tid) {
      setSelectedTrabajoId(tid);
      setView("trabajo");
    }
  }, []);

  // Auth
  useEffect(() => {
    if (!isTelegram || !tgUser || auth) return;
    let cancelled = false;
    setAuthLoading(true);
    authenticateWithTelegram(tgUser).then((result) => {
      if (cancelled) return;
      setAuth(result);
      setAuthLoading(false);
    });
    return () => { cancelled = true; };
  }, [isTelegram, tgUser, auth]);

  const handleTrabajoClick = useCallback((id: string) => {
    setSelectedTrabajoId(id);
    setView("trabajo");
  }, []);

  const handleBack = useCallback(() => {
    setView("dashboard");
    setSelectedTrabajoId(null);
  }, []);

  // No Telegram → mostrar sin auth
  if (!isTelegram) {
    return (
      <QueryClientProvider client={queryClient}>
        {view === "trabajo" && selectedTrabajoId ? (
          <TrabajoView trabajoId={selectedTrabajoId} onBack={handleBack} />
        ) : view === "agenda" ? (
          <AgendaView />
        ) : view === "trabajos" ? (
          <TrabajosListView onTrabajoClick={handleTrabajoClick} />
        ) : (
          <DashboardView onTrabajoClick={handleTrabajoClick} />
        )}
        <TabBar active={view === "trabajo" ? "dashboard" : view} onSelect={(v) => { setView(v); setSelectedTrabajoId(null); }} />
      </QueryClientProvider>
    );
  }

  // Telegram: cargando auth
  if (authLoading || !auth) return <AuthLoading />;

  // Telegram: error
  if (!auth.ok) return <AuthError message={auth.error ?? "No se pudo verificar tu identidad"} onRetry={() => setAuth(null)} />;

  // Telegram: autenticado
  return (
    <QueryClientProvider client={queryClient}>
      {view === "trabajo" && selectedTrabajoId ? (
        <TrabajoView trabajoId={selectedTrabajoId} onBack={handleBack} />
      ) : view === "agenda" ? (
        <AgendaView />
      ) : view === "trabajos" ? (
        <TrabajosListView onTrabajoClick={handleTrabajoClick} />
      ) : (
        <DashboardView onTrabajoClick={handleTrabajoClick} />
      )}
      <TabBar active={view === "trabajo" ? "dashboard" : view} onSelect={(v) => { setView(v); setSelectedTrabajoId(null); }} />
    </QueryClientProvider>
  );
}
