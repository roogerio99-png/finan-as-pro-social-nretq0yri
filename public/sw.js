// Service Worker para Gestio Finanças
// Política estrita: Cache apenas de ativos estáticos (HTML/CSS/JS/SVGs/Fonts)
// NUNCA cachear requisições para a API do PocketBase (/api/* ou requisições dinâmicas de backend),
// garantindo que os dados financeiros estejam SEMPRE frescos e em tempo real.

const CACHE_NAME = 'gestio-financas-shell-v1'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.ico',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
            return Promise.resolve()
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Apenas métodos GET podem ser cacheados
  if (req.method !== 'GET') {
    return
  }

  const url = new URL(req.url)

  // NUNCA interceptar/cachear chamadas de API ou backend (PocketBase, Skip Cloud, connectors)
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/backend') ||
    url.pathname.startsWith('/_/') ||
    url.hostname.includes('pocketbase') ||
    url.searchParams.has('nocache')
  ) {
    return
  }

  // Requisições para outras origens (ex: CDN de imagens curling, fontes externas): network first
  if (url.origin !== self.location.origin) {
    return
  }

  // Para navegação SPA (HTML principal): Network first com fallback para cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.match('/index.html')
        return cached || (await caches.match('/'))
      }),
    )
    return
  }

  // Ativos estáticos locais (JS, CSS, imagens SVG/PNG): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webmanifest')

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req)
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      }),
    )
  }
})
