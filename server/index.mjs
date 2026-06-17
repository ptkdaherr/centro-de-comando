// =============================================================
// Centro de Comando — servidor local (Fase 3a)
// Estáticos + live reload (mesmo papel do tools/dev-server.mjs)
// + API REST autenticada (/api/login, /api/logout, /api/me, /api/state)
// que substitui o localStorage por SQLite como fonte de verdade.
// =============================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { getState, saveState, logAction, updateActionStatus, listActions } from './db.mjs';
import {
  verifyPassword, createSession, isValidSession, destroySession,
  isLocked, recordFailure, recordSuccess, parseCookies,
  SESSION_COOKIE, buildSessionCookie, buildClearCookie,
} from './auth.mjs';
import { askGemini } from './gemini.mjs';
import { summarizeAction } from './tools.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 5174;
const MAIN_FILE = 'Centro de Comando.dc.html';

function loadEnv(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

const env = loadEnv(path.join(__dirname, '.env'));
const APP_PASSWORD_HASH = env.APP_PASSWORD_HASH;
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!APP_PASSWORD_HASH) {
  console.error('\n  Nenhuma senha configurada ainda.\n  Rode primeiro: npm run setup\n');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// ---- live reload: snippet injetado em todo HTML ----
const LR_SNIPPET = `
<script>
(function(){
  var es = new EventSource('/__livereload');
  es.onmessage = function(e){ if (e.data === 'reload') location.reload(); };
  es.onerror = function(){ /* reconecta sozinho */ };
})();
</script>`;

const sseClients = new Set();

// ---- helpers da API ----
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) { reject(new Error('payload grande demais')); req.destroy(); }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function getSessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

function requireAuth(req, res) {
  if (!isValidSession(getSessionToken(req))) {
    sendJson(res, 401, { error: 'não autenticado' });
    return false;
  }
  return true;
}

// ---- rate limit simples do chat IA: no máx. 50 mensagens/hora por IP,
// pra não estourar a cota grátis do Gemini por engano ----
const CHAT_LIMIT = 50;
const CHAT_WINDOW_MS = 60 * 60 * 1000;
const chatHits = new Map();

function chatRateLimited(ip) {
  const now = Date.now();
  const hits = (chatHits.get(ip) || []).filter((t) => now - t < CHAT_WINDOW_MS);
  if (hits.length >= CHAT_LIMIT) { chatHits.set(ip, hits); return true; }
  hits.push(now);
  chatHits.set(ip, hits);
  return false;
}

