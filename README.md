# Offline Website Demo

This is a demo for an app that allows a user to work with the system offline and synchronize with a server when network conditions are restored.


# Usage

Login to the app while the node server is running to install the "Service Worker" and cache the data locally.  You'll need to login with...

```
UserName: demo
Password: password
```

Data is cached locally in an encrypted form using AES provided by [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt).

Then shutdown the node application and to decrypt the data


