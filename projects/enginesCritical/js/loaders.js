import * as THREE from "../../modules/three/build/three.module.js";
import {OBJLoader} from '../../modules/three/examples/jsm/loaders/OBJLoader.js';

/*

  Scene

{
  Meshes : []
  Lights : []
}

 */
/*

  entity class


{
    Mesh : (THREEJS Object/Group)
    id : (key into allEntities)
    isLoading : boolean
    isRoot : boolean
    children : array
    
    removeFromSceneAndFree()
    update(dt)
    start()  Runs when loaded
}
*/

const allEntities = new Map();
const OBJloader = new OBJLoader();
const defaultMaterial = new THREE.MeshBasicMaterial({
    color: '#ff00ff',
    side: THREE.DoubleSide,
    //polygonOffset: true,
    //polygonOffsetFactor: 1,
    //polygonOffsetUnits: 1
});

export function freeMesh(o)
{
    o.dead = true;
    o.traverse(c => {
	if (c.isMesh)
	{
	    c.material.dispose();
	    c.geometry.dispose();
	}
	if (c.isLineSegments)
	{
	    c.geometry.dispose();
	}
    });
}

export async function loadObj(path, obj, mat)
{
    let start_time = new Date().getTime();
    obj.start_time = start_time;
    let material = mat;
    if (!mat)
    {
	material = defaultMaterial;
    }
    OBJloader.load( "../js/asteroids/" + path + ".obj", function ( object ) {
	object.traverse( function ( child ) {
	    if ( child.isMesh ) {
		child.castShadow = false;
		child.receiveShadow = false;
		child.material = material;
		//let wireframe = new THREE.EdgesGeometry(child.geometry);
		//	let lineMat = new THREE.LineBasicMaterial({color: 0x5f5f5f});
		//		let lines = new THREE.LineSegments(wireframe, lineMat);
		//child.add(lines);
		//wireframe.dispose();
		//lineMat.dispose();
		//lines.renderOrder = 1;
	    }
	})
	obj.name = path;
	obj.mesh = object;
	obj.doneLoading = true;
    });
}


export async function waitUntilLoaded(obj)
{
    while (true)
    {
	if (obj.doneLoading == true)
	{
	    console.log("Loaded: " + obj.name);
	    return obj;
	}
	if (new Date() > obj.start_time + 10000)
	{
	    return;
	}
	await new Promise(resolve => setTimeout(resolve, 10));
    }
    
}
