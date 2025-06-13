import * as THREE from "../../../modules/three/build/three.module.js";
import * as Input from "./input.js";
var TEMP_PLAYER = {};
var scene;
var camera;
var renderer;
var clock = new THREE.Clock();
var dt = 0;

var TEMP_CUBE;
var player = {
    transform : new THREE.Matrix4().makeTranslation(0,1,5).lookAt(0,0,1),
    forward : new THREE.Vector3(0,0,-1),
    position : new THREE.Vector3(0,1,5)
};
function initThree()
{
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x000000 );
    let w = window.innerWidth;
    let h = window.innerHeight;
    let  aspectRatio = w / h;
    let unitWidth = 20;

    camera = new THREE.PerspectiveCamera(
      90,
      w / h,
      0.1,
      20
    );
    
    const light = new THREE.AmbientLight( 0xffffff );
    scene.add( light );
    camera.updateMatrixWorld();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(w , h );
    renderer.setViewport(0, 0, w, h);
    renderer.setPixelRatio(0.4);
    document.body.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry( 10, 1, 11 );
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    TEMP_CUBE = new THREE.Mesh( geometry, material );
    scene.add( TEMP_CUBE );
}

function animate() {
    dt += clock.getDelta();
    if (dt < 1 / 20)
	return;

    //Input
    TEMP_CUBE.rotation.y += 0.61 * dt;

    //Updates
    if (Input.pressedKeys['w'])
    {
	player.position.addScaledVector(player.forward, dt);
    }
    if (Input.pressedKeys['s'])
    {
	player.position.addScaledVector(player.forward, -dt);
    }
    let right = player.forward.clone().cross(new THREE.Vector3(0,1,0));
    if (Input.pressedKeys['a'])
    {
	player.position.addScaledVector(right, dt);
    }
    if (Input.pressedKeys['d'])
    {
	player.position.addScaledVector(right, -dt);
    }
    player.transform = new THREE.Matrix4().lookAt(player.position.clone().add(player.forward));
    
    camera.position.setFromMatrixPosition(player.transform);
    let forward = new THREE.Vector3(0,0,1).applyMatrix4(player.transform);
    camera.lookAt(
	camera.position,
	player.forward,
	new THREE.Vector3(0,1,0)
    );



    //Render
    renderer.render( scene, camera );
    dt = 0;
}
initThree();
renderer.setAnimationLoop( animate );
