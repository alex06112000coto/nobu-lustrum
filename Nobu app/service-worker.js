const CACHE_NAME = 'nobu-lustrum-v12';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './manifest.json',
  './nobu logo.jpg',
  './Who_Is_Most_Likely_To.json',
  './js/app.js',
  './js/firebase-config.js',
  './js/auth.js',
  './js/feed.js',
  './js/likely.js',
  './js/cocktails.js',
  './js/cocktails-data.js',
  './js/wheel.js',
  './js/program.js',
  './js/info.js'
];

// Install Service Worker and Cache Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker and Clean Old Caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Intercept Fetch Requests with a Network-First strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests (caching or intercepting POST/PUT requests is invalid and breaks file uploads)
  if (event.request.method !== 'GET') {
    return;
  }

  // Only intercept HTTP/S requests, ignore browser extensions or other schemes
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.startsWith('http')) {
    return;
  }
  
  // Skip caching Firebase analytics, firestore, or auth requests
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebasestorage') || 
      event.request.url.includes('identitytoolkit') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Network-First Strategy: try network first, fallback to cache if offline or network fails
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If the request succeeds and is valid, clone the response and update the cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline or connection failure: fallback to cache
        return caches.match(event.request);
      })
  );
});
