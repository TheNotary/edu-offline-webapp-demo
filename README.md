# Offline Website Demo

Imagine that you're building an app for auditors who need to inspect inventory at a location where they will have access to their laptop, but they won't be able to connect to the internet.  In such a situation, you might want to consider using Service Workers and Web Storage to create a user experience that allows your users to work with data offline and synchronize their work with the backend when they're in a location with connectivity.

tl; dr, this is a demo for an app that allows a user to work with a system's data offline and allows the user's actions to be synchronized with the server when they're back online.


# TODO

x Implement offline browsing
x Get caching figured out such that you can bump the version to bust the cache
x Get some indication whether you have loaded the latest version
x Implement the database in idb-keyval
x Investigate what it's like when chrome needs to grow beyond the 5mb soft cap
- Implement a backend that syncs... I guess attach mongodb to the system...
  - Build a backend
  - Build some JS to post records to the backend that need syncing


# Usage

###### Installation
First, run the webserver in the root of this git repo:

```
ruby -run -e httpd .
```

Then login to the app while the node server is running to install the "Service Worker" and cache the data locally.  You'll need to login with...

```
UserName: demo
Password: password
```

Data is cached locally in an encrypted form using AES provided by [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt).

###### First Offline Use
Then shutdown the node application and refresh the browser.  The web app will indicate that it is running in offline mode.  You can log in to the web application and create comments on the records that have been stored offline in this mode.

###### Synchronization With Backend
Now to prove the offline/ online capabilities of the demo, you'll want to start the node service.  Click the "Attempt Reconnection" button to allow the web application to connected to the backend.  You will be prompted to synchronize the offline interactions with the backend.





# Usage (with backend)

Start mongo DB with unsafe username/ passwords

```
docker run \
	-e MONGO_INITDB_ROOT_USERNAME=mongoadmin \
	-e MONGO_INITDB_ROOT_PASSWORD=secret \
	mongo
```

Start the backend server using node.  






# Implementation Notes

###### Caching

Caching is involved so expect things to be a bit painful until you get used to the fact that you need to actually bump the version number in the `sw.js` file in order to see updates to the app, even after a cacheless refresh takes place.  A more elegant approach should be taken to disable caching on local development to allow for a better development experience, perhaps the SW doesn't need to be used in the development cycle, or perhaps automated cache busting makes sense.

To manually delete the cache...

1.  Close all instances of the app
2.  Go to [Chrome Inspect](chrome://inspect/#service-workers) and delete all instances of the service worker
3.  Go to Dev Tools -> Application -> Cache Storage and delete all caches there
4.  Go to Dev Tools -> Application -> Storage -> "Clear site data"


## Refs

- [Service Worker Overview](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [DB Library](https://www.npmjs.com/package/idb-keyval)
- [Delete/ Inspect Service Workers](chrome://inspect/#service-workers)
- ...
