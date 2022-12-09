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

    var player;
    navigationPlugin.createNavMesh([staticMesh], navmeshParameters,(navmeshData) =>
    {
        console.log("got worker data", navmeshData);
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

        //
        // Player
        //
        BABYLON.SceneLoader.ImportMesh("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", scene, function (newMeshes, particleSystems, skeletons, animationGroups) {
        
            player = newMeshes[0];
            player.isPickable = false;
            player.checkCollisions = false;

            for (var i = 0; i < newMeshes.length; i++) {
                newMeshes[i].isPickable = false;
                newMeshes[i].checkCollisions = false;
            }
        
            //Scale the model down        
            player.scaling.scaleInPlace(0.1);
            
            const walkAnim = scene.getAnimationGroupByName("Walking");
            const walkBackAnim = scene.getAnimationGroupByName("WalkingBack");
            const idleAnim = scene.getAnimationGroupByName("Idle");
            const sambaAnim = scene.getAnimationGroupByName("Samba");

            var targetCube = BABYLON.MeshBuilder.CreateBox("cube", { size: 0.1, height: 0.1 }, scene);
            var startPos = navigationPlugin.getClosestPoint(new BABYLON.Vector3(0, 0, 5));
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

                    //
                    idleAnim.stop();
                    sambaAnim.stop();
                    walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to, false);
                }
            }

            // On reach destination
            crowd.onReachTargetObservable.add((agentInfos) => {

                // stop all animation
                idleAnim.stop();
                walkAnim.stop();
                sambaAnim.stop();
                
                // teleport agent to destonation
                crowd.agentTeleport(agents[0], crowd.getAgentPosition(agents[0]));

                if (pickedMesh != null) {
                        
                    console.log("reach destination : " + pickedMesh.metadata);

                    if (pickedMesh.metadata == "ground") {
                
                        //..
                        walkAnim.stop();
                        sambaAnim.stop();
                        idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);
                    }
                    else if (pickedMesh.metadata == "interactable") {
       
                        //..
                        walkAnim.stop();
                        idleAnim.stop();
                        sambaAnim.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);

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

            scene.onBeforeRenderObservable.add(()=> {
                var ag = agents[0];
                ag.mesh.position = crowd.getAgentPosition(ag.idx);
                let vel = crowd.getAgentVelocity(ag.idx);
                crowd.getAgentNextTargetPathToRef(ag.idx, ag.target.position);
                if (vel.length() > 0.2)
                {
                    player.lookAt(ag.target.position, Math.PI);
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