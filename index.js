var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var osc = require("node-osc");

app.get('/', function(req, res){
  res.sendFile(__dirname + "/index.html");
});

// Define global parameters
var sendHost = "localhost"; // Set IP of computer running Max
var sendPort = 7771;
var recvHost = "localhost"; // Set IP of computer running Node.js
var recvPort = 7770;

// Setup to receive OSC messages from server
var oscRecv = new osc.Server(recvPort, recvHost);
oscRecv.on("message", function(msg_array, rinfo) {
  // Forward received message to all clients
  io.emit("message", msg_array); // This function sends msg_array to all connected clients
  console.log("Recv:", msg_array, "From:", rinfo);
});

// Setup to send OSC messages from clients
var oscSend = new osc.Client(sendHost, sendPort);

// Every time a client connects the following is executed:
io.on("connection", function(socket){
  socket.on("message", function (msg_array) {
    // Build OSC message
    var osc_msg =  new osc.Message(msg_array[0]);
    for (var i=1; i < msg_array.length; i++) {
      osc_msg.append(msg_array[i]);
    }
    // Forward osc_msg to server from current client
    oscSend.send(osc_msg);
    // Forward msg_array to other clients (excluding the current client)
    socket.broadcast.emit("message", msg_array); 
    console.log("Send:", msg_array);
  });
  
  // oscSend.send("/status", socket.sessionId + " connected");

  // socket.on("disconnect", function(){
  //   console.log("client disconnected");
  // });
});

http.listen(3000, function(){
  console.log("listening on *:3000");
});