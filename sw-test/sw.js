const appVersion = "v1.0.2";

/////////////////////
// SW Installation //
/////////////////////
//
// This section handles the service worker's installation

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        '/sw-test/sw.js',
        {
          scope: '/sw-test/',
        }
      );
      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

registerServiceWorker();

/////////////
// Caching //
/////////////
//
// This section handles the definition and population of the cache
// allowing for offline use of the application

const addResourcesToCache = async (resources) => {
  const cache = await caches.open(appVersion);
  await cache.addAll(resources);
};

// The files are added to the cache up on the install event completing for the sw
self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      "/sw-test/",
      "/sw-test/index.html",
      "/sw-test/style.css",
      "/sw-test/app.js",
      "/sw-test/sw.js",
      "/sw-test/umd.js",
      "/sw-test/favicon.ico",
      "/sw-test/version",
    ])
  );
});


// Makes it so all fetch events are intercepted with a response from the cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
  );
});


////////////////////
// Cache Cleaning //
////////////////////
//
// This section handles cleanup of old app caches.

const deleteCache = async key => {
  await caches.delete(key)
}

const deleteOldCaches = async () => {
   const cacheKeepList = [appVersion];
   const keyList = await caches.keys();
   const cachesToDelete = keyList.filter(key => !cacheKeepList.includes(key));
   await Promise.all(cachesToDelete.map(deleteCache));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(deleteOldCaches());
});
