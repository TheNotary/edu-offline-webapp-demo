import { get, set, keys, entries, clear } from '/sw-test/idb-keyval.js';

// This file binds the js functions to the buttons in the HTML form for
// interacting with the database.
var btnAdd  = document.querySelector("#btnAdd"),
    btnSync = document.querySelector("#btnSync"),
    btnVersionCheck = document.querySelector("#btnVersionCheck"),
    ulRecordList = document.querySelector("#recordList"),
    spanVersion = document.querySelector("#version"),
    spanCount = document.querySelector("#count"),
    spanCacheDate = document.querySelector("#cacheDate"),
    btnDropDb = document.querySelector("#btnDropDb");

btnVersionCheck.addEventListener("click", refreshAppVersion);
btnAdd.addEventListener("click", btnAdd_clicked);


refreshUI();


// Add a record to the database
async function btnAdd_clicked() {

  // set('hi', "here's what's in hi.");
  // const blah = await get('hi');
  // alert(blah);

  var currentCount = await getCount();
  var recordName = 'record' + currentCount + 1;
  var data = 'a'.repeat(5000);


  // localStorage.setItem(recordName,
  //                      '{"capacity": 1, "data": "' + data + '"}'
  // );

  set(recordName, '{"capacity": 1, "data": "' + data + '"}');


  refreshUI();
}

// Lookup storage items
async function refreshUI() {
  window.appVersion = await refreshAppVersion();
  refreshCacheTime(appVersion);
  refreshCount();
  refreshList();
}

// Check to see if we're using the latest version of the front-end
async function refreshAppVersion() {
  return new Promise( resolve => {
    fetch("/sw-test/version")
      .then( response => response.text() )
      .then( text => {
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
    setTimeout( _ => { refreshCacheTime(appVersion) }, 200);  // recursively retry until the cache is actually populated
    return;
  }
  const timeCached = await resp.text();
  spanCacheDate.innerHTML = timeCached;
}

async function refreshCount() {
  spanCount.innerHTML = await getCount();
}

async function refreshList() {
  if (getCount() === 0) {
    var listContents = "<li>No Records</li>";
    ulRecordList.innerHTML = listContents;
  }
}

async function getCount() {
  const records = await keys();
  return records.length;
  // return localStorage.length;
}

// Sync local data with web app
function btnSync_clicked() {

}

function btnDropDb_clicked() {
  // localstorage.clear();
  clear();
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
