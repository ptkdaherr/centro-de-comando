// =============================================================
// Centro de Comando — Service Worker (Fase 3c, PWA)
//
// Estratégia: NETWORK-FIRST com fallback de cache.
//  - Sempre tenta a rede primeiro => em dev o live reload continua
//    pegando a versão fresca, e os dados nunca ficam presos no cache.
//  - Se a rede falhar (offline / blip de CDN), serve do cache; em
//    navegação, cai pro app shell ('/') guardado.
//
// REGRA DE OURO: nunca interceptar /api/* nem /__livereload.
//  - /api/* precisa do cookie de sessão e respostas sempre frescas.
//  - /__livereload é um stream SSE keep-alive; cachear/!respondWith
//    quebraria o live reload. Para ambos, deixamos o browser cuidar.
// =============================================================
const VERSION = 'cdc-pwa-v2';
const CACHE = VERSION;

// App shell same-origin: o mínimo pra abrir a casca do app.
// React/ReactDOM/Babel (unpkg) e as fontes (Google) entram no cache
// em runtime na primeira carga online — não dá pra precachear de forma
// confiável (CDN pode falhar e travaria o install).
const SHELL = [
  '/',
  '/support.js',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // mesmo se um item faltar, não trava a instalação
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// permite atualizar o SW na hora a partir da página (postMessage SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/PUT (login, /api/state...) passam direto

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // nunca tocar na API nem no canal de live reload
  if (sameOrigin && (url.pathname.startsWith('/api/') || url.pathname === '/__livereload')) return;
  // nunca interceptar o YouTube/áudio: o player de música precisa ir DIRETO na rede
  // (cachear resposta opaca do YouTube quebrava a reprodução)
  if (!sameOrigin && /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com)$/i.test(url.hostname)) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        // guarda uma cópia das respostas utilizáveis (inclui opacas de CDN)
        if (resp && (resp.ok || resp.type === 'opaque')) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          // offline e sem cache exato: navegação cai pro app shell
          if (req.mode === 'navigate') return caches.match('/');
          return Response.error();
        })
      )
  );
});
