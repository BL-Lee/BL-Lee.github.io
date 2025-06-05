
window.onerror = function(msg, url, linenumber) {
    console.log(msg);
    document.getElementById("errorLog").textContent += 'Error message: '+msg+'\nURL: '+url+'\nLine Number: '+linenumber + "\n";
    return true;
}

//alert("hi");
/*if (HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')){
    alert("we support it");
}
else {
    alert("we dont support it");
}*/

import * as THREE from "../../modules/three/build/three.module.js";
//import * as THREE from "three";

import * as UI from "./UI.js";
import * as HP from "./helpers.js";
import * as SP from "./ships.js";
import * as OJ from "./loaders.js";

var scene;
var renderer;
var camera;

var clock = new THREE.Clock();
var dt = 0;

var w;
var h;
var aspectRatio;

const raycaster = new THREE.Raycaster();
const mousePointer = new THREE.Vector2();

var gunObj = {};
var fireSound = null;
var roundMissCounter = 0;
var roundDelay = 0.0;
var playerHitTime = 0.0;
var inbetweenGames = true;
function initScene()
{
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x000000 );
    w = window.innerWidth;
    h = window.innerHeight;
    aspectRatio = w / h;
    let unitWidth = 20;

    camera = new THREE.PerspectiveCamera(
      100,
      window.innerWidth / window.innerHeight,
      0.1,
      20
    );

    const listener = new THREE.AudioListener();
    camera.add( listener );
    fireSound = new THREE.Audio( listener );
    //load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load( '../js/asteroids/audio/player_fire.wav', function( buffer ) {
	fireSound.setBuffer( buffer );
	fireSound.setLoop( false );
	fireSound.setVolume( 0.5 );
    });
    
    const light = new THREE.AmbientLight( 0xffffff ); // soft white light
    scene.add( light );
    //Look down z at xy plane
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 5;
    camera.lookAt(0,0,1);
    camera.updateMatrixWorld();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight ); //half resolution
    renderer.setViewport(0,0,window.innerWidth, window.innerHeight  ); //half resolution
    renderer.setPixelRatio(0.4);
    document.body.appendChild(renderer.domElement);
}

async function initPlayer()
{
    OJ.loadObject("gun", gunObj);
    await OJ.waitUntilLoaded(gunObj);
    scene.add(gunObj.mesh);
    gunObj.name = "gun";
    gunObj.mesh.position.z = 4.5;
    gunObj.mesh.position.y = -1.5;
    gunObj.mesh.rotation.set( 0, 3.14, 0);

    gunObj.laserIndex = 0;
    gunObj.lasers = [];
    let lasers = gunObj.lasers;

    for (let i = 0; i < 4; i++)
    {
	lasers.push({});
	let laserMaterial = new THREE.MeshBasicMaterial({
	    color: '#ffaaaa',
	    side: THREE.DoubleSide,
	    alphaHash: true,
	    opacity: 0.0,
	    polygonOffset: true,
	    polygonOffsetFactor: 1,
	    polygonOffsetUnits: 1

	});
	OJ.loadObject("laser", lasers[i], laserMaterial, true);
	lasers[i].name = "laser";
	await OJ.waitUntilLoaded(lasers[i]);
	scene.add(lasers[i].mesh);

	lasers[i].mesh.updateMatrixWorld();
    }
}

function resetRound()
{
    UI.calculateMultiplier(roundMissCounter);
    SP.resetShips(scene,camera);
    roundDelay = 3.0;
}

function startGame()
{
    UI.resetGame();
    SP.resetShips(scene,camera);
}

