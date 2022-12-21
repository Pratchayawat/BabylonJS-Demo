class Player {
    constructor() {
        this.id = "";
        this.mesh = null;
        this.position = null;
        this.rotation = null;
        this.animationGroup = null;
        this.speakerIcon = null;
        this.isMute = false;
    }

    destroy(params) {
        this.mesh.dispose();
        //this.animationGroup.dispose();
        this.speakerIcon.dispose();
    }
}

// all players
var players = [];

// self
var socket;
var clientID;

function initSocket() {
    
    document.getElementById("play").style.visibility = "hidden";

    socket = null;
    socket = io().connect();
    socket.on('connect', function () {

    });

    socket.on('register', function (data) {
        console.log('register ' + data.id);

        clientID = data.id;
        
        createScene(data);
        mainFunction(1000);
    });

    socket.on('spawn', function (data) {
  
        if (data.id != clientID) {
            createCharacter(data);
        }
    });

    socket.on('updatePosition', function (data) {

        if (players[data.id].mesh) {
            players[data.id].mesh.position = new BABYLON.Vector3(data.position.x, data.position.y, data.position.z);
            players[data.id].mesh.rotation = new BABYLON.Vector3(data.rotation.x, data.rotation.y, data.rotation.z);
        }
    });

    socket.on('updateAnimation', function (data) {

        if (players[data.id]) {
            var animGroup = players[data.id].animationGroup;
            if (data.animation >= 0) {
                animGroup[data.animation].play(true);
            } else {
                for (var i = 0; i < animGroup.length; i++) {
                    animGroup[i].stop();
                }
            }
        }
    });

    socket.on('update_voice', function (data) {
        var audio = new Audio(data);
        audio.play();
	});

    socket.on('audio_mute', function (data) {
        players[data.id].isMute = data.isMute;
        players[data.id].speakerIcon.alpha = data.isMute == true ? 0 : 1;
	});

    socket.on('disconnected', function (data) {

        if (players[data.id]) {
            console.log('dispose ' + data.id);
            players[data.id].destroy();
            delete players[data.id];
        }
    });
}
  
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

                if (players[clientID] == null || players[clientID].isMute == true) return;

                var base64String = fileReader.result;
                socket.emit("update_voice", base64String);
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