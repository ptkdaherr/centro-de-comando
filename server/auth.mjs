// =============================================================
// Centro de Comando — autenticação
// Hash de senha (scrypt), sessões em memória (cookie HTTP-only),
// rate limit de login por IP. Zero dependências externas.
// =============================================================
import crypto from 'node:crypto';
import { createSessionRow, getSessionRow, touchSessionRow, deleteSessionRow } from './db.mjs';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

// ---- sessões persistentes no banco (sobrevivem a restart/sleep/deploy do
// servidor — o usuário NÃO precisa logar de novo após ociosidade ou fechar o app) ----
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias

export const SESSION_COOKIE = 'cdc_session';

// sessão guarda o userId dono dela (multiusuário)
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await createSessionRow(token, userId, Date.now() + SESSION_TTL_MS);
  return token;
}

// devolve o userId da sessão (ou null se inválida/expirada); renova de forma
// deslizante quando passou da metade da validade, mantendo o uso ativo logado.
export async function getSessionUserId(token) {
  if (!token) return null;
  let s;
  try { s = await getSessionRow(token); } catch (e) { return null; }
  if (!s) return null;
  const exp = Number(s.expires_at);
  if (Date.now() > exp) { try { await deleteSessionRow(token); } catch (e) {} return null; }
  if (exp - Date.now() < SESSION_TTL_MS / 2) { try { await touchSessionRow(token, Date.now() + SESSION_TTL_MS); } catch (e) {} }
  return Number(s.user_id);
}

export async function destroySession(token) {
  if (token) { try { await deleteSessionRow(token); } catch (e) {} }
}

export function buildSessionCookie(token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function buildClearCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// ---- rate limit de login por IP ----
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000; // 5 minutos
const attempts = new Map();

export function isLocked(ip) {
  const a = attempts.get(ip);
  return !!(a && a.lockUntil && Date.now() < a.lockUntil);
}

export function recordFailure(ip) {
  const a = attempts.get(ip) || { count: 0, lockUntil: 0 };
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) {
    a.lockUntil = Date.now() + LOCK_MS;
    a.count = 0;
  }
  attempts.set(ip, a);
}

export function recordSuccess(ip) {
  attempts.delete(ip);
}
