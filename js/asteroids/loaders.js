import * as THREE from "../../modules/three/build/three.module.js";

/*import {STLLoader} from 'three/addons/loaders/STLLoader.js';
//import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';*/
import {STLLoader} from '../../modules/three/examples/jsm/loaders/STLLoader.js';
import {OBJLoader} from '../../modules/three/examples/jsm/loaders/OBJLoader.js';
const loader = new STLLoader();
const OBJloader = new OBJLoader();
const material = new THREE.MeshBasicMaterial({
    color: '#CA8',
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
});
const redLaserMaterial = new THREE.MeshBasicMaterial({
    color: '#ffaaaa',
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1

});
export function freeObject(o)
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

export async function loadObject(path, obj, mat, skipWire)
{
    let start_time = new Date().getTime();
    obj.start_time = start_time;
    loader.load( "../js/asteroids/" + path + ".stl", function ( geometry ) {
	let material = mat;
	if (!mat)
	{
	    material = new THREE.MeshBasicMaterial({
		color: '#CA8',
		side: THREE.DoubleSide,
		polygonOffset: true,
		polygonOffsetFactor: 1,
		polygonOffsetUnits: 1
	    });
	}
	let mesh = new THREE.Mesh( geometry, material);
	mesh.name = path;
	mesh.castShadow = false;
	mesh.receiveShadow = false;
	
	if (!skipWire)
	{
	    let wireframe = new THREE.EdgesGeometry(geometry);
	    let lineMat = new THREE.LineBasicMaterial({color: 0x5f5f5f});
	    let lines = new THREE.LineSegments(wireframe, lineMat);
	    mesh.add(lines);
	    lines.name = path + "_lines";
	    wireframe.dispose();
	    lineMat.dispose();
	    lines.renderOrder = 1;
	}
	
	obj.mesh = mesh;
	obj.doneLoading = true;

    });

}

export async function loadObj(path, obj, mat)
{
    let start_time = new Date().getTime();
    obj.start_time = start_time;
    let material = mat;
    if (!mat)
    {
	material = new THREE.MeshBasicMaterial({
	    color: '#CA8',
	    side: THREE.DoubleSide,
	    polygonOffset: true,
	    polygonOffsetFactor: 1,
	    polygonOffsetUnits: 1
	});
    }
    OBJloader.load( "../js/asteroids/" + path + ".obj", function ( object ) {
	object.traverse( function ( child ) {
	    if ( child.isMesh ) {


		child.castShadow = false;
		child.receiveShadow = false;
		child.material = material;

		
		let wireframe = new THREE.EdgesGeometry(child.geometry);
		let lineMat = new THREE.LineBasicMaterial({color: 0x5f5f5f});
		let lines = new THREE.LineSegments(wireframe, lineMat);
		child.add(lines);
		wireframe.dispose();
		lineMat.dispose();
		lines.renderOrder = 1;
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
