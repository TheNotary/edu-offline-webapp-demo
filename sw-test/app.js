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
    btnSync = document.querySelector("#btnSync"),
    btnVersionCheck = document.querySelector("#btnVersionCheck"),
    ulRecordList = document.querySelector("#recordList"),
    spanVersion = document.querySelector("#version"),
    spanCount = document.querySelector("#count"),
    spanCacheDate = document.querySelector("#cacheDate"),
    divTotalCapacity = document.querySelector("#divTotalCapacity"),
    btnDropDb = document.querySelector("#btnDropDb");

btnVersionCheck.addEventListener("click", refreshAppVersion);
btnAdd.addEventListener("click", btnAdd_clicked);
btnDropDb.addEventListener("click", btnDropDb_clicked);

refreshUI();


// Add a record to the database
async function btnAdd_clicked() {
    let currentCount = await getCount();
    let id = ((currentCount + 1) + "").padStart(4, '0');
    let recordName = 'record' + id;
    let data = 'a'.repeat(500000);  // Make the records pretty big to test application size limits in the browser

    console.log(`Creating new record with name ${recordName}`);
    set(recordName, '{"capacity": 1, "checked": false, "data": "' + data + '"}');

    refreshUI();
}

// Lookup storage items
async function refreshUI() {
    window.appVersion = await refreshAppVersion();
    refreshCacheTime(appVersion);
    refreshCount();
    refreshList();
    refreshTotalCapacity();
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
                const checkStatus = true ? "checked" : "";
                const checkbox = `<input type="checkbox" class="checkable" id="${key}-checkbox" name="${key}-checkbox" ${checkStatus}>`;

                listContents += `<li>${key} - capacity ${data["capacity"]} ${checkbox}</li>`;
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

async function getCount() {
    const records = await keys();
    return records.length;
}

// Sync local data with web app
function btnSync_clicked() {

}

function btnDropDb_clicked() {
    console.log("Clearing DB.");
    clear();
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
