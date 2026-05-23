/* ══════════════════════════════════════════
   AURA FOODS — Service Worker
   ══════════════════════════════════════════ */

const CACHE_NAME = 'aura-foods-v3';

const ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/css/style.css',
  '/js/app.js',
  '/js/config.js',
  '/js/notifications.js',
  '/img/image.png',
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/app.html',
        '/css/style.css',
        '/js/app.js',
        '/js/config.js',
        '/js/notifications.js',
        '/img/image.png'
      ]);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/app.html');
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
      data: { url: data.url || '/app.html' },
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(event.notification.data.url || '/app.html');
    })
  );
});
