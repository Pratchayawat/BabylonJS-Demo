const PORT = process.env.PORT || 8080
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname + '/'));

// player Classes
var Player = require('./src/Classes/player.js');

var players = [];
var sockets = [];

io.on('connection', function (socket) {

    console.log("Client " + socket.id + " connected");

    var player = new Player();
    var thisPlayerID = player.id;
    
    players[thisPlayerID] = player;
    sockets[thisPlayerID] = socket;

    // temp
    player.username = "Player : " + Object.keys(players).length;
    
    // Tell the client that this is our id for server
    socket.emit('register', player );
    socket.emit('spawn', player); // Tell myself to spawn
    socket.broadcast.emit('spawn', player) // Tell other I have spawn

    // Tell myself about everyone else in the game
    for (var playerID in players) {
        if (playerID != thisPlayerID) {
            socket.emit('spawn', players[playerID]);
        }
    }

    // Positional Data from client
    socket.on('updatePosition', function(data) {

        player.position.x = data.position.x;
        player.position.y = data.position.y;
        player.position.z = data.position.z;

        player.rotation.x = data.rotation.x;
        player.rotation.y = data.rotation.y;
        player.rotation.z = data.rotation.z;

        socket.broadcast.emit('updatePosition', player);
    });

    // Animation Data from client
    socket.on('updateAnimation', function(data) {
        
        socket.broadcast.emit('updateAnimation', data);
    });

    // Voice chat
    socket.on('update_voice', function(data) {
    
        var newData = data.split(";");
        newData[0] = "data:audio/ogg;";
        newData = newData[0] + newData[1];

        socket.broadcast.emit('update_voice', newData);
    });

    socket.on('audio_mute', function(data) {

        player.isMute = data.isMute;
        socket.broadcast.emit('audio_mute', player);
    });

    socket.on('disconnect', function () {
        console.log("Client " + socket.id + " disconnected");

        delete players[thisPlayerID];
        delete sockets[thisPlayerID];
        socket.broadcast.emit('disconnected', player);
    });
});

server.listen(PORT, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("\nServer running http://%s:%s", host, port)
});