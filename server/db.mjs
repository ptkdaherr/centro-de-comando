// =============================================================
// Centro de Comando — camada de dados (libSQL / Turso)
// MULTIUSUÁRIO. Local (dev) = arquivo SQLite via libSQL.
// Hospedado (Render) = banco Turso na nuvem (TURSO_DATABASE_URL).
// Mantém o dialeto SQLite; só passou a ser assíncrono.
// =============================================================
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Onde fica o banco:
//  - TURSO_DATABASE_URL definido  -> Turso na nuvem (produção/Render)
//  - senão                        -> arquivo local (dev), em CDC_DATA_DIR ou server/data
function resolveUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dir = process.env.CDC_DATA_DIR || path.join(__dirname, 'data');
  fs.mkdirSync(dir, { recursive: true });
  return 'file:' + path.join(dir, 'cdc.sqlite');
}

export const db = createClient({
  url: resolveUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Cria as tabelas (idempotente). Chamado uma vez no boot, ANTES de aceitar requisições.
export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      gemini_key TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS state_store (
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      tool TEXT NOT NULL,
      args TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);
}

// ---- usuários ----
export async function createUser(username, passwordHash) {
  const r = await db.execute({
    sql: 'INSERT INTO users (username, password_hash, gemini_key, created_at) VALUES (?, ?, ?, ?)',
    args: [username, passwordHash, '', new Date().toISOString()],
  });
  return Number(r.lastInsertRowid);
}
export async function getUserByUsername(username) {
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE username = ? COLLATE NOCASE', args: [username] });
  return r.rows[0] || null;
}
export async function getUserById(id) {
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return r.rows[0] || null;
}
export async function setUserGeminiKey(id, key) {
  await db.execute({ sql: 'UPDATE users SET gemini_key = ? WHERE id = ?', args: [key || '', id] });
}
export async function userCount() {
  const r = await db.execute('SELECT COUNT(*) AS n FROM users');
  return Number(r.rows[0].n);
}

// ---- histórico de ações do Assistente (por usuário) ----
export async function logAction(userId, tool, args, summary) {
  const r = await db.execute({
    sql: "INSERT INTO audit_log (user_id, created_at, tool, args, summary, status) VALUES (?, ?, ?, ?, ?, 'proposed')",
    args: [userId, new Date().toISOString(), tool, JSON.stringify(args), summary],
  });
  return Number(r.lastInsertRowid);
}
export async function updateActionStatus(userId, id, status) {
  await db.execute({ sql: 'UPDATE audit_log SET status = ? WHERE id = ? AND user_id = ?', args: [status, id, userId] });
}
export async function listActions(userId, limit = 50) {
  const r = await db.execute({
    sql: 'SELECT id, created_at, tool, args, summary, status FROM audit_log WHERE user_id = ? ORDER BY id DESC LIMIT ?',
    args: [userId, limit],
  });
  return r.rows.map((row) => ({ ...row, args: JSON.parse(row.args) }));
}

// ---- state (snapshot por usuário) ----
export const STATE_KEYS = ['clients', 'prospectos', 'demands', 'ideias', 'lancamentos', 'wfNodesExtra', 'reminders'];

export async function getState(userId) {
  const r = await db.execute({ sql: 'SELECT key, value FROM state_store WHERE user_id = ?', args: [userId] });
  const out = {};
  for (const row of r.rows) {
    if (!STATE_KEYS.includes(row.key)) continue;
    try { out[row.key] = JSON.parse(row.value); } catch { /* linha corrompida — ignora */ }
  }
  return out;
}
export async function saveState(userId, partial) {
  const now = new Date().toISOString();
  for (const key of STATE_KEYS) {
    if (partial[key] === undefined) continue;
    await db.execute({
      sql: `INSERT INTO state_store (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [userId, key, JSON.stringify(partial[key]), now],
    });
  }
}
