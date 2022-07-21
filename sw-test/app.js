import {
    get,
    set,
    keys,
    entries,
    clear
} from '/sw-test/idb-keyval.js';

// This file binds the js functions to the buttons in the HTML form for
// interacting with the database.
let btnAdd = document.querySelector("#btnAdd"),
    btnDownloadRecords = document.querySelector("#btnDownloadRecords"),
    btnSync = document.querySelector("#btnSync"),
    btnVersionCheck = document.querySelector("#btnVersionCheck"),
    btnSetupOnlineDb = document.querySelector("#btnSetupOnlineDb"),
    btnCheckConnectivity = document.querySelector("#btnCheckConnectivity"),
    btnLogin = document.querySelector("#btnLogin"),
    btnLogout = document.querySelector("#btnLogout"),
    btnClearLoginState = document.querySelector("#btnClearLoginState"),
    inputUser = document.querySelector("#inputUser"),
    inputPass = document.querySelector("#inputPass"),
    ulRecordList = document.querySelector("#recordList"),
    ulRemoteRecordList = document.querySelector("#ulRemoteRecordList"),
    spanVersion = document.querySelector("#version"),
    spanCount = document.querySelector("#count"),
    spanRemoteCount = document.querySelector("#spanRemoteCount"),
    spanConnectivityMode = document.querySelector("#spanConnectivityMode"),
    spanCacheDate = document.querySelector("#cacheDate"),
    spanLoginState = document.querySelector("#spanLoginState"),
    divTotalCapacity = document.querySelector("#divTotalCapacity"),
    btnDropLocalDb = document.querySelector("#btnDropLocalDb");

const attachScriptsToDom = () => {
    btnVersionCheck.addEventListener("click", refreshAppVersion);
    btnAdd.addEventListener("click", btnAdd_clicked);
    btnDropLocalDb.addEventListener("click", btnDropLocalDb_clicked);
    btnSync.addEventListener("click", btnSync_clicked);
    btnSetupOnlineDb.addEventListener("click", btnSetupOnlineDb_clicked);
    btnDownloadRecords.addEventListener("click", btnDownloadRecords_clicked);
    btnCheckConnectivity.addEventListener("click", btnCheckConnectivity_clicked);
    btnLogin.addEventListener("click", btnLogin_clicked);
    btnLogout.addEventListener("click", btnLogout_clicked);
    btnClearLoginState.addEventListener("click", btnClearLoginState_clicked);
}

function btnClearLoginState_clicked() {
    window.sessionStorage.removeItem('symmetricKey');
    window.localStorage.removeItem('loginHash');
    refreshUI();
}

const btnLogin_clicked = async () => {
    console.log("btnLogin clicked...");
    const user = inputUser.value;
    const pass = inputPass.value;

    const loginState = getLoginState();
    console.log("loginState: " + loginState);

    if (loginState == 'unregistered') {
        console.log("First login attempt detected, will try to connect to backend");
        performTraditionalLoginAgainstBackend(user, pass);
        return;
    }

    if (loginState == 'logged_out') {
        // check if loginHash matches what we hash our password with
        const usersLoginHash = createLoginHashForUseInLoginChecks(pass);
        const existingLoginHash = window.localStorage.getItem('loginHash');

        console.log("usersLoginHash: " + usersLoginHash);
        console.log("existingLoginHash: " + existingLoginHash);

        if (usersLoginHash != existingLoginHash) {
            alert("Login Failed:  Password didn't match password used when originally registering with backend.");
            return;
        }

        const symmetricKey = createSymmetricKeyForUseInEncryption(user + pass);
        window.sessionStorage.setItem('symmetricKey', symmetricKey);
        setUILoggedIn();
        refreshUI();
        return;
    }
    alert('this button should have been hidden...');
};


