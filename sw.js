/* ══════════════════════════════════════════
   AURA FOODS — Service Worker
   ══════════════════════════════════════════ */

const CACHE_NAME = 'aura-foods-v1';

// File da mettere in cache per uso offline
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/img/image.png',
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Installazione: mette in cache i file statici
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Aggiunge i file locali (ignora gli errori sui CDN esterni)
      return cache.addAll([
        '/',
        '/index.html',
        '/css/style.css',
        '/js/app.js',
        '/img/image.png'
      ]);
    })
  );
  self.skipWaiting();
});

// Attivazione: rimuove cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: prima prova la rete, se offline usa la cache
self.addEventListener('fetch', event => {
  // Non intercettare le chiamate a Supabase (devono sempre andare in rete)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se la risposta è valida, aggiorna la cache
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Rete non disponibile: usa la cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback finale: index.html per le navigazioni
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// ═══ PUSH NOTIFICATIONS ═══
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/img/icon-180.png',
      badge: '/img/icon-180.png',
      tag: data.tag || 'aura-scadenza',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
