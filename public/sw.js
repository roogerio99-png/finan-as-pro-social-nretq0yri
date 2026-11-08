// Service Worker para SimplaFin
// Política estrita:
// 1. Pré-cache validado sem engolir erros silenciosamente
// 2. Atualização coordenada via mensagem SKIP_WAITING (sem interromper formulários abertos)
// 3. Limpeza restrita exclusivamente ao prefixo gestio-financas-shell-
// 4. Cache-First para ativos imutáveis com hash (/assets/*) e Network-First para HTML/metadados

const CACHE_PREFIX = 'gestio-financas-shell-'
const CACHE_NAME = `${CACHE_PREFIX}v27`

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.ico',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
              return caches.delete(key)
            }
            return Promise.resolve()
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request

  if (req.method !== 'GET') {
    return
  }

  const url = new URL(req.url)

  // Nunca interceptar chamadas de API ou recursos com nocache
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/backend') ||
    url.pathname.startsWith('/_/') ||
    url.searchParams.has('nocache')
  ) {
    return
  }

  // Ignorar origens externas
  if (url.origin !== self.location.origin) {
    return
  }

  // Metadados de versão e licença: sempre Network-First sem cachear estático antigo
  if (
    url.pathname === '/version.json' ||
    url.pathname === '/app-license.json' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(async () => {
        const cached = await caches.match(req)
        return (
          cached ||
          new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }),
    )
    return
  }

  // Navegação SPA (HTML principal): Network-First com fallback para /index.html do cache
  if (req.mode === 'navigate' || url.pathname === '/index.html' || url.pathname === '/') {
    event.respondWith(
      fetch(req)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME)
            cache.put('/index.html', networkResponse.clone())
          }
          return networkResponse
        })
        .catch(async () => {
          const cached = await caches.match('/index.html')
          return cached || (await caches.match('/'))
        }),
    )
    return
  }

  // Ativos imutáveis versionados por hash (/assets/*): Cache-First
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(async (cached) => {
        if (cached) {
          return cached
        }
        try {
          const networkResponse = await fetch(req)
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(req, networkResponse.clone())
          }
          return networkResponse
        } catch {
          return new Response('Ativo indisponível offline.', {
            status: 503,
            statusText: 'Offline',
          })
        }
      }),
    )
    return
  }

  // Ícones, manifesto e demais estáticos da raiz: Stale-While-Revalidate / Network-First seguro
  const isRootStatic =
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webmanifest')

  if (isRootStatic) {
    event.respondWith(
      caches.match(req).then(async (cached) => {
        const networkPromise = fetch(req)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME)
              cache.put(req, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => cached)

        return cached || networkPromise
      }),
    )
  }
})
