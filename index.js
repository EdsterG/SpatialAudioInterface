var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var nodeOSC = require("node-osc");

app.get('/', function(req, res){
  res.sendFile(__dirname + "/index.html");
});

// Define global parameters
var sendHost = "localhost"; // Set IP of computer running Max
var sendPort = 7771;
var recvHost = "localhost"; // Set IP of computer running Node.js
var recvPort = 7770;

// Setup to receive OSC messages from server
var oscRecv = new nodeOSC.Server(recvPort, recvHost);
function OSCrecv(osc_msg) {
  // Build OSC object
  var osc_obj;
  if (osc_msg[0] == "#bundle") {
    console.log("Recv:", osc_msg);
    var elems = [];
    for (var i=2; i<osc_msg.length; i++) {
      var elem = { oscType : "message",
                   address : osc_msg[i][0],
                   args : osc_msg[i].slice(1,osc_msg[i].length),
                 }
      elems.push(elem);
    }
    osc_obj = { oscType : "bundle",
                timetag : osc_msg[1],
                elements : elems,
              }
  } else {
    osc_obj = { oscType : "message",
                address : osc_msg[0],
                args : osc_msg.slice(1,osc_msg.length),
              }
  }

  // Send osc_obj to all clients
  io.emit("OSC message", osc_obj); // This function sends osc_obj to all connected clients
  console.log("Recv:", JSON.stringify(osc_obj));
}
oscRecv.on("message", function(osc_msg, rinfo) {
  OSCrecv(osc_msg)
});

// Setup to send OSC messages from clients
var oscSend = new nodeOSC.Client(sendHost, sendPort);
function OSCsend(osc_obj, socket) {
  // Build OSC message
  var osc_msg =  new nodeOSC.Message(osc_obj.address);
  for (var i=0; i < osc_obj.args.length; i++) {
    osc_msg.append(osc_obj.args[i]);
  }
  // Send osc_msg to server
  oscSend.send(osc_msg);
  // Forward osc_obj to all other clients
  socket.broadcast.emit("OSC message", osc_obj); // This function sends osc_obj to all connected clients, excluding the current client
  console.log("Send:", JSON.stringify(osc_obj));
}

// Every time a client connects the following is executed:
io.on("connection", function(socket){
  // Setup osc forwarding from this client to the server
  socket.on("OSC message", function(osc_obj) {
    OSCsend(osc_obj, socket);
  });

  // OSCsend({address:"/status", args:socket.id+" connected" });
  // console.log("client connected");
  
  // socket.on("disconnect", function(){
  //   OSCsend({address:"/status", args:socket.id+" disconnected" });  
  //   console.log("client disconnected");
  // });
});

http.listen(3000, function(){
  console.log("listening on *:3000");
});