function performTraditionalLoginAgainstBackend(user, pass) {
    fetch('/login',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' },
            body: `{ "user": "${user}", "pass": "${pass}"}`
        })
        .then( resp => resp.text() )
        .then( text => {
            if (text != "ok") {
                throw "Something went wrong authenticating";
            }

            // We need to create and locally store a password hash to save
            // as a registration value.
            // In addition, we need to create a sessionStorage symmetricKey
            // entry which can't be generated without the user putting in
            // their password and logging in locally...
            return createLoginHashForUseInLoginChecks(pass);
        })
        .then( loginHash => {
            window.localStorage.setItem('loginHash', loginHash); // store the hash of the pass so we can validate offline logins
            return createSymmetricKeyForUseInEncryption(user + pass);
        })
        .then( symmetricKey => {
            // Perform OfflineLogin
            window.sessionStorage.setItem('symmetricKey', symmetricKey);
            console.log("login complete, login form should be hidden");
            setUILoggedIn();
            refreshUI();
        });
}

const btnLogout_clicked = async () => {
    console.log("btnLogout_clicked");
    logout();
}

const logout = async () => {
    window.sessionStorage.removeItem('symmetricKey');
    setUILoggedOut();
    refreshUI();
};

// default state
function setUILoggedOut() {
    // show the login-controls
    const loginControls = document.getElementsByClassName('login-controls');
    for (let el of loginControls) {
        el.style.display = "block";
    }

    // hide the .app-controls
    const appControls = document.getElementsByClassName('app-controls');
    for (let el of appControls) {
        el.style.display = "none";
    }

    // hide the logout button
    btnLogout.style.display = "none";
}

const setUILoggedIn = () => {
    console.log("Setting UI to logged in state");
    // hide the login-controls
    const loginControls = document.getElementsByClassName('login-controls');
    for (let el of loginControls) {
        el.style.display = "none";
    }

    // show the .app-controls
    const appControls = document.getElementsByClassName('app-controls');
    for (let el of appControls) {
        el.style.display = "block";
    }

    // show the logout button
    btnLogout.style.display = "block";
}


// before and we need to perform that action first
// getLoginState => "unregistered", "logged_out", "logged_in"
const getLoginState = () => {
    // If we don't have a loginHash, then we've never logged into the backend
    const loginHash = window.localStorage.getItem('loginHash');
    if (loginHash == null) {
        return "unregistered";
    }

    // If we don't have a symmetricKey in sessionStorage, we're logged out
    const symmetricKey = window.sessionStorage.getItem('symmetricKey');
    if (symmetricKey == null) {
        return "logged_out";
    }

    // Else we're logged in
    return "logged_in";
};
window.getLoginState = getLoginState;

const createLoginHashForUseInLoginChecks = (pass) => {
    const loginHashSalt = "0doRif%4j10spb12lhF";
    const loginHash = passwordHash(pass + loginHashSalt);
    return loginHash;
};

const createSymmetricKeyForUseInEncryption = (userPass) => {
    const symmetricKeyHashSalt = "mnOtDCIj2#@3ijcDIjcdAF)f";
    const symmetricKey = passwordHash(userPass + symmetricKeyHashSalt);
    return symmetricKey;
};

// Add a record to the database
async function btnAdd_clicked() {
    let currentCount = await getCount();
    let id = ((currentCount + 1) + "").padStart(4, '0');
    let recordName = 'record' + id;
    let data = 'a'.repeat(500);  // Make the records pretty big to test application size limits in the browser

    console.log(`Creating new record with name ${recordName}`);
    set(recordName, '{"capacity": 3, "checked": false, "unsynced": false, "data": "' + data + '"}');

    refreshUI();
}

// Lookup storage items
const refreshUI = async () => {
    window.appVersion = await refreshAppVersion();
    refreshCacheTime(appVersion);
    refreshLoginState();

    // Remote
    refreshRemoteCount();

    // Local
    // refreshConnectivityMode();
    refreshCount();
    refreshList();
    refreshTotalCapacity();
}

const refreshLoginState = async () => {
    const loginState = getLoginState();
    spanLoginState.innerHTML = loginState.replace("_", " ");

    if (loginState == "logged_in") {
        setUILoggedIn();
        return;
    }
    setUILoggedOut();
}
window.refreshLoginState = refreshLoginState;

