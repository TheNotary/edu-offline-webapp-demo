// This file binds the js functions to the buttons in the HTML form for
// interacting with the database.
var btnAdd  = document.querySelector("#btnAdd"),
    btnSync = document.querySelector("#btnSync"),
    btnVersionCheck = document.querySelector("#btnVersionCheck"),
    ulRecordList = document.querySelector("#recordList");
    spanVersion = document.querySelector("#version"),
    spanCount = document.querySelector("#count"),
    btnDropDb = document.querySelector("#btnDropDb");

btnVersionCheck.addEventListener("click", refreshAppVersion);
btnAdd.addEventListener("click", btnAdd_clicked);

refreshUI();


// Add a record to the database
function btnAdd_clicked() {
  var currentCount = getCount();
  var recordName = 'record' + currentCount + 1;
  var data = 'a'.repeat(5000);
  localStorage.setItem(recordName,
                       '{"capacity": 1, "data": "' + data + '"}'
  );

  refreshUI();
}

// Lookup storage items
function refreshUI() {
  // refreshAppVersion();
  refreshCount();
  refreshList();
}

function refreshCount() {
  spanCount.innerHTML = getCount();
}

function refreshList() {
  if (getCount() === 0) {
    var listContents = "<li>No Records</li>";
    ulRecordList.innerHTML = listContents;
  }

}

function getCount() {
  return localStorage.length;
}

// Sync local data with web app
function btnSync_clicked() {

}

function btnDropDb_clicked() {
  localstorage.clear();
}
// Check to see if we're using the latest version of the front-end
function refreshAppVersion() {
  fetch("/sw-test/version")
    .then( response => response.text() )
    .then( text => spanVersion.innerHTML = text );

}
