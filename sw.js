const CACHE_NAME = 'link-pwa';
 
const getBasePath = () => {
  const pathname = self.location.pathname;
  const pathSegments = pathname.split('/').filter(Boolean);
  
  // Jika di localhost dengan subfolder (misal /link-apk/)
  if (self.location.hostname === 'localhost' && pathSegments.length > 0 && pathSegments[0] !== 'sw.js') {
    return '/' + pathSegments[0];
  }
  
  // Jika di GitHub Pages atau domain publik dengan subfolder repository
  if (pathSegments.length > 1) {
    return '/' + pathSegments[0];
  }
  
  return '';
};

const BASE = getBasePath();

const ASSETS_TO_CACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`, 
  `${BASE}/img/user1.jpg`,
  `${BASE}/img/user2.jpg`,
  `${BASE}/img/logo192.jpeg`,
  `${BASE}/img/logo512.jpeg`
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
  
  // Lewati request non-GET atau request ke eksternal (seperti Supabase)
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache di background
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
        // Fallback jika offline total
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match(`${BASE}/index.html`);
        }
      });
    })
  );
});
  
// Menangkap event push dari Supabase
self.addEventListener('push', (event) => {
  let data = { title: 'title', body: 'body' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
 
  const options = {
    body: data.body,
    badge: `${BASE}/img/logo192.jpg`, 
    vibrate: [200, 100, 200], 
    tag: 'link-notification',         
    renotify: true,
    data: { url: data.url || `${BASE}/` } 
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