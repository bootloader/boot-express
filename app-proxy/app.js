const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const timeout = require("connect-timeout");
const config = require("@bootloader/config");
const proxy = require("@bootloader/proxy");

const app = express();
//app.use(express.static("public"));
global.appRoot = path.resolve(__dirname);

app.set("view engine", "ejs");

// Middleware setup
app.use(timeout('10s'))
app.use(cors());
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});
app.options('*', cors())
var customParser = bodyParser.json({type: function(req) {
    console.log("customParser:bodyParser.json",req.headers['content-type'])
    if (req.headers['content-type'] === ""){
        return req.headers['content-type'] = 'application/json';
    }
    else if (typeof req.headers['content-type'] === 'undefined'){
        return req.headers['content-type'] = 'application/json';
    } else {
        return req.headers['content-type'] = 'application/json';
    }
}});
app.use(cookieParser());


app.use(haltOnTimedout)
app.use(
  proxy.router({
    express,
    ready: ({ appendRequestHeader }) => {
      let tnt = (function (domain) {
        let tnts = domain.split(".")[0].split("/");
        return tnts[tnts.length - 1];
      })(config.get("mry.domain"));
      headers = appendRequestHeader("tnt", tnt);
    },
  })
);
app.use(bodyParser.urlencoded({limit: '50mb',extended: false}));
app.use(bodyParser.json({limit: '50mb',extended: true}));
app.use(bodyParser.text({limit: '50mb',extended: true}));
app.use(bodyParser.raw({limit: '50mb'}));

//app.use(timeout("10s"));

app.get('/',function(req,res) {
    res.send({ x : "Hello World!"});
});

app.use((req,res,next) =>{
    const error = new Error('Path Not found');
    error.status = 404;
    next(error);
});

app.use((error,req,res,next) =>{
    res.status(error.status || 500);
    res.json({
        error : {
            message: error.message
        }
    });
});

function haltOnTimedout (req, res, next) {
    if (!req.timedout) next()
}
module.exports = app;
