const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const timeout = require("connect-timeout");
const config = require("@bootloader/config");

const app = express();
//app.use(express.static("public"));

global.appRoot = path.resolve(__dirname);
app.set("view engine", "ejs");

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(timeout("10s"));

let tuberDir = config.get("tuber.dir");
app.use("/media", express.static(tuberDir));

module.exports = app;