function animate() {
    dt += clock.getDelta();
    if (dt < 1 / 20)
	return;

    if (inbetweenGames)
    {
	renderer.render(scene,camera);
	UI.UIRenderer.render( scene, camera );
	roundDelay -= dt;
	dt = 0;
	return;
    }
    
    if (roundDelay > 0.0)
    {
	console.log("round update");
	UI.multiplierUpdate(dt);
	UI.UIRenderer.render( scene, camera );
	roundDelay -= dt;
	if (roundDelay <= 0.0)
	{
	    console.log("done round reset");
	    UI.resetRound();
	    roundMissCounter = 0;
	}
	dt = 0;
	return;
    }

    
    if (!SP.shipsLoadedCheck(scene))
	return;

    if (playerHitTime > 0.0)
    {
	playerHitTime -= dt;
	if (playerHitTime <= 0.0)
	{
	    const color = new THREE.Color(0xff0000);
	    color.lerp(new THREE.Color(0xCCAA88), UI.health / 7);
	    gunObj.mesh.material.color.copy(color);
	}
    }
    if (SP.playerHit)
    {
	gunObj.mesh.material.color.setHex(0xff0000);
	playerHitTime = 0.2;
	SP.resetPlayerHit();
    }
    
    mouseUpdate();

    for (let i = 0; i < gunObj.lasers.length; i++)
    {

	let mat = gunObj.lasers[i].mesh.material;
	if (mat.opacity > 0.0)
	{
	    mat.opacity -= (1 / 0.5) * dt;
	    mat.opacity = Math.max(0, mat.opacity); 
	}
    }

    let shipsDead = 0;
    for (let i = 0; i < SP.enemyShips.length; i++)
    {
	let ship = SP.enemyShips[i];
	SP.shipUpdate(ship.mesh, scene, dt);
	if (ship.mesh.dead)
	    shipsDead += 1;
    }
    if (shipsDead == SP.enemyShips.length && SP.enemyShips.length == 4)
    {
	resetRound();
    }
    if (UI.health <= 0)
    {
	UI.showHighScore();
	SP.resetShips(scene, camera);
	inbetweenGames = true;
	roundDelay = 1.0;
    }
    UI.hitLabelUpdate(dt);
    dt = 0;
    renderer.render(scene,camera);
    UI.UIRenderer.render( scene, camera );
}






function onMouseMove(e){
    mousePointer.x = e.clientX;
    mousePointer.y = e.clientY;
}




function onMouseClick(e) {
    if (roundDelay > 0.0)
	return;
    if (inbetweenGames)
    {
	inbetweenGames = false;
	startGame();
	return;
    }
    if (e.touches)
    {
	mousePointer.x = e.touches[0].clientX;
	mousePointer.y = e.touches[0].clientY;
    }
    else
    {
	
	mousePointer.x = e.clientX;
	mousePointer.y = e.clientY;
    }

    let screenCoord = new THREE.Vector3((mousePointer.x / window.innerWidth * 2 - 1), -(mousePointer.y / window.innerHeight * 2 - 1), 1.0);
    
    let screenPos = screenCoord.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
    if (screenPos.x != NaN)
	gunObj.mesh.lookAt( screenPos, gunObj.mesh.position, gunObj.mesh.up );

    const intersects = HP.hitDetectShips(screenPos, camera, raycaster, SP.enemyShipObjs)
    
    if (intersects)
    {
	for (let i = 0; i < intersects.length; i++)
	{
	    SP.handleShipHit(intersects[i]);
	    UI.showHit(intersects[i].object.parent); //Hitting back and front
	}
    }
    const projIntersects = HP.hitDetectShips(screenPos, camera, raycaster, SP.activeProjectiles())
    if (projIntersects)
    {
	for (let i = 0; i < projIntersects.length; i++)
	{
	    const proj = projIntersects[i].object.top;
	    proj.exploding = true;
	    proj.explodingTime = 0.5;
	    console.log(proj.mesh.children[0]);
	    proj.mesh.children[0].material.color.setHex(0x0000ff);
	    UI.showHit(projIntersects[i].object.parent); //Hitting back and front
	}
    }
    if (intersects && intersects.length == 0 &&
	projIntersects && projIntersects.length == 0)
    {
	roundMissCounter += 1;
    }

    let nextLaser = gunObj.lasers[gunObj.laserIndex];
    nextLaser.mesh.material.opacity = 1.0;
    nextLaser.mesh.rotation.copy(gunObj.mesh.rotation);
    nextLaser.mesh.position.copy(gunObj.mesh.position);
    gunObj.laserIndex = (gunObj.laserIndex + 1) % gunObj.lasers.length;
    fireSound.stop();
    fireSound.play();
}


function mouseUpdate()
{
    let screenCoord = new THREE.Vector3((mousePointer.x / window.innerWidth * 2 - 1), -(mousePointer.y / window.innerHeight * 2 - 1), 1.0);
    
    let screenPos = screenCoord.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
    if (screenPos.x != NaN)
	gunObj.mesh.lookAt( screenPos, gunObj.mesh.position, gunObj.mesh.up );
}

initScene();
await initPlayer();

if(window.matchMedia("(pointer: coarse)").matches) {
    // touchscreen
    window.addEventListener("touchstart", onMouseClick);
}
else{
    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("click", onMouseClick);
}


await SP.initShips(scene, camera);
renderer.setAnimationLoop(animate);
UI.initUI(scene, camera);
UI.updateHealth(0);

document.onkeypress = function(e) {
    e = e || window.event;
    if (e.keyCode == 13)
    {
	console.log(renderer.info);
    }
}


