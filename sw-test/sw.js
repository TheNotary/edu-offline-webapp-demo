////////////////////
// Service Worker //
////////////////////
//
// This file is the javascript that runs behind the scenes of a web site and
// basically installs itself to the domain.  By defining hooks on the fetch
// event, we can make it so pages load even in the absence if internet
// connectivity.


//////////
// Util //
//////////

const getLatestOnlineSemver = () => {
    return new Promise((resolve, reject) => {
        fetch('/sw-test/version')
            .then(resp => {
                resp.text()
                    .then(text => {
                        resolve(text.replace("\n", ""));
                    })
            })
    });
}

// Gets the latest semver tag in the local cache
const getLatestCachedSemver = async () => {
    const keys = await caches.keys()
    // console.log("Latest cache key: " + keys[0]);
    return keys[0];
};

const getVersion = async () => {
    return new Promise(resolve => {
        try {
            getLatestOnlineSemver()
                .then(semver => resolve(semver))
                .catch(e => {
                    console.error("Error fetching version number, " + e);
                    getLatestCachedSemver()
                        .then(semver => resolve(semver));
                });
        } catch (e) {
            console.log("ERROR " + e);
        }
    });
};


/////////////////////
// SW Installation //
/////////////////////
//
// This section handles the service worker's installation

const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        const onlineVersion = await getLatestOnlineSemver();
        const cachedVersion = await getLatestCachedSemver();

        // clearCacheIfNewVersionPresent

        console.log("onlineVersion: " + onlineVersion);
        console.log("cachedVersion: " + cachedVersion);

        if (onlineVersion != cachedVersion) {
            console.log("online version != cachedVersion, deleting an update");
            await deleteCache(cachedVersion);
            // TODO:  delete the sw!
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (let registration of registrations) {
                    console.log("Uninstalling SW ");
                    registration.unregister();
                }
                alert("A reload must take place :)");
                location.reload();
            });

        }


        // registerServiceWorker
        try {
            const registration = await navigator.serviceWorker.register(
                '/sw-test/sw.js', {
                    scope: '/sw-test/',
                }
            );
            if (registration.installing) {
                console.log('Service worker installing ' + onlineVersion);
            } else if (registration.waiting) {
                console.log('Service worker installed');
            } else if (registration.active) {
                console.log('Service worker active, ' + onlineVersion);
            }
        } catch (error) {
            console.error(`Registration failed with ${error}`);
        }
    }
};

registerServiceWorker();

//////////////////////////////////
// Caching and Offline Behavior //
//////////////////////////////////
//
// This section handles the definition and population of the cache
// allowing for offline use of the application

const addResourcesToCache = async (resources) => {
    const appVersion = await getVersion();
    const cache = await caches.open(appVersion);
    await cache.addAll(resources);
    await cache.put('/time-cached', new Response(new Date()));
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
            "/sm/e22387484eaba42e333cb9be4935436627dcdba2fc6a5817e932e652eb088e48.map",
            // "/sw-test/version",  // We can't cache this file, when we request it, we need to gracefully accept that it may not exist
        ])
    );
});


const matchRequestsForVersionFile = async (event) => {
    // console.log("event.request.url: " + event.request.url);

    try {
        const liveResponse = await fetch(event.request.url);

        // return liveResponse if we can access the page
        if (liveResponse.ok) {
            return liveResponse;
        }
    } catch (e) {
        // I need to catch this exception to allow offline functionality
        if (!e.message.includes("Failed to fetch"))
            console.log(e);
    }


    // if the fetch fails, use this failover
    const latestCachedVersion = await getLatestCachedSemver();

    return new Response(latestCachedVersion, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain'
        },
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
    console.log("Deleting cache " + key);
    await caches.delete(key)
}

const deleteOldCaches = async () => {
    const appVersion = await getVersion();
    const cacheKeepList = [appVersion];
    const keyList = await caches.keys();
    const cachesToDelete = keyList.filter(key => !cacheKeepList.includes(key));
    await Promise.all(cachesToDelete.map(deleteCache));
}

self.addEventListener('activate', (event) => {
    event.waitUntil(deleteOldCaches());
});
