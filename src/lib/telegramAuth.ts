/**
 * Telegram Auth — autenticación vía Telegram initData + colección user_telegram.
 *
 * Flujo:
 *  1. Lee Telegram initData → user.id (ej: 6341670106)
 *  2. Busca en colección user_telegram por telegram_id
 *  3. Si existe → genera token de sesión y lo activa
 *  4. Si no → crea usuario Appwrite, guarda mapping, genera token, activa sesión
 */

import { ID, Query, type Models } from "appwrite";
import { APPWRITE_CONFIG } from "../config";
import { account, serverDb, DB } from "./appwrite";
import type { WebAppUser } from "./TelegramContext";

// ── Constantes ────────────────────────────────────────────────

const COLLECTION = "user_telegram";
const API = APPWRITE_CONFIG.endpoint;
const PID = APPWRITE_CONFIG.projectId;
const KEY = APPWRITE_CONFIG.apiKey;

function telegramEmail(telegramId: number): string {
  return `tg_${telegramId}@freeworks.app`;
}

// ── DB helpers (usan serverDb — API key) ─────────────────────

async function findMappingByTelegramId(telegramId: number): Promise<{ $id: string; telegram_id: number; appwrite_user_id: string } | null> {
  try {
    const res = await serverDb.listDocuments(DB, COLLECTION, [
      Query.equal("telegram_id", telegramId),
      Query.limit(1),
    ]);
    return (res.documents[0] as unknown as { $id: string; telegram_id: number; appwrite_user_id: string }) ?? null;
  } catch {
    return null;
  }
}

async function createMapping(telegramId: number, appwriteUserId: string): Promise<void> {
  await serverDb.createDocument(DB, COLLECTION, ID.unique(), {
    telegram_id: telegramId,
    appwrite_user_id: appwriteUserId,
  });
}

// ── REST API (users.* — no disponible en SDK web) ─────────────

function headers(): Record<string, string> {
  return { "X-Appwrite-Project": PID, "X-Appwrite-Key": KEY, "Content-Type": "application/json" };
}

async function createAppwriteUser(email: string, name: string, prefs: Record<string, unknown>): Promise<{ $id: string }> {
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
    headers: { "X-Appwrite-Project": PID, "X-Appwrite-Key": KEY },
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
    // 0) Limpiar sesión previa
    try { await account.deleteSessions(); } catch { /* noop */ }

    // 1) Buscar mapping en colección (barato — una query)
    const mapping = await findMappingByTelegramId(tgUser.id);

    if (mapping) {
      const token = await createUserToken(mapping.appwrite_user_id);
      await account.createSession(mapping.appwrite_user_id, token.secret);
      return { ok: true, userId: mapping.appwrite_user_id, isNewUser: false };
    }

    // 2) No existe → crear usuario + mapping
    const email = telegramEmail(tgUser.id);
    const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || `TG${tgUser.id}`;
    const newUser = await createAppwriteUser(email, name, { tg: tgUser.id });

    await createMapping(tgUser.id, newUser.$id);

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
