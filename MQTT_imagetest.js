const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require("fs");
const router = express.Router();
const mqtt = require('mqtt');
// const Blob = require("cross-blob");
// Init app
var app = express();

const client = mqtt.connect('tcp://220.132.124.155:1883');//MQTT broker IP
client.on('connect', function () {
  console.log("MQTT is connect");
  
  var img = fs.readFileSync("cat.jpg");
  console.log(img);

  client.publish('cam', img);
});

// var blob= new Blob([img], {type: "image/jpg"});
// console.log(img);
// let buffer = Buffer.from(img);
// let arraybuffer = Uint8Array.from(buffer).buffer;
// var blob = new Blob([img],{applicationjson});

// console.log(JSON.stringify(img));



const port = 3000;

app.listen(port, () => console.log(`Server started on port ${port}`));