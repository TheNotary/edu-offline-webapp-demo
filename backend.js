var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://mongoadmin:secret@localhost/';

let databaseName = "myDatabase";
let collectionName = "records";


///////////////////
// Configuration //
///////////////////
//

// https://stackoverflow.com/questions/24330014/bodyparser-is-deprecated-express-4/24330353#24330353
app.use(express.json());
app.use(express.urlencoded());


// serve static html assets in the sw-test/ folder
app.use('/sw-test', express.static('sw-test'));
app.use('/sm', express.static('sm'));

app.get('/', function(req, res){
    res.redirect('/sw-test/index.html');
});

app.route('/health').get(function(req, res) {
    // console.log("Responding to /health");
    res.send("up");
});

app.route('/setup').post(function(req, res) {
    console.log("Responding to /setup");

    MongoClient.connect(url, function(err, mongoclient) {
        setupDb(err, mongoclient, res);
    });
});

app.route('/login').post(function(req, res) {
    console.log("Responding to /login");

    // Not adding LDAP containers :)
    if (  req.body.user == "demo" &&
          req.body.pass == "password" ) {
        res.send("ok");
        return;
    }

    res.status(401)
       .send("failed");
});

app.route('/records').get(function(req, res) {
    console.log("Responding to /records");

    MongoClient.connect(url, function(err, mongoclient) {
        presentAllRecords(err, mongoclient, res);
    });
});

app.route('/records/:id').post(function(req, res) {
    console.log("Responding to POST /records/" + req.params.id);
    const _id = req.params.id;

    updateRecord(_id, req, res);
});

app.route('/records').post(function(req, res) {
    console.log("Responding to POST /records");
    var _id = req.body._id;

    updateRecord(_id, req, res);
});

app.route('/records/count').get(function(req, res) {
    console.log("Responding to /records/count");

    MongoClient.connect(url, function(err, mongoclient) {
        presentCount(err, mongoclient, res);
    });
});

var server = app.listen(3000, function() {
    console.log("Listening on port 3000");
});

async function updateRecord(_id, req, res) {
    var newRecord = {
        capacity: req.body.capacity,
        checked: req.body.checked,
        data: req.body.data
    };

    MongoClient.connect(url, function(err, mongoclient) {
        mongoclient
            .db(databaseName)
            .collection(collectionName)
            .replaceOne(
                { _id },
                newRecord )
            .then( _ => {
                mongoclient.close();
                res.send("ok");
            });
    });
}

async function presentCount(err, mongoclient, res) {
    let count = await getCount(mongoclient);
    res.send('' + count);
}

async function getCount(mongoclient) {
    return mongoclient
        .db(databaseName)
        .collection(collectionName)
        .countDocuments();
}


async function setupDb(err, mongoclient, response) {
    console.log("Setup Db");

    let data = 'a'.repeat(500);

    let seedData = [
        { _id: 'record0001', capacity: 3, checked: false, data: data },
        { _id: 'record0002', capacity: 3, checked: false, data: data},
        { _id: 'record0003', capacity: 3, checked: false, data: data},
        { _id: 'record0004', capacity: 3, checked: false, data: data},
    ];

    let db = mongoclient.db(databaseName);

    // Clear the database first in case it's been populated before
    await db
        .collection(collectionName)
        .drop(function(err, delOK) {
            console.log("Dropping collection");

            if (err && err.codeName == 'NamespaceNotFound') {
                console.log("Namespace not found, no need to drop");
                return;
            }

            if (err) throw err;
            if (delOK) console.log("Collection deleted");
            if (!delOK) console.log("Something went wrong deleting the collection?");
        });

    // Then seed it
    await db
        .collection(collectionName)
        .insertMany(seedData, function(err, res) {
            console.log("doing insert");
            if (err) throw err;
            console.log("Number of documents inserted: " + res.insertedCount);

            mongoclient.close();
            response.send("ok");
        });

        console.log("Finished the awaits");
}

async function presentAllRecords(err, mongoclient, res) {
    console.log("Connected");

    mongoclient
        .db(databaseName)
        .collection(collectionName)
        .find({})
        .toArray()
        .then( array => {
            res.send(JSON.stringify(array));
            mongoclient.close();
        });
}
