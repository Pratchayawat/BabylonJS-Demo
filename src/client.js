var socket;
var player; // my player
var players = []; // all players mesh
var animationPairings = []; // all palyers animation group

var ClientID;

function initSocket() {
    
    socket = null;
    socket = io().connect();
    socket.on('connect', function () {

    });

    socket.on('register', function (data) {
        console.log('register ' + data.id);

        ClientID = data.id;
        createScene();

    });

    socket.on('spawn', function (data) {
  
        if (data.id != ClientID) {
            console.log('spawn ' + data.id);
            createCharacter(scene, data.id);
        }
    });

    socket.on('updatePosition', function (data) {

        if (players[data.id]) {
            players[data.id].position = new BABYLON.Vector3(data.position.x, data.position.y, data.position.z);
            players[data.id].rotation = new BABYLON.Vector3(data.rotation.x, data.rotation.y, data.rotation.z);
        }
    });

    socket.on('updateAnimation', function (data) {

        if (players[data.id]) {
            console.log(data.animation);
            var animGroup = animationPairings[data.id];
            if (data.animation >= 0) {
                animGroup[data.animation].play(true);
            } else {
                for (var i = 0; i < animGroup.length; i++) {
                    animGroup[i].stop();
                }
                console.log("stopall");
            }
        }
    });

    socket.on('disconnected', function (data) {

        if (players[data.id]) {
            console.log('dispose ' + data.id);
            players[data.id].dispose();
            delete players[data.id];
        }
    });
}