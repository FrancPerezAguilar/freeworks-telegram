/**
 * Telegram Auth — autenticación vía Telegram initData + labels de Appwrite.
 *
 * Flujo:
 *  1. Lee Telegram initData → user.id (ej: 6341670106)
 *  2. Busca usuario Appwrite con label "tg:6341670106"
 *  3. Si existe → genera token de sesión y lo activa
 *  4. Si no → crea usuario Appwrite, añade label, genera token, activa sesión
 *
 * NOTA: Usa la REST API de Appwrite para operaciones de users.* porque
 * el SDK web no incluye el servicio Users (solo server-side SDK).
 */

import { ID, type Models } from "appwrite";
import { APPWRITE_CONFIG } from "../config";
import { account } from "./appwrite";
import type { WebAppUser } from "./TelegramContext";

// ── Constantes ────────────────────────────────────────────────

const API = APPWRITE_CONFIG.endpoint;
const PID = APPWRITE_CONFIG.projectId;
const KEY = APPWRITE_CONFIG.apiKey;

function tgLabel(telegramId: number): string {
  return `tg:${telegramId}`;
}

function telegramEmail(telegramId: number): string {
  return `tg_${telegramId}@freeworks.app`;
}

function authHeaders(): Record<string, string> {
  return {
    "X-Appwrite-Project": PID,
    "X-Appwrite-Key": KEY,
    "Content-Type": "application/json",
  };
}

// ── REST API helpers ──────────────────────────────────────────

interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  labels: string[];
}

async function listUsers(queries: string[]): Promise<AppwriteUser[]> {
  const qs = queries.map((q) => `queries[]=${encodeURIComponent(q)}`).join("&");
  const url = `${API}/users?${qs}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`listUsers failed: ${res.status}`);
  const data = await res.json();
  return data.users ?? [];
}

async function createUser(email: string, name: string): Promise<AppwriteUser> {
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId: ID.unique(), email, name }),
  });
  if (!res.ok) throw new Error(`createUser failed: ${res.status}`);
  return res.json();
}

async function updateUserLabels(userId: string, labels: string[]): Promise<void> {
  const res = await fetch(`${API}/users/${userId}/labels`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ labels }),
  });
  if (!res.ok) throw new Error(`updateLabels failed: ${res.status}`);
}

async function createUserToken(userId: string): Promise<{ secret: string }> {
  const res = await fetch(`${API}/users/${userId}/tokens`, {
    method: "POST",
    headers: authHeaders(),
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
  const label = tgLabel(tgUser.id);
  const email = telegramEmail(tgUser.id);

  try {
    // 1) Buscar usuario existente por label
    const users = await listUsers([`equal("labels","${label}")`]);

    if (users.length > 0) {
      const token = await createUserToken(users[0].$id);
      await account.createSession(users[0].$id, token.secret);
      return { ok: true, userId: users[0].$id, isNewUser: false };
    }

    // 2) No existe → crear
    const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || `TG${tgUser.id}`;
    const newUser = await createUser(email, name);
    await updateUserLabels(newUser.$id, [label]);

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
