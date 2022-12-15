var canvas;
var engine;
var scene;
var agents = [];

async function createScene() {

    canvas = document.getElementById("canvas");
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.31, 0.48, 0.64);

    //
    // Loading screen
    //
    engine.displayLoadingUI();

    //
    // Player
    //
    player = await createCharacter(scene, ClientID);

    //
    // Create recast
    //
    const recast = await Recast();
    let navigationPlugin = new BABYLON.RecastJSPlugin();
    navigationPlugin.setWorkerURL("./workers/navMeshWorker.js");
    var staticMesh = createStaticMesh(scene);
    var navmeshParameters = {
        cs: 0.2,
        ch: 0.2,
        walkableSlopeAngle: 90,
        walkableHeight: 1.0,
        walkableClimb: 1,
        walkableRadius: 1,
        maxEdgeLen: 12.,
        maxSimplificationError: 1.3,
        minRegionArea: 8,
        mergeRegionArea: 20,
        maxVertsPerPoly: 6,
        detailSampleDist: 6,
        detailSampleMaxError: 1,
    };

    //
    // Create navmesh
    //
    navigationPlugin.createNavMesh([staticMesh], navmeshParameters,(navmeshData) =>
    {
        navigationPlugin.buildFromNavmeshData(navmeshData);
        var navmeshdebug = navigationPlugin.createDebugNavMesh(scene);
        navmeshdebug.position = new BABYLON.Vector3(0, 0.01, 0);
        navmeshdebug.isPickable = false;
        navmeshdebug.checkCollisions = false;

        var matdebug = new BABYLON.StandardMaterial('matdebug', scene);
        matdebug.diffuseColor = new BABYLON.Color3(0.1, 0.2, 1);
        matdebug.alpha = 0.2;
        navmeshdebug.material = matdebug;

        // crowd
        var crowd = navigationPlugin.createCrowd(10, 0.1, scene);
        var i;
        var agentParams = {
            radius: 0.05,
            height: 0.2,
            maxAcceleration: 5000.0,
            maxSpeed: 4.0,
            collisionQueryRange: 0.5,
            pathOptimizationRange: 0.0,
            separationWeight: 1.0
        };

        var targetCube = BABYLON.MeshBuilder.CreateBox("cube", { size: 0.1, height: 0.1 }, scene);
        var startPos = navigationPlugin.getClosestPoint(new BABYLON.Vector3(0, 0.2, 5));
        var transform = new BABYLON.TransformNode();
        var agentIndex = crowd.addAgent(startPos, agentParams, transform);
        agents.push({idx:agentIndex, trf:transform, mesh:player, target:targetCube});
        
        //
        // Point n click
        //
        var startingPoint;
        var pickedMesh;
        var pathLine;
        var getGroundPosition = function () {
            var pickinfo = scene.pick(scene.pointerX, scene.pointerY);
            if (pickinfo.hit) {
                return pickinfo.pickedPoint;
            }

            return null;
        }

        var pointerDown = function (mesh) {
            console.log("picked mesh : " + mesh.name + ", metadata : " + mesh.metadata);
            pickedMesh = mesh;
            startingPoint = getGroundPosition();
            if (startingPoint != null) {
                var agents = crowd.getAgents();
                var randomPos = navigationPlugin.getRandomPointAround(startingPoint, 1.0);
                crowd.agentGoto(agents[0], navigationPlugin.getClosestPoint(startingPoint));
                var pathPoints = navigationPlugin.computePath(crowd.getAgentPosition(agents[0]), navigationPlugin.getClosestPoint(startingPoint));
                pathLine = BABYLON.MeshBuilder.CreateDashedLines("ribbon", {points: pathPoints, updatable: true, instance: pathLine}, scene);

                playAnimation(ClientID, 2);
            }
        }

        // On reach destination
        crowd.onReachTargetObservable.add((agentInfos) => {

            stopAnimation(ClientID);
            
            // teleport agent to destination
            crowd.agentTeleport(agents[0], crowd.getAgentPosition(agents[0]));

            if (pickedMesh != null) {
                    
                console.log("reach destination : " + pickedMesh.metadata);

                if (pickedMesh.metadata == "ground") {
            
                    //..
                    playAnimation(ClientID, 0);
                }
                else if (pickedMesh.metadata == "interactable") {

                    //..
                    playAnimation(ClientID, 1);

                    player.position = pickedMesh.position.clone();
                    player.rotation = new BABYLON.Vector3(pickedMesh.rotation.x, pickedMesh.rotation.y, 0);
                    
                }

                pickedMesh = null;
            }
        });
        
        scene.onPointerObservable.add((pointerInfo) => {      		
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if(pointerInfo.pickInfo.hit) {
                        pointerDown(pointerInfo.pickInfo.pickedMesh)
                    }
                    break;
            }
        });

        var oldPostion = new BABYLON.Vector3(0, 0, 0);
        scene.onBeforeRenderObservable.add(()=> {
            var ag = agents[0];
            ag.mesh.position = crowd.getAgentPosition(ag.idx);
            let vel = crowd.getAgentVelocity(ag.idx);
            crowd.getAgentNextTargetPathToRef(ag.idx, ag.target.position);
            if (vel.length() > 0.2)
            {
                player.lookAt(ag.target.position, Math.PI);
            }

            if (oldPostion.equals(player.position) == false) {
                oldPostion = player.position;

                // Update position
                var data = {
                    username : '',
                    id : ClientID,
                    position : {
                        x : player.position.x,
                        y : player.position.y,
                        z : player.position.z
                    },
                    rotation : {
                        x : player.rotation.x,
                        y : player.rotation.y,
                        z : player.rotation.z
                    }
                }
                socket.emit('updatePosition', data);
            }
        });  

        //
        // Light
        //
        var light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);

        //
        // Interactable
        //
        var sphere = BABYLON.MeshBuilder.CreateSphere("chair", {subdivisions: 8, diameter: 1}, scene);
        sphere.metadata = "interactable";
        var spherePositionArray = [
            [new BABYLON.Vector3(5, 0, 5), new BABYLON.Vector3(BABYLON.Tools.ToRadians(0), BABYLON.Tools.ToRadians(0), BABYLON.Tools.ToRadians(180))],
        ];
        sphere.position = spherePositionArray[0][0];
        sphere.rotation = spherePositionArray[0][1];

        //
        //CAMERA
        //
        var camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(90), BABYLON.Tools.ToRadians(60), 20, new BABYLON.Vector3(0, 1, 0), scene);
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 90;
        camera.upperBetaLimit = Math.PI / 2 - 0.1;
        camera.attachControl(canvas, true);
        camera.inputs.attached.pointers.buttons = [1]; //wheel click change position for camera
        camera.lockedTarget = player;
        
        // run the render loop
        engine.runRenderLoop(function(){
            scene.render();
        });

        // the canvas/window resize event handler
        window.addEventListener('resize', function(){
            engine.resize();
        });

        engine.hideLoadingUI();
    });
};

