# Offline Website Demo

Imagine that you're building an app for auditors who need to inspect inventory at a location where they will have access to their laptop, but they won't be able to connect to the internet.  In such a situation, you might want to consider using Service Workers and Web Storage to create a user experience that allows your users to work with data offline and synchronize their work with the backend when they're in a location with connectivity.

This is a demo for an app that allows a user to work with a system's data offline and allows the user's actions to be synchronized with the server when they're back online.

# TODO

```
x Implement offline browsing
x Get caching figured out such that you can bump the version to bust the cache
x Get some indication whether you have loaded the latest version
x Implement the database in idb-keyval
x Investigate what it's like when chrome needs to grow beyond the 5mb soft cap
x Implement a backend that syncs... I guess attach mongodb to the system...
x Implement realtime connectivity testing
x Implement online login
x Implement offline login
- Implement encryption at rest
- Ensure syncing in offline mode is disabled/ won't do anything bad
- Fix lingering HTTP errors when requesting resources while offline
x Do final writeup
- Do final pass on usage documentation
```

# Usage

###### Installation

Technologies required:

- Node/ npm
- Docker


###### Backend - Boot up MongoDb

Start mongo DB with unsafe username/ passwords.  The backend uses this, not the HTML5 web client.  

```
docker run \
	-e MONGO_INITDB_ROOT_USERNAME=mongoadmin \
	-e MONGO_INITDB_ROOT_PASSWORD=secret \
  -p 27017:27017 \
	mongo
```

###### Backend - Install and Boot up the node.js backend

Install/ run the backend/ static asset server in the root of this git repo:

```
npm install
node backend.js
```

###### Web Client

Next login to the app while the node server is running to install the "Service Worker" and cache the data locally.  You'll need to login with...

```
UserName: demo
Password: password
```

Data is cached locally in an encrypted form using AES provided by [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt).

###### First Offline Use
Then shutdown the node application and refresh the browser.  The web app will indicate that it is running in offline mode.  You can log in to the web application and create comments on the records that have been stored offline in this mode.

###### Synchronization With Backend
Now to prove the offline/ online capabilities of the demo, you'll want to start the node service.  Click the "Attempt Reconnection" button to allow the web application to connected to the backend.  You will be prompted to synchronize the offline interactions with the backend.


# Implementation Notes and Summary

###### Caching

Caching is involved so expect things to be a bit painful until you get used to the fact that you need to actually bump the version number in the `sw.js` file in order to see updates to the app, even after a cacheless refresh takes place.  A more elegant approach should be taken to disable caching on local development to allow for a better development experience, perhaps the SW doesn't need to be used in the development cycle, or perhaps automated cache busting makes sense.

To manually delete the cache...

1.  Close all instances of the app
2.  Go to [Chrome Inspect](chrome://inspect/#service-workers) and delete all instances of the service worker
3.  Go to Dev Tools -> Application -> Cache Storage and delete all caches there
4.  Go to Dev Tools -> Application -> Storage -> "Clear site data"

###### Syncing

Synchronization is a beast.  Ideally you would only have one place where the data ever resides, but because offline functionality is a requirement, thought must be put into how synchronization will take place under various scenarios: When data on the local machine is modified, and remote data is modified; when records are created on the client that conflict with records created on the remote; when upstream migrates it's data format entirely (maybe less of an issue with blah).  

###### Offline Data and PHI

Some thought may need to be put into what kind of data is allowed "at rest" on the employees machine.  A data cleansing process may be required to protect the Private data of the client's users.  This demo encrypts all data at rest, but the data is only as safe as the employee's password.  At a minimum, password audits should be considered if cleaning PHI isn't possible.  

###### Crypto Library

This is my first time using SHA.js.  It's the library responsible for creating a hash of the user's password.  This hash is used to symmetrically decrypt/ encrypt data in the offline database.  I haven't done anything to vet it's qualifications for encrypting actual production PHI data.  Nor have I put much thought in the actual encryption scheme being leveraged by the app, it just encrypts all data as it stores it in the offline DB, and decrypts it as it loads from there.  More research must be taken to determine the soundness of this scheme and gauge what level of security is being offered.  

###### Security Controls

The offline login needs to expire after a set time.  This should be as easy as deleting the decryption key from the storage, but was not pursued due to time constraints.  Most health care companies document 15min idle timers to be the approved application behavior generally.  

###### Offline Data Capacity

Chrome currently supports 957,600 MB of storage on my local personal laptop.  Will the HDD on the client machine support that much storage?  Will the client have chrome configured in a way that supports an approximate Terrabyte of offline storage?  Will the client even allow the use of Chrome as opposed to more well tested browsers such as IE5?  Some thought may need to be put into

###### Service Workers and IndexedDB Knowledge

Service Workers rarely come up in the typical web developer life cycle.  It may not be possible to find labor comfortable using these technologies which are core to the type of application demonstrated herein.  

###### Offline Application Frameworks

Before fleshing this out I did a quick search for offline application frameworks --a library called "up up" resulted.  That might be a better starting point than rolling your own Service Worker from scratch.  

###### SPA Frameworks

This was done in vanilla JS, but by the time I connected mongo, I was noticing a lot of calls to `refreshUI()` and a little JS templating for displaying data.  It would probably be nice to target a SPA framework that works well with the offline application framework selected so these noisy aspects of the demo can be pushed into the boilerplate portions of some SPA framework.  

###### Summary

This was a fun experiment to see how far HTML5 and Offline Applications have come.  The technologies seem production ready, but there are strengths towards simply rolling a mobile application which if tolerated would increase the likelihood of finding talent to develop the app with the only trade off being that users would not be able to work from their laptops (possibly this is an even more ergonomic scenario?).  


## Refs

- [Service Worker Overview](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [DB Library](https://www.npmjs.com/package/idb-keyval)
- [Delete/ Inspect Service Workers](chrome://inspect/#service-workers)
- [Random Hashing Lib]()
- [Random Crypto Lib](https://github.com/brix/crypto-js)
