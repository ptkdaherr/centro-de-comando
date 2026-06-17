// =============================================================
// Centro de Comando — autenticação
// Hash de senha (scrypt), sessões em memória (cookie HTTP-only),
// rate limit de login por IP. Zero dependências externas.
// =============================================================
import crypto from 'node:crypto';

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

// ---- sessões (token opaco em memória — não sobrevive a restart do servidor,
// o que é aceitável e até desejável para "segurança máxima": reinício força novo login) ----
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const sessions = new Map();

export const SESSION_COOKIE = 'cdc_session';

export function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function isValidSession(token) {
  if (!token) return false;
  const s = sessions.get(token);
  if (!s) return false;
  if (Date.now() > s.expiresAt) { sessions.delete(token); return false; }
  return true;
}

export function destroySession(token) {
  if (token) sessions.delete(token);
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
