import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TrabajoView from "./pages/TrabajoView";
import { useTelegram } from "./lib/TelegramContext";
import { authenticateWithTelegram, type AuthResult } from "./lib/telegramAuth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});

/** Pantalla de carga mientras se autentica */
function AuthLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600" />
        <p className="text-sm" style={{ color: "var(--tg-theme-hint_color)" }}>
          Verificando identidad…
        </p>
      </div>
    </div>
  );
}

/** Pantalla de error de autenticación */
function AuthError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: "var(--tg-theme-destructive_text_color)" }}>
          Error de autenticación
        </p>
        <p className="text-xs mt-1 opacity-70" style={{ color: "var(--tg-theme-hint_color)" }}>
          {message}
        </p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm rounded-lg font-medium"
          style={{
            background: "var(--tg-theme-button_color)",
            color: "var(--tg-theme-button_text_color)",
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { isTelegram, user: tgUser } = useTelegram();
  const [auth, setAuth] = useState<AuthResult | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

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

  // Fuera de Telegram → sin auth, usar API key directamente
  if (!isTelegram) {
    return (
      <QueryClientProvider client={queryClient}>
        <TrabajoView />
      </QueryClientProvider>
    );
  }

  // Telegram: cargando auth
  if (authLoading || !auth) {
    return <AuthLoading />;
  }

  // Telegram: error de auth
  if (!auth.ok) {
    return (
      <AuthError
        message={auth.error ?? "No se pudo verificar tu identidad"}
        onRetry={() => setAuth(null)}
      />
    );
  }

  // Telegram: autenticado
  return (
    <QueryClientProvider client={queryClient}>
      <TrabajoView />
    </QueryClientProvider>
  );
}
