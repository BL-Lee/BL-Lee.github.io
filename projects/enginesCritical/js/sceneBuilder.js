import * as THREE from "../../modules/three/build/three.module.js";

var drawScene;
var displayScene;
function initScene()
{
    drawscene = new THREE.Scene();
    scene.background = new THREE.Color( 0x000000 );
    w = window.innerWidth / 2;
    h = window.innerHeight;
    aspectRatio = w / h;
    let unitWidth = 20;

    camera = new THREE.PerspectiveCamera(
      90,
      w / h,
      0.1,
      20
    );
    
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
