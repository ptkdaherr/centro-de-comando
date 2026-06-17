// =============================================================
// Centro de Comando (.exe) — dev server com live reload (zero deps)
// Serve a raiz do projeto; "/" abre direto o Centro de Comando.dc.html
// =============================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 5174;
const MAIN_FILE = 'Centro de Comando.dc.html';

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

const clients = new Set();

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  // SSE endpoint
  if (url === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let filePath;
  if (url === '/') filePath = path.join(ROOT, MAIN_FILE);
  else if (url.endsWith('/')) filePath = path.join(ROOT, url, 'index.html');
  else filePath = path.join(ROOT, url);

  // segurança: não sair da raiz
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.stat(filePath, (err, stat) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 — ' + url); return; }
    if (stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); }

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

// ---- watcher: dispara reload (com debounce), ignora .git/node_modules ----
let timer = null;
function triggerReload(file) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    process.stdout.write(`  ↻ alterado: ${file} — recarregando\n`);
    for (const c of clients) c.write('data: reload\n\n');
  }, 80);
}
function shouldIgnore(fn) {
  if (!fn) return false;
  return fn.startsWith('.git') || fn.startsWith('node_modules');
}
try {
  fs.watch(ROOT, { recursive: true }, (_evt, fn) => { if (!shouldIgnore(fn)) triggerReload(fn || 'arquivo'); });
} catch {
  fs.watch(ROOT, (_evt, fn) => { if (!shouldIgnore(fn)) triggerReload(fn || 'arquivo'); });
}

server.listen(PORT, () => {
  const link = `http://localhost:${PORT}/`;
  console.log('\n  Centro de Comando (exe) — dev server\n');
  console.log(`  ➜  Local:   ${link}`);
  console.log('  ➜  Live reload ativo (salve um arquivo e o navegador atualiza)\n');
  console.log('  Ctrl+C para parar.\n');
  const opener = process.platform === 'win32' ? `start "" "${link}"` : process.platform === 'darwin' ? `open "${link}"` : `xdg-open "${link}"`;
  exec(opener);
});
