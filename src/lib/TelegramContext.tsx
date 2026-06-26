/**
 * TelegramContext — Mini App detection + theme integration.
 *
 * - Detecta si la app corre dentro de Telegram (`window.Telegram.WebApp`)
 * - Expone: `isTelegram`, `webApp`, `user`, `theme`, `colorScheme`
 * - Al montar: `webApp.ready()`, `webApp.expand()`, aplica CSS vars del tema
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// ── Tipos locales del SDK ─────────────────────────────────────

export interface ThemeParams {
  bg_color?: string; text_color?: string; hint_color?: string;
  link_color?: string; button_color?: string; button_text_color?: string;
  secondary_bg_color?: string; header_bg_color?: string;
  accent_text_color?: string; section_bg_color?: string;
  section_header_text_color?: string; subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface WebAppUser {
  id: number; first_name: string; last_name?: string;
  username?: string; language_code?: string; photo_url?: string;
}

export interface WebApp {
  initData: string;
  initDataUnsafe: { user?: WebAppUser; [k: string]: unknown };
  colorScheme: "light" | "dark";
  themeParams: ThemeParams;
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
}

declare global { interface Window { Telegram?: { WebApp?: WebApp }; } }

// ── Helpers ───────────────────────────────────────────────────

function getWebApp(): WebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

function applyThemeVars(tp: ThemeParams | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars: Array<[string, string | undefined]> = [
    ["--tg-theme-bg_color", tp?.bg_color],
    ["--tg-theme-text_color", tp?.text_color],
    ["--tg-theme-hint_color", tp?.hint_color],
    ["--tg-theme-link_color", tp?.link_color],
    ["--tg-theme-button_color", tp?.button_color],
    ["--tg-theme-button_text_color", tp?.button_text_color],
    ["--tg-theme-secondary_bg_color", tp?.secondary_bg_color],
    ["--tg-theme-header_bg_color", tp?.header_bg_color],
    ["--tg-theme-accent_text_color", tp?.accent_text_color],
    ["--tg-theme-section_bg_color", tp?.section_bg_color],
    ["--tg-theme-section_header_text_color", tp?.section_header_text_color],
    ["--tg-theme-subtitle_text_color", tp?.subtitle_text_color],
    ["--tg-theme-destructive_text_color", tp?.destructive_text_color],
  ];
  for (const [name, value] of vars) {
    value ? root.style.setProperty(name, value) : root.style.removeProperty(name);
  }
}

// ── Context ───────────────────────────────────────────────────

export interface TelegramContextValue {
  isTelegram: boolean;
  webApp: WebApp | null;
  user: WebAppUser | null;
  theme: ThemeParams;
  colorScheme: "light" | "dark" | null;
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false, webApp: null, user: null, theme: {}, colorScheme: null,
});

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [colorScheme, setColorScheme] = useState<"light" | "dark" | null>(null);
  const [theme, setTheme] = useState<ThemeParams>({});

  useEffect(() => {
    const tg = getWebApp();
    // Solo considerar Telegram si hay un usuario real (initDataUnsafe.user)
    // La SDK crea un mock WebApp en navegadores normales sin usuario
    if (!tg || !tg.initDataUnsafe?.user) {
      setIsTelegram(false);
      return;
    }
    setWebApp(tg);
    setIsTelegram(true);
    setColorScheme(tg.colorScheme ?? null);
    setTheme(tg.themeParams ?? {});

    try { tg.ready(); tg.expand(); } catch { /* noop */ }
    applyThemeVars(tg.themeParams);

    const onThemeChange = () => {
      setColorScheme(tg.colorScheme ?? null);
      setTheme(tg.themeParams ?? {});
      applyThemeVars(tg.themeParams);
    };
    try { tg.onEvent("themeChanged", onThemeChange); } catch { /* noop */ }

    // Back button → go back or close
    const onBack = () => {
      if (window.history.length > 1) window.history.back();
      else try { tg.close(); } catch { /* noop */ }
    };
    try { tg.BackButton.onClick(onBack); } catch { /* noop */ }

    return () => {
      try { tg.offEvent("themeChanged", onThemeChange); } catch { /* noop */ }
      try { tg.BackButton.offClick(onBack); } catch { /* noop */ }
    };
  }, []);

  const value = useMemo<TelegramContextValue>(() => ({
    isTelegram, webApp, user: webApp?.initDataUnsafe?.user ?? null, theme, colorScheme,
  }), [isTelegram, webApp, theme, colorScheme]);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}

/** Muestra/oculta el BackButton nativo de Telegram */
export function useTelegramBackButton(enabled: boolean): void {
  const { isTelegram, webApp } = useTelegram();
  useEffect(() => {
    if (!isTelegram || !webApp) return;
    try { enabled ? webApp.BackButton.show() : webApp.BackButton.hide(); } catch { /* noop */ }
  }, [enabled, isTelegram, webApp]);
}
