/**
 * Created by iftekar on 24/5/16.
 */
(function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();


var CryptoJS = require("crypto");
var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var app = express();

var port = process.env.PORT || 1001; 				// set the port

var http = require('http').Server(app);

var bodyParser = require('body-parser');
app.use(bodyParser.json({ parameterLimit: 1000000,
    limit: 1024 * 1024 * 10}));
app.use(bodyParser.urlencoded({ parameterLimit: 1000000,
    limit: 1024 * 1024 * 10, extended: false}));
var multer  = require('multer');
var datetimestamp='';
var filename='';
var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {

        filename=file.originalname.split('.')[0].replace(' ','') + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1];
        cb(null, filename);
    }
});

var upload = multer({ //multer settings
    storage: storage
}).single('file');


app.use(bodyParser.json({type: 'application/vnd.api+json'})); // parse application/vnd.api+json as json

app.use(function(req, res, next) { //allow cross origin requests
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


var EventEmitter = require('events').EventEmitter;

const emitter = new EventEmitter()

emitter.setMaxListeners(0)


/** API path that will upload the files */
app.post('/uploads', function(req, res) {

    datetimestamp = Date.now();
    upload(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err});
            return;
        }
        res.json({error_code:0,filename:filename});
    });
});

var mongodb = require('mongodb');
var url = 'mongodb://localhost:27017/mealplant';

var MongoClient = mongodb.MongoClient;

MongoClient.connect(url, function (err, database) {
    if (err) {
        console.log(err);

    }else{
        db=database;

    }});

//get default function
app.get('/',function(req,resp){
    var collection = db.collection('users');

    collection.find().toArray(function(err, items) {

        resp.send(JSON.stringify(items));

    });
});


//get userlist
app.get('/userlist',function (req,resp) {

    var collection = db.collection('users');

    collection.find().toArray(function(err, items) {

        resp.send(JSON.stringify(items));
    });

});

//add user
app.post('/user-signup',function(req,resp){

    var crypto = require('crypto');

    var secret = req.body.password;
    var hash = crypto.createHmac('sha256', secret)
        .update('password')
        .digest('hex');

    var collection = db.collection('users');

    collection.insert([{
        username: req.body.username,
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,
        password: hash,
        height: req.body.height,
        heightinch: req.body.heightinch,
        weight: req.body.weight,
        weightunit: req.body.weightunit,
        dob: req.body.dob,
        gender: req.body.gender,
        plan: req.body.plan,
        bodyfat: req.body.bodyfat,
        bodyfatunit: req.body.bodyfatunit,
        deviceinfo: req.body.deviceinfo,
        added_time: Math.floor(Date.now() / 1000),
        last_login: 0,
        status: 1
    }], function (err, result) {
        if (err) {
            resp.send(JSON.stringify({'status':'error','id':0}));
        } else {
            resp.send(JSON.stringify({'status':'success','id':result.ops[0]._id}));
        }
    });

});


//signup 2nd step
app.post('/user-signup2',function(req,resp){

    var collection = db.collection('users');

    var data = {
        neck: req.body.neck,
        neckunit: req.body.neckunit,
        shoulders: req.body.shoulders,
        shouldersunit: req.body.shouldersunit,
        bust: req.body.bust,
        bustunit: req.body.bustunit,
        armsl: req.body.armsl,
        armsr: req.body.armsr,
        armsunit: req.body.armsunit,
        forearmsl: req.body.forearmsl,
        forearmsr: req.body.forearmsr,
        forearmsunit: req.body.forearmsunit,
        waist: req.body.waist,
        waistunit: req.body.waistunit,
        navel: req.body.navel,
        navelunit: req.body.navelunit,
        hips: req.body.hips,
        hipsunit: req.body.hipsunit,
        thighl: req.body.thighl,
        thighr: req.body.thighr,
        thighunit: req.body.thighunit,
        calvesl: req.body.calvesl,
        calvesr: req.body.calvesr,
        calvesunit: req.body.calvesunit
    }

    var o_id = new mongodb.ObjectID(req.body._id);

    collection.update({_id:o_id}, {$set: data}, true, true);

    resp.send(JSON.stringify({'status':'success'}));

});

//get user details
//signup 2nd step
app.post('/getuserdetails',function(req,resp){

    var resitem = {};

    var collection = db.collection('users');

    var o_id = new mongodb.ObjectID(req.body._id);

    collection.find({_id:o_id}).toArray(function(err, items) {

        if (err) {
            resp.send(JSON.stringify({'status':'error','id':0}));
        } else {
            resitem = items[0];

            resitem.leanmass = 0;
            resitem.fatpercentage = 0;
            resitem.excessfat = 0;
            resitem.fatmass = 0;

            /*******************fat calculation*************************/
            var weight = parseFloat(resitem.weight);
             var waist = parseFloat(resitem.waist);
             var var1 = weight*1.082;
             var  var2 = waist*4.15;

             var leanwight = (parseFloat(var1) + 94.42)-parseFloat(var2);
             leanwight = parseFloat(leanwight);
             leanwight = leanwight.toFixed(2);
             var fatpercentage1 = ((weight-leanwight)*100)/weight;
             fatpercentage1 = parseFloat(fatpercentage1);
             fatpercentage1 = fatpercentage1.toFixed(2);

            var fatm = (parseFloat(weight)*parseFloat(fatpercentage1))/100;

            fatm = parseFloat(fatm);
            fatm = fatm.toFixed(2);
            fatm = parseFloat(fatm);

            resitem.leanmass = parseFloat(leanwight);
            resitem.fatpercentage = parseFloat(fatpercentage1);
            resitem.fatmass = parseFloat(fatm);

            var bodyfat = parseFloat(resitem.bodyfat);

            if(bodyfat > fatm){
                var excessfat = parseFloat(bodyfat)-parseFloat(fatm);
                excessfat = parseFloat(excessfat);
                excessfat = excessfat.toFixed(2);
                resitem.excessfat = parseFloat(excessfat);
            }


            resp.send(JSON.stringify({'status':'success','item':resitem}));
        }
    });

});


app.get('/tt',function (req,resp) {

    resp.send('ty45oo');

});


app.listen(port);
 console.log("App listening on port " + port);

