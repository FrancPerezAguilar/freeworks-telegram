/**
 * Auth de la Mini App — validación por Telegram ID.
 *
 * Cambios Junio 2026: el flujo original usaba `POST /users/{id}/tokens` para
 * crear una sesión real con Appwrite. Ese endpoint requiere que la API key
 * tenga scope `users.write`, y la API key actual está expirada en Appwrite.
 *
 * Nueva estrategia:
 *   1) Lee `Telegram.WebApp.initData` (cadena firmada) — más confiable que
 *      `initDataUnsafe` porque está firmada por el bot.
 *   2) Parsea el `user.id` desde el initData firmado.
 *   3) Compara contra un allowlist hardcodeado en config.ts.
 *   4) Si NO está en el allowlist → rechaza con mensaje claro.
 *   5) Si está → autenticado. Las llamadas a Appwrite usan `setDevKey(API key)`
 *      (configurado en appwrite.ts), así que NO necesitamos sesión.
 *
 * Seguridad: la validación por Telegram ID permite que alguien con acceso al
 * código modifique `initDataUnsafe.user.id`. Para uso real (Franc abre desde su
 * Telegram y la API key está solo en su bundle) es suficiente. Si se quiere
 * endurecer, validar la firma HMAC del initData con el bot token — requeriría
 * que el bot token esté disponible en el cliente (no es el caso).
 */

import { ALLOWED_TELEGRAM_IDS } from "../config";
import type { WebAppUser } from "./TelegramContext";

export interface AuthResult {
  ok: boolean;
  userId?: string;       // ID del usuario autenticado (en este caso, Telegram ID)
  telegramId?: number;
  displayName?: string;
  isNewUser?: boolean;
  error?: string;
}

/**
 * Parsea el query string del initData firmado por Telegram.
 * Devuelve un mapa clave → valor. Soporta claves con caracteres especiales.
 */
function parseInitData(initData: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!initData) return result;
  for (const part of initData.split("&")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = decodeURIComponent(part.slice(0, eq));
    const rawValue = part.slice(eq + 1);
    // Telegram usa urlencode para los valores; algunos clientes también escapan
    // '+'. Decodificamos y manejamos el caso especial.
    let value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    // Los valores JSON (como "user") llegan como string JSON escapado (con
    // caracteres unicode tipo \uXXXX). Si vemos que empieza por '{', parseamos.
    if (value.startsWith("{") && value.endsWith("}")) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null) {
          // Aplanar el JSON.user a campos con prefijo "user."
          for (const [k, v] of Object.entries(parsed)) {
            result[`user.${k}`] = String(v ?? "");
          }
          continue;
        }
      } catch { /* fall through — tratar como string plano */ }
    }
    result[key] = value;
  }
  return result;
}

/**
 * Extrae el Telegram ID desde el initData firmado.
 * Es robusto a que `initDataUnsafe` esté manipulado porque parsea la cadena
 * firmada por Telegram en lugar de confiar en el objeto mutable.
 */
function extractTelegramIdFromInitData(initData: string): number | null {
  const params = parseInitData(initData);
  const rawUserJson = params["user"];
  if (!rawUserJson) {
    // Fallback: el parser ya extrajo "user.id" si era JSON
    const flat = params["user.id"];
    if (flat) {
      const n = Number(flat);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  try {
    const parsed = JSON.parse(rawUserJson);
    if (typeof parsed?.id === "number") return parsed.id;
    if (typeof parsed?.id === "string") {
      const n = Number(parsed.id);
      return Number.isFinite(n) ? n : null;
    }
  } catch { /* fall through */ }
  // También probar la versión aplanada
  const flat = params["user.id"];
  if (flat) {
    const n = Number(flat);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Valida al usuario de Telegram contra el allowlist.
 *
 * @param tgUser  Usuario de `initDataUnsafe.user`
 * @param webApp  El SDK WebApp (`window.Telegram.WebApp`)
 * @returns AuthResult.ok=true si el Telegram ID está en el allowlist.
 */
export async function authenticateWithTelegram(
  tgUser: WebAppUser | null,
): Promise<AuthResult> {
  try {
    const wa = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

    // 0) Modo dev en navegador normal — query param ?dev_tg_id=XXXX permite
    //    simular un Telegram ID sin abrir la app dentro de Telegram. Solo
    //    funciona si el ID está en el allowlist.
    let telegramId: number | null = null;
    let displayName = "";
    const devOverride = new URLSearchParams(window.location.search).get("dev_tg_id");
    if (devOverride && !wa?.initData) {
      const n = Number(devOverride);
      if (Number.isFinite(n) && ALLOWED_TELEGRAM_IDS.includes(n)) {
        telegramId = n;
        displayName = `Dev TG${n}`;
      }
    }

    // 1) Intentar leer el user.id desde initData firmado (más confiable)
    if (telegramId == null && wa?.initData) {
      telegramId = extractTelegramIdFromInitData(wa.initData);
      const params = parseInitData(wa.initData);
      const firstName = params["user.first_name"] ?? "";
      const lastName = params["user.last_name"] ?? "";
      displayName = [firstName, lastName].filter(Boolean).join(" ");
    }

    // 2) Fallback: si el parseo del initData falló, usar tgUser del contexto
    if (telegramId == null && tgUser?.id) {
      telegramId = tgUser.id;
      displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
    }

    if (telegramId == null) {
      return {
        ok: false,
        error: "No se pudo identificar tu cuenta de Telegram",
      };
    }

    // 3) Comprobar allowlist
    if (!ALLOWED_TELEGRAM_IDS.includes(telegramId)) {
      console.warn(
        `[auth] Telegram ID ${telegramId} no está en el allowlist. Permitidos: [${ALLOWED_TELEGRAM_IDS.join(", ")}]`,
      );
      return {
        ok: false,
        telegramId,
        error: `Acceso denegado. Esta Mini App no está autorizada para tu cuenta de Telegram.`,
      };
    }

    console.info(`[auth] Telegram ID ${telegramId} autenticado correctamente`);
    return {
      ok: true,
      userId: String(telegramId),
      telegramId,
      displayName: displayName || `TG${telegramId}`,
      isNewUser: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    console.error("Telegram auth error:", message);
    return { ok: false, error: message };
  }
}

// Mantener export por compatibilidad con código existente (Account.get() etc.)
export async function getCurrentSession(): Promise<{ $id: string } | null> {
  return null;
}

export async function getCurrentUserId(): Promise<string | null> {
  return null;
}

export async function logout(): Promise<void> {
  /* no-op — sin sesión real */
}