async function handleApi(req, res, url) {
  const ip = req.socket.remoteAddress || 'unknown';

  if (url === '/api/login' && req.method === 'POST') {
    if (isLocked(ip)) return sendJson(res, 429, { error: 'muitas tentativas — aguarde alguns minutos' });
    let body;
    try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: 'corpo inválido' }); }
    const ok = typeof body.password === 'string' && verifyPassword(body.password, APP_PASSWORD_HASH);
    if (!ok) { recordFailure(ip); return sendJson(res, 401, { error: 'senha incorreta' }); }
    recordSuccess(ip);
    const token = createSession();
    res.setHeader('Set-Cookie', buildSessionCookie(token));
    return sendJson(res, 200, { ok: true });
  }

  if (url === '/api/logout' && req.method === 'POST') {
    destroySession(getSessionToken(req));
    res.setHeader('Set-Cookie', buildClearCookie());
    return sendJson(res, 200, { ok: true });
  }

  if (url === '/api/me' && req.method === 'GET') {
    return sendJson(res, 200, { ok: isValidSession(getSessionToken(req)) });
  }

  if (url === '/api/state' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    return sendJson(res, 200, getState());
  }

  if (url === '/api/state' && req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    let body;
    try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: 'corpo inválido' }); }
    saveState(body);
    return sendJson(res, 200, { ok: true });
  }

  if (url === '/api/chat' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    if (chatRateLimited(ip)) return sendJson(res, 429, { error: 'muitas mensagens nessa hora — aguarde um pouco' });
    let body;
    try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: 'corpo inválido' }); }
    const history = Array.isArray(body.history) ? body.history.slice(-30) : [];

    if (!GEMINI_API_KEY) {
      return sendJson(res, 200, {
        reply: 'O assistente ainda não está configurado — falta colocar a chave do Gemini no servidor (GEMINI_API_KEY no server/.env). Rode "npm run setup" pra cadastrar uma chave grátis.',
        pendingAction: null,
      });
    }

    const currentState = getState();
    let result;
    try {
      result = await askGemini({ history, currentState, apiKey: GEMINI_API_KEY, model: GEMINI_MODEL });
    } catch (e) {
      return sendJson(res, 200, { reply: `Não consegui falar com o Gemini agora: ${e.message}`, pendingAction: null });
    }

    let pendingAction = null;
    if (result.functionCall) {
      const { name, args } = result.functionCall;
      const summary = summarizeAction(name, args, currentState);
      const id = logAction(name, args, summary);
      pendingAction = { id, tool: name, args, summary };
    }
    return sendJson(res, 200, { reply: result.text, pendingAction });
  }

  if (url === '/api/chat/resolve' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    let body;
    try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: 'corpo inválido' }); }
    if (!Number.isInteger(body.id) || !['applied', 'rejected'].includes(body.status)) {
      return sendJson(res, 400, { error: 'parâmetros inválidos' });
    }
    updateActionStatus(body.id, body.status);
    return sendJson(res, 200, { ok: true });
  }

  if (url === '/api/audit' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    return sendJson(res, 200, { items: listActions(50) });
  }

  sendJson(res, 404, { error: 'rota não encontrada' });
}

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url.startsWith('/api/')) {
    try { await handleApi(req, res, url); }
    catch { sendJson(res, 500, { error: 'erro interno' }); }
    return;
  }

  // SSE endpoint (live reload)
  if (url === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  let filePath;
  if (url === '/') filePath = path.join(ROOT, MAIN_FILE);
  else if (url.endsWith('/')) filePath = path.join(ROOT, url, 'index.html');
  else filePath = path.join(ROOT, url);

  // segurança: não sair da raiz do projeto, e nunca servir server/.env ou o banco
  if (!filePath.startsWith(ROOT) || filePath.startsWith(path.join(ROOT, 'server'))) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 — ' + url); return; }
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');

    const ext = path.extname(filePath).toLowerCase();
    fs.readFile(filePath, (e2, data) => {
      if (e2) { res.writeHead(404); res.end('404'); return; }
      if (ext === '.html') {
        const html = data.toString('utf8').replace('</body>', LR_SNIPPET + '\n</body>');
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
        res.end(html);
      } else {
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      }
    });
  });
});

// ---- watcher: dispara reload (com debounce), ignora .git/node_modules/server/data e .env ----
let timer = null;
function triggerReload(file) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    process.stdout.write(`  ↻ alterado: ${file} — recarregando\n`);
    for (const c of sseClients) c.write('data: reload\n\n');
  }, 80);
}
function shouldIgnore(fn) {
  if (!fn) return false;
  const norm = fn.split(path.sep).join('/');
  return norm.startsWith('.git') || norm.startsWith('node_modules')
    || norm.startsWith('server/data') || norm === 'server/.env';
}
try {
  fs.watch(ROOT, { recursive: true }, (_evt, fn) => { if (!shouldIgnore(fn)) triggerReload(fn || 'arquivo'); });
} catch {
  fs.watch(ROOT, (_evt, fn) => { if (!shouldIgnore(fn)) triggerReload(fn || 'arquivo'); });
}

server.listen(PORT, () => {
  const link = `http://localhost:${PORT}/`;
  console.log('\n  Centro de Comando — servidor (Fase 3a: backend + auth + SQLite)\n');
  console.log(`  ➜  Local:   ${link}`);
  console.log('  ➜  Live reload ativo (salve um arquivo e o navegador atualiza)\n');
  console.log('  Ctrl+C para parar.\n');
  const opener = process.platform === 'win32' ? `start "" "${link}"` : process.platform === 'darwin' ? `open "${link}"` : `xdg-open "${link}"`;
  exec(opener);
});
