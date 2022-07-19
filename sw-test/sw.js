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
      const theVersion = await getVersion();
      if (registration.installing) {
        console.log('Service worker installing ' + theVersion);
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active, ' + theVersion);
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

const getLatestCachedVersion = async () => {
  const keys = await caches.keys()
  console.log("Latest cache key: " + keys[0]);
  return keys[0];
};

const getVersion = async () => {
  return new Promise(resolve => {
    try {
      fetch('/sw-test/version')
       .then( resp => {
         resp.text()
           .then( text => {
             // console.log("Got theVersion I think " + text);
             resolve(text.replace("\n", ""));
           })
       })
       .catch( e => {
         console.error("Error fetching version number, " + e);
         const keys = caches.keys()
           .then( keys => {
             console.log("Latest cache key: " + keys[0]);
             resolve(keys[0]);
           });
       });
     }
     catch(e) {
       console.log("ERROR");
     }
  });
};

const addResourcesToCache = async (resources) => {
  const theVersion = await getVersion();
  const cache = await caches.open(theVersion);
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
      "/sw-test/favicon.ico",
      "/sw-test/idb-keyval.js",
      "/sw-test/umd.js",
      // "/sw-test/version",  // We can't cache this file, when we request it, we need to gracefully accept that it may not exist
    ])
  );
});


const matchRequestsForVersionFile = async (event) => {
  // console.log("Request for version came in!");

  const liveResponse = await fetch(event.request.url);

  // return liveResponse if we can access the page
  if (liveResponse.ok) {
    return liveResponse;
  }

  // if the fetch fails, use this failover
  const latestCachedVersion = await getLatestCachedVersion();

  return new Response(latestCachedVersion, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}


const newAsyncFunction = (event) => {
  const versionUrl = self.origin + "/sw-test/version";
  if (event.request.url == versionUrl) {
    return matchRequestsForVersionFile(event);
  }

  return caches.match(event.request);
}


// Makes it so all fetch events are intercepted with a response from the cache
self.addEventListener('fetch', (event) => {
  // console.log(event.request.url);
  event.respondWith(newAsyncFunction(event));
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
  const theVersion = await getVersion();
  const cacheKeepList = [theVersion];
  const keyList = await caches.keys();
  const cachesToDelete = keyList.filter(key => !cacheKeepList.includes(key));
  console.log("Deleting caches " + cachesToDelete);
  await Promise.all(cachesToDelete.map(deleteCache));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(deleteOldCaches());
});
