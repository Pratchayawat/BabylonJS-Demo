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

        mainFunction(1000);
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
            var animGroup = animationPairings[data.id];
            if (data.animation >= 0) {
                animGroup[data.animation].play(true);
            } else {
                for (var i = 0; i < animGroup.length; i++) {
                    animGroup[i].stop();
                }
            }
        }
    });

    socket.on("UPDATE_VOICE", function (data) {
        var audio = new Audio(data);
        audio.muted = false;
        audio.play();
        //console.log(data);
	});

    socket.on('disconnected', function (data) {

        if (players[data.id]) {
            console.log('dispose ' + data.id);
            players[data.id].dispose();
            //animationPairings[data.id].dispose();
            delete players[data.id];
            delete animationPairings[data.id];
        }
    });
}

window.onload = (e) => {

	//mainFunction(1000);

};
  
function mainFunction(time) {
  
	navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {

	    var madiaRecorder = new MediaRecorder(stream);
	    madiaRecorder.start();
  
	    var audioChunks = [];
  
        madiaRecorder.addEventListener("dataavailable", function (event) {
            audioChunks.push(event.data);
        });
    
	    madiaRecorder.addEventListener("stop", function () {
            var audioBlob = new Blob(audioChunks);
    
            audioChunks = [];
    
            var fileReader = new FileReader();
            fileReader.readAsDataURL(audioBlob);
            fileReader.onloadend = function () {
    
                var base64String = fileReader.result;
                socket.emit("UPDATE_VOICE", base64String);
            };
    
            madiaRecorder.start();
    
            setTimeout(function () {
                madiaRecorder.stop();
            }, time);
	    });
  
        setTimeout(function () { 
            madiaRecorder.stop(); 
        }, time);
	});
}