const refreshConnectivityMode = async () => {
    const online = await checkConnectivity();
    if (online) {
        if (spanConnectivityMode.innerHTML != "online")
            spanConnectivityMode.innerHTML = "online";
        return;
    }
    if (spanConnectivityMode.innerHTML != "offline")
        spanConnectivityMode.innerHTML = "offline";
}

// returns true if we have connectivity to the backend
const checkConnectivity = async () => {
    try {
        return new Promise( resolve => {

            fetch('/health')
                .then( response => response.text())
                .then( text => {
                    // console.log(`Server Status: [${text}]`);
                    if (text == "up")
                        resolve(true);
                    resolve(false);
                })
                .catch( err => {
                    resolve(false);
                    return;
                })
        });
    }
    catch(e) {
        console.log("got here...");
        return false;
    }
}


// Check to see if we're using the latest version of the front-end
async function refreshAppVersion() {
    return new Promise(resolve => {

        fetch("/sw-test/version")
            .then(response => response.text())
            .then(text => {
                let version = cleanSemver(text);
                spanVersion.innerHTML = version;
                resolve(version);
            })
            .catch( err => console.log(err));
    });
}

async function refreshCacheTime(appVersion) {
    const cache = await caches.open(appVersion);
    const resp = await cache.match('/time-cached');

    if (resp == undefined) {
        setTimeout(_ => {
            refreshCacheTime(appVersion)
        }, 200); // recursively retry until the cache is actually populated
        return;
    }
    const timeCached = await resp.text();
    spanCacheDate.innerHTML = timeCached;
}


async function refreshRemoteCount() {
    spanRemoteCount.innerHTML = await getRemoteCount();
}

async function refreshCount() {
    spanCount.innerHTML = await getCount();
}

async function refreshTotalCapacity() {
    divTotalCapacity.innerHTML = await getTotalCapacity();
}

async function refreshList() {
    if (getCount() === 0) {
        let listContents = "<li>No Records</li>";
        ulRecordList.innerHTML = listContents;
        return;
    }

    console.log("about to refresh list entries");

    entries()
        .then((entries) => {
            let listContents = "";

            for (const entry of entries) {
                const key = entry[0];
                const data = JSON.parse(entry[1]);
                const checkStatus = data["checked"] ? "checked" : "";
                const syncStatus = data["unsynced"] ? " (unsynced)" : "";
                const onchangeJs = `onchange="chk(event,'${key}')"`;
                const checkboxHtml = `<input type="checkbox" ${onchangeJs} class="checkable" id="${key}-checkbox" name="${key}-checkbox" ${checkStatus}>`;

                listContents += `<li>${key}${syncStatus} - capacity ${data["capacity"]} ${checkboxHtml}</li>`;
            }
            ulRecordList.innerHTML = listContents;
        });
}

async function getTotalCapacity() {
    return new Promise( resolve => {
        entries()
            .then((entries) => {
                let totalCapacity = 0;

                for (const entry of entries) {
                    const key = entry[0];
                    const data = JSON.parse(entry[1]);
                    const capacity = data["capacity"];
                    totalCapacity += capacity;
                }

                resolve(totalCapacity);
            });
    });
}


async function getRemoteCount() {
    return fetch('/records/count')
    .then( r => r.text())
    .catch( err => console.log(err));
}

async function getCount() {
    const records = await keys();
    return records.length;
}

// Sync local data with web app
function btnSync_clicked() {
    // iterate over all local data
    entries()
        .then((entries) => {
            for (const entry of entries) {
                const key = entry[0];
                const record = JSON.parse(entry[1]);
                const checkStatus = record["checked"];
                const unsynced = record["unsynced"];

                // upload the record, and set it to synced locally if it's been marked as unsynced
                if (unsynced) {
                    postRecord(key, record)
                        .then( _ => {
                            // FIXME: I shouldn't get here when I sync offline, I should go to the catch
                            console.log(`Finished post of ${key}.  Resyncing local state.`)
                            record["unsynced"] = false;
                            set(key, JSON.stringify(record));
                        })
                        ;
                }

            }
        });

}

