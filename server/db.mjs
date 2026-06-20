// =============================================================
// Centro de Comando — camada de dados (SQLite via node:sqlite)
// MULTIUSUÁRIO: cada conta tem seus próprios dados, isolados por user_id.
// =============================================================
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// No app empacotado/hospedado o banco vai pra um diretório gravável
// (CDC_DATA_DIR). Em dev usa server/data.
const DATA_DIR = process.env.CDC_DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, 'cdc.sqlite');
export const db = new DatabaseSync(DB_PATH);

// ---- migração: esquema antigo single-tenant -> multiusuário ----
// Se as tabelas existirem sem user_id (versão antiga), recria.
function tableInfo(table) { try { return db.prepare(`PRAGMA table_info(${table})`).all(); } catch { return []; } }
function hasColumn(table, col) { return tableInfo(table).some((c) => c.name === col); }
if (tableInfo('state_store').length && !hasColumn('state_store', 'user_id')) db.exec('DROP TABLE state_store');
if (tableInfo('audit_log').length && !hasColumn('audit_log', 'user_id')) db.exec('DROP TABLE audit_log');

db.exec(`
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

// ---- usuários ----
const insertUserStmt = db.prepare('INSERT INTO users (username, password_hash, gemini_key, created_at) VALUES (?, ?, ?, ?)');
const getUserByNameStmt = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
const getUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const setGeminiStmt = db.prepare('UPDATE users SET gemini_key = ? WHERE id = ?');
const countUsersStmt = db.prepare('SELECT COUNT(*) AS n FROM users');

export function createUser(username, passwordHash) {
  const r = insertUserStmt.run(username, passwordHash, '', new Date().toISOString());
  return Number(r.lastInsertRowid);
}
export function getUserByUsername(username) { return getUserByNameStmt.get(username) || null; }
export function getUserById(id) { return getUserByIdStmt.get(id) || null; }
export function setUserGeminiKey(id, key) { setGeminiStmt.run(key || '', id); }
export function userCount() { return Number(countUsersStmt.get().n); }

// ---- histórico de ações do Assistente IA (por usuário) ----
const insertActionStmt = db.prepare(`INSERT INTO audit_log (user_id, created_at, tool, args, summary, status) VALUES (?, ?, ?, ?, ?, 'proposed')`);
const updateActionStmt = db.prepare('UPDATE audit_log SET status = ? WHERE id = ? AND user_id = ?');
const listActionsStmt = db.prepare('SELECT id, created_at, tool, args, summary, status FROM audit_log WHERE user_id = ? ORDER BY id DESC LIMIT ?');

export function logAction(userId, tool, args, summary) {
  const r = insertActionStmt.run(userId, new Date().toISOString(), tool, JSON.stringify(args), summary);
  return Number(r.lastInsertRowid);
}
export function updateActionStatus(userId, id, status) { updateActionStmt.run(status, id, userId); }
export function listActions(userId, limit = 50) {
  return listActionsStmt.all(userId, limit).map((row) => ({ ...row, args: JSON.parse(row.args) }));
}

// ---- state (snapshot persistido, por usuário) ----
export const STATE_KEYS = ['clients', 'prospectos', 'demands', 'ideias', 'lancamentos', 'wfNodesExtra'];
const selectStateStmt = db.prepare('SELECT key, value FROM state_store WHERE user_id = ?');
const upsertStateStmt = db.prepare(`
  INSERT INTO state_store (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

export function getState(userId) {
  const out = {};
  for (const row of selectStateStmt.all(userId)) {
    if (!STATE_KEYS.includes(row.key)) continue;
    try { out[row.key] = JSON.parse(row.value); } catch { /* linha corrompida — ignora */ }
  }
  return out;
}
export function saveState(userId, partial) {
  const now = new Date().toISOString();
  for (const key of STATE_KEYS) {
    if (partial[key] === undefined) continue;
    upsertStateStmt.run(userId, key, JSON.stringify(partial[key]), now);
  }
}
