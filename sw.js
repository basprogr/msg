const CACHE_NAME = 'link-pwa';
const ASSETS_TO_CACHE = [
  '/',
  './index.html',
  './manifest.json',
  './notify.mp3',
  './img/user1.jpg',
  './img/user2.jpg',
  './img/logo192.jpg',
  './img/logo512.jpg'
];

// Install Service Worker dan cache semua aset utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Aktivasi dan bersihkan cache lama jika ada pembaruan
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategi Fetch: Network-first untuk API/Supabase, Cache-first untuk aset statis
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Lewati request non-GET atau request ke eksternal (seperti Supabase / OneSignal)
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Ambil dari cache, tapi update cache di background (stale-while-revalidate ringan)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Fallback opsional jika offline total dan halaman tidak ada di cache
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// --- TAMBAHAN UNTUK WEB PUSH NOTIFICATION ---

// Menangkap event push dari server / Supabase
self.addEventListener('push', (event) => {
  let data = { title: 'Pesan Baru', body: 'Kamu mendapat pesan baru!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './img/logo192.jpg',
    badge: './img/logo192.jpg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Aksi ketika notifikasi diklik oleh user
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});