async function postRecord(key, record) {
    return new Promise( (resolve, reject) => {
        fetch(`/records/${key}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            }
        )
        .catch( err => {
            reject(err)
            // if (err.message == 'Failed to fetch')
            //     return;
            // console.log("Failure posting record");
            // console.log(err);
        })
        .then(resolve);
    });
}

function btnDropLocalDb_clicked() {
    console.log("Clearing DB.");
    clear();
    refreshUI();
}

function btnSetupOnlineDb_clicked() {
    fetch('/setup', { method: 'POST' });
    refreshUI();
}

async function btnDownloadRecords_clicked() {
    console.log("btnSetupOnlineDb_clicked clicked");

    // Get all the records
    let recordsJson = await fetch("/records").then( r => r.text() );
    const records = JSON.parse(recordsJson);

    // Install the records locally
    records.forEach( record => {
        const _id = record._id;
        delete record._id;
        set(_id, JSON.stringify(record));
    });

    refreshUI();
}

async function btnCheckConnectivity_clicked() {
    const connected = await checkConnectivity();
    const status = connected ? "Online" : "Offline";
    console.log("Currently " + status);
}

const passwordHash = (pass) => {
  var hashObj = new jsSHA("SHA-512", "TEXT", {numRounds: 10});
  hashObj.update(pass);
  var hash = hashObj.getHash("HEX");
  return hash;
}

// Cleans up and returns the semver version to be printed on the screen, or
// returns an error message that is printed to the screen
function cleanSemver(text) {
    let txt = text.replace('window.appVersion = "', '').replace('";', '').replace("\n", "");
    let semVer = /^((([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/.exec(txt);

    if (semVer == null)
        return "INVALID VERSION FORMAT"

    return semVer[0];
}

// auditCheck, this function is fired anytime a record is "checked" meaning an
// auditor has performed their auditing function on it, perhaps offline!
const chk = async (event, recordId) => {
    const record = await get(recordId);
    const obj = JSON.parse(record);
    obj["checked"] = event.target.checked;
    obj["unsynced"] = true;
    // console.log("event.target.checked: " + event.target.checked);
    set(recordId, JSON.stringify(obj));
    refreshList();
}

// checks if we're online and updates the header to indicate every 5 seconds
// This could be matured way further but time constraints...
const beginOnlineChecks = async () => {
    const interval = setInterval( refreshConnectivityMode, 5000 );
}


const encryptTxt = (txt) => {
    window.sessionStorage.setItem('symmetricKey', 'secret key 123')
    const symmetricKey = window.sessionStorage.getItem('symmetricKey');

    if (symmetricKey == null) {
        console.error("symmetricKey was null, please login.");
        return;
    }

    var cipherText = CryptoJS.AES.encrypt(txt, symmetricKey).toString();
    return cipherText;
}

const decryptTxt = (cipherText) => {
    window.sessionStorage.setItem('symmetricKey', 'secret key 123')
    const symmetricKey = window.sessionStorage.getItem('symmetricKey');

    // Decrypt
    var bytes  = CryptoJS.AES.decrypt(cipherText, symmetricKey);
    var clearText = bytes.toString(CryptoJS.enc.Utf8);
    return clearText;
}


// export globals...
window.refreshUI = refreshUI;
window.chk = chk;
window.checkConnectivity = checkConnectivity;
window.passwordHash = passwordHash;
window.refreshConnectivityMode = refreshConnectivityMode;
window.beginOnlineChecks = beginOnlineChecks;

window.encryptTxt = encryptTxt;
window.decryptTxt = decryptTxt;

window.btnLogin_clicked = btnLogin_clicked;

export { attachScriptsToDom, refreshUI, chk, checkConnectivity };
