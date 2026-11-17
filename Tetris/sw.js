// Network-only: never cache invitations, private pages, APIs or saved game state.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (![scope, scope + 'index.html', scope + 'index.php'].includes(url.pathname)) return;
  event.respondWith(fetch(request).catch(() => new Response("<!doctype html><html lang=\"nb\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Biancas Tetris – uten nett</title><style>body{max-width:32em;margin:15vh auto;padding:24px;background:#fffaf2;color:#294c42;font:18px/1.5 system-ui}a{display:inline-block;padding:12px 18px;background:#386b54;color:white;border-radius:12px}</style><h1>Biancas Tetris</h1><p>Du er uten nett akkurat nå. Koble til internett og åpne appen igjen for å fortsette.</p><p>Du ser ikke en oppdatert spilltilstand mens forbindelsen mangler.</p><a href=\"/Bianca/Tetris/\">Prøv igjen</a></html>", {status: 503, headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