//
// Combined mesh that will use for creating nav
//
function createStaticMesh(scene) {
    
    //
    // Ground
    //
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {height: 50, width: 50, subdivisions: 4});
    var groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = new BABYLON.Texture("./textures/floor.jpg", scene);
    groundMaterial.diffuseTexture.uScale = 10;
    groundMaterial.diffuseTexture.vScale = 10;
    groundMaterial.specularColor = new BABYLON.Color3(.1, .1, .1);
    ground.material = groundMaterial;

    // Materials
    var mat1 = new BABYLON.StandardMaterial('mat1', scene);
    mat1.diffuseColor = new BABYLON.Color3(1, 1, 1);

    var sphere = BABYLON.MeshBuilder.CreateSphere("sphere1", {diameter: 2, segments: 16}, scene);
    sphere.material = mat1;
    sphere.position.y = 1;

    var cube = BABYLON.MeshBuilder.CreateBox("cube", { size: 1, height: 3 }, scene);
    cube.position = new BABYLON.Vector3(1, 1.5, 0);
    //cube.material = mat2;

    var mesh = BABYLON.Mesh.MergeMeshes([sphere, cube, ground]);
    mesh.metadata = "ground";
    return mesh;
}

//
// Import and create character
//
async function createCharacter(scene, id) {

    //
    // Player
    //
    /*const result = await BABYLON.SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", scene);
    var mesh = result.meshes[0];
    mesh.name = 'char' + id;
    mesh.position = new BABYLON.Vector3(0, 0.2, 5);
    mesh.rotation = new BABYLON.Vector3(0, 10, 0);
    mesh.isPickable = false;
    mesh.checkCollisions = false;      
    mesh.scaling.scaleInPlace(0.1);

    for (var i = 0; i < result.meshes.length; i++) {
        result.meshes[i].isPickable = false;
        result.meshes[i].checkCollisions = false;
    }*/

    const { meshes, animationGroups } = await BABYLON.SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", scene);
    var mesh = meshes[0];
    mesh.name = id;
    mesh.position = new BABYLON.Vector3(0, 0.2, 5);
    mesh.rotation = new BABYLON.Vector3(0, 10, 0);
    mesh.isPickable = false;
    mesh.checkCollisions = false;      
    mesh.scaling.scaleInPlace(0.1);

    for (var i = 0; i < meshes.length; i++) {
        meshes[i].isPickable = false;
        meshes[i].checkCollisions = false;
    }

    //
    players[id] = mesh;
    animationPairings[id] = animationGroups;

    return mesh;

    /*BABYLON.SceneLoader.ImportMesh("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", scene, function (newMeshes, particleSystems, skeletons, animationGroups) {
    
        var mesh;
        mesh = newMeshes[0];
        mesh.isPickable = false;
        mesh.checkCollisions = false;

        for (var i = 0; i < newMeshes.length; i++) {
            newMeshes[i].isPickable = false;
            newMeshes[i].checkCollisions = false;
        }
    
        //Scale the model down        
        mesh.scaling.scaleInPlace(0.1);

        return mesh;
    });*/
}

//
// idle = 0, samba = 1, walk = 2, walkback = 3
//
function playAnimation (id, anim) {

    var animGroup = animationPairings[id];
    animGroup[anim].play(true);

    var data = {
        id : id,
        animation : anim
    }
    socket.emit('updateAnimation', data);
}

//
// stop all animation
//
function stopAnimation (id) {

    var animGroup = animationPairings[id];
    for (var i = 0; i < animGroup.length; i++) {
        animGroup[i].stop();
    }

    var data = {
        id : id,
        animation : -1
    }
    socket.emit('updateAnimation', data);
}