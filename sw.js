const CACHE_NAME = 'msg'; 
const getBasePath = () => {
  const pathname = self.location.pathname;
  const pathSegments = pathname.split('/').filter(Boolean);
  if (self.location.hostname === 'localhost' && pathSegments.length > 0 && pathSegments[0] !== 'sw.js') {
    return '/' + pathSegments[0];
  } 
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
 
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});
 
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
 
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url); 
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  } 
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) { 
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
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match(`${BASE}/index.html`);
        }
      });
    })
  );
});
   
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
 
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();
//   event.waitUntil(
//     clients.openWindow(event.notification.data.url)
//   );
// });

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || `${BASE}/`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Cek apakah ada tab/jendela PWA yang sudah terbuka di origin yang sama
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // Jika ingin memaksa navigasi ke URL notifikasi saat difokuskan
            if (focusedClient && 'navigate' in focusedClient && urlToOpen) {
              return focusedClient.navigate(urlToOpen);
            }
            return focusedClient;
          });
        }
      }
      
      // Jika tidak ada tab yang terbuka, baru buka jendela baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});