var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://mongoadmin:secret@localhost/';
var str = "";

// serve static html assets in the sw-test/ folder
app.use('/sw-test', express.static('sw-test'));
app.use('/sm', express.static('sm'));

app.get('/', function(req, res){
    res.redirect('/sw-test/index.html');
});

app.route('/health').get(function(req, res) {
    console.log("Responding to /health");
    res.send("online");
});

app.route('/seed').get(function(req, res) {
    console.log("Responding to /seed");

    MongoClient.connect(url, function(err, mongoclient) {
        presentAllRecords(err, mongoclient, res);
    });
});

app.route('/Employeeid').get(function(req, res) {
    console.log("Request Received.");

    MongoClient.connect(url, function(err, mongoclient) {
        console.log("Connected");

        var cursor = mongoclient.collection('Employee').find();
        //noinspection JSDeprecatedSymbols
        cursor.each(function(err, item) {

            if (item != null) {
                str = str + "    Employee id  " + item.Employeeid + "</br>";
            }
        });
        res.send(str);
        mongoclient.close();
    });
});

var server = app.listen(3000, function() {
    console.log("Listening on port 3000");

});



async function getCount(db) {
    let count = await db.collection('records').countDocuments();

    return count;
}

async function presentAllRecords(err, mongoclient, res) {
    console.log("Connected");

    let db = mongoclient.db("myDatabase");
    let count = await getCount(db);
    db
        .collection('records')
        .find({})
        .forEach(function(err, item) {
            if (item != null) {
                str = str + "    Employee id  " + item.Employeeid + "</br>";
            }
        })
        .then( _ => {
            var what = "hihi";
            res.send(str);
            mongoclient.close();
        });

}
