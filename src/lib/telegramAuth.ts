/**
 * Telegram Auth — autenticación vía Telegram initData + prefs de Appwrite.
 *
 * Flujo:
 *  1. Lee Telegram initData → user.id (ej: 6341670106)
 *  2. Lista todos los usuarios Appwrite y busca el que tenga prefs.tg === telegramId
 *  3. Si existe → genera token de sesión y lo activa
 *  4. Si no → crea usuario, guarda prefs.tg, genera token, activa sesión
 *
 * Usa la REST API de Appwrite porque el SDK web no incluye Users.
 */

import { ID, type Models } from "appwrite";
import { APPWRITE_CONFIG } from "../config";
import { account } from "./appwrite";
import type { WebAppUser } from "./TelegramContext";

// ── Constantes ────────────────────────────────────────────────

const API = APPWRITE_CONFIG.endpoint;
const PID = APPWRITE_CONFIG.projectId;
const KEY = APPWRITE_CONFIG.apiKey;

function headers(): Record<string, string> {
  return {
    "X-Appwrite-Project": PID,
    "X-Appwrite-Key": KEY,
    "Content-Type": "application/json",
  };
}

function telegramEmail(telegramId: number): string {
  return `tg_${telegramId}@freeworks.app`;
}

// ── REST API ──────────────────────────────────────────────────

interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  prefs: Record<string, unknown>;
}

/** Lista TODOS los usuarios (MVP — para pocos usuarios va bien) */
async function listAllUsers(): Promise<AppwriteUser[]> {
  const res = await fetch(`${API}/users`, { headers: headers() });
  if (!res.ok) throw new Error(`listUsers failed: ${res.status}`);
  const data = await res.json();
  return data.users ?? [];
}

async function createUser(email: string, name: string, prefs: Record<string, unknown>): Promise<AppwriteUser> {
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ userId: ID.unique(), email, name, prefs }),
  });
  if (!res.ok) throw new Error(`createUser failed: ${res.status}`);
  return res.json();
}

async function createUserToken(userId: string): Promise<{ secret: string }> {
  const res = await fetch(`${API}/users/${userId}/tokens`, {
    method: "POST",
    headers: {
      "X-Appwrite-Project": PID,
      "X-Appwrite-Key": KEY,
    },
  });
  if (!res.ok) throw new Error(`createToken failed: ${res.status}`);
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────

export interface AuthResult {
  ok: boolean;
  userId?: string;
  isNewUser?: boolean;
  error?: string;
}

export async function authenticateWithTelegram(
  tgUser: WebAppUser
): Promise<AuthResult> {
  try {
    // 0) Limpiar cualquier sesión previa para evitar "session is active"
    try { await account.deleteSessions(); } catch { /* noop */ }

    // 1) Listar todos los usuarios y buscar por prefs.tg
    const allUsers = await listAllUsers();
    const existing = allUsers.find((u) => String(u.prefs?.tg) === String(tgUser.id));

    if (existing) {
      const token = await createUserToken(existing.$id);
      await account.createSession(existing.$id, token.secret);
      return { ok: true, userId: existing.$id, isNewUser: false };
    }

    // 2) No existe → crear con prefs.tg
    const email = telegramEmail(tgUser.id);
    const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || `TG${tgUser.id}`;
    const newUser = await createUser(email, name, { tg: tgUser.id });

    const token = await createUserToken(newUser.$id);
    await account.createSession(newUser.$id, token.secret);

    return { ok: true, userId: newUser.$id, isNewUser: true };

  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    console.error("Telegram auth error:", message);
    return { ok: false, error: message };
  }
}

// ── Session ───────────────────────────────────────────────────

export async function getCurrentSession(): Promise<Models.User<Models.Preferences> | null> {
  try { return await account.get(); } catch { return null; }
}

export async function logout(): Promise<void> {
  try { await account.deleteSessions(); } catch { /* noop */ }
}
