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
    ulRecordList = document.querySelector("#recordList"),
    ulRemoteRecordList = document.querySelector("#ulRemoteRecordList"),
    spanVersion = document.querySelector("#version"),
    spanCount = document.querySelector("#count"),
    spanRemoteCount = document.querySelector("#spanRemoteCount"),
    spanMode = document.querySelector("#mode"),
    spanCacheDate = document.querySelector("#cacheDate"),
    divTotalCapacity = document.querySelector("#divTotalCapacity"),
    btnDropLocalDb = document.querySelector("#btnDropLocalDb");

const attachScriptsToDom = () => {
    btnVersionCheck.addEventListener("click", refreshAppVersion);
    btnAdd.addEventListener("click", btnAdd_clicked);
    btnDropLocalDb.addEventListener("click", btnDropLocalDb_clicked);
    btnSync.addEventListener("click", btnSync_clicked);
    btnSetupOnlineDb.addEventListener("click", btnSetupOnlineDb_clicked);
    btnDownloadRecords.addEventListener("click", btnDownloadRecords_clicked);
}

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

    // Remote
    refreshRemoteCount();

    // Local
    refreshMode();
    refreshCount();
    refreshList();
    refreshTotalCapacity();
}

async function refreshMode() {
    spanMode.innerHTML = "online";
}

// returns true if we have connectivity to the backend
const checkConnectivity = async () => {
    return new Promise( resolve => {
        fetch('/health')
            .then( response => response.text())
            .then( text => {
                console.log(`Server Status: [${text}]`);
                if (text == "up")
                    resolve(true);
                resolve(false);
            })
            .catch( err => {
                resolve(false);
            })
    });
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
            });
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
    return fetch('/records/count').then( r => r.text());
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
                            console.log(`Finished post of ${key}.`)
                            record["unsynced"] = false;
                            set(key, JSON.stringify(record));
                        });
                }

            }
        });

}

async function postRecord(key, record) {
    fetch(`/records/${key}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        }
    );
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

// export globals...
window.refreshUI = refreshUI;
window.chk = chk;
window.checkConnectivity = checkConnectivity;

export { attachScriptsToDom, refreshUI, chk, checkConnectivity };
