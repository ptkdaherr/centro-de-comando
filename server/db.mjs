// =============================================================
// Centro de Comando — camada de dados (SQLite via node:sqlite)
// Substitui o localStorage: cada chave do state persistido vira
// uma linha em state_store, fonte única de verdade do backend.
// =============================================================
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, 'cdc.sqlite');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS state_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Mesmas chaves que hoje compõem o snapshot salvo no localStorage
// (_persistKeys em "Centro de Comando.dc.html").
export const STATE_KEYS = ['clients', 'prospectos', 'demands', 'ideias', 'lancamentos', 'wfNodesExtra'];

const selectAllStmt = db.prepare('SELECT key, value FROM state_store');
const upsertStmt = db.prepare(`
  INSERT INTO state_store (key, value, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

export function getState() {
  const out = {};
  for (const row of selectAllStmt.all()) {
    if (!STATE_KEYS.includes(row.key)) continue;
    try { out[row.key] = JSON.parse(row.value); } catch { /* linha corrompida — ignora */ }
  }
  return out;
}

export function saveState(partial) {
  const now = new Date().toISOString();
  for (const key of STATE_KEYS) {
    if (partial[key] === undefined) continue;
    upsertStmt.run(key, JSON.stringify(partial[key]), now);
  }
}
