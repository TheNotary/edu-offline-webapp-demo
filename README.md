# Offline Website Demo

Imagine that you're building an app for auditors who need to inspect inventory at a location where they will have access to their laptop, but they won't be able to connect to the internet.  In such a situation, you might want to consider using Service Workers and Web Storage to create a user experience that allows your users to work with data offline and synchronize their work with the backend when they're in a location with connectivity.

tl; dr, this is a demo for an app that allows a user to work with a system's data offline and allows the user's actions to be synchronized with the server when they're back online.



# Usage

###### Installation
Login to the app while the node server is running to install the "Service Worker" and cache the data locally.  You'll need to login with...

```
UserName: demo
Password: password
```

Data is cached locally in an encrypted form using AES provided by [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt).

###### First Offline Use
Then shutdown the node application and refresh the browser.  The web app will indicate that it is running in offline mode.  You can log in to the web application and create comments on the records that have been stored offline in this mode.

###### Synchronization With Backend
Now to prove the offline/ online capabilities of the demo, you'll want to start the node service.  Click the "Attempt Reconnection" button to allow the web application to connected to the backend.  You will be prompted to synchronize the offline interactions with the backend.


