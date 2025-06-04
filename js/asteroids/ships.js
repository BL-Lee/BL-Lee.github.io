import * as THREE from 'three';
import * as OJ from "./loaders.js";
import * as HP from "./helpers.js";
import * as UI from "./UI.js";
export var enemyShips = [];
export var enemyShipObjs = [];
var shipTemplate = {};
var shipProjectile = {};
//export var enemyProjectiles = [];
export async function resetShips(scene, camera)
{
    enemyShips = [];
    enemyShipObjs = [];

    await initShips(scene, camera);
    console.log("reset ships");
}

export async function initShips(scene, camera)
{
    console.log("loading ships");
    if (!shipTemplate.mesh) //first time
    {
	OJ.loadObj("ship_2", shipTemplate);
	await OJ.waitUntilLoaded(shipTemplate);
    }
    if (!shipProjectile.mesh)
    {
	OJ.loadObj("ship_projectile", shipProjectile);
	await OJ.waitUntilLoaded(shipProjectile);
    }
    for (let i = 0; i < 4; i++)
    {
	
	
	let ship = {}

	/*

	OJ.loadObj("ship_2", ship);
	
	await OJ.waitUntilLoaded(ship);*/
	enemyShips.push(ship);	
	ship.name = "ship" + i;
	ship.mesh = shipTemplate.mesh.clone(true);
	console.log(ship);
	let projectile = {};
	projectile.name = "projectile" + i;
	projectile.mesh = shipProjectile.mesh.clone(true);
	let projectileMaterial = new THREE.MeshBasicMaterial({
	    color: '#ff4444',
	    side: THREE.DoubleSide,
	    alphaHash: true,
	    opacity: 1.0,
	    polygonOffset: true,
	    polygonOffsetFactor: 1,
	    polygonOffsetUnits: 1

	});
	projectile.mesh.traverse(c => {if (c.isMesh) c.material = projectileMaterial});
	console.log(projectile);
	ship.mesh.projectile = projectile;
	
	//scene.add(ship.mesh)
	//console.log(ship);

	let screenPos = new THREE.Vector2(Math.random() * 0.7 + 0.2,
					Math.random() * 0.4 + 0.4);
	let backPos = HP.getCoordFromMousePoint(
	    new THREE.Vector2(screenPos.x * window.innerWidth,
			      screenPos.y * window.innerHeight), 12, camera);
	

	let frontPos = HP.getCoordFromMousePoint(
	    new THREE.Vector2(screenPos.x * window.innerWidth,
			      screenPos.y * window.innerHeight), 4, camera);

	    
	let sidePos = HP.getCoordFromMousePoint(
	    new THREE.Vector2((screenPos.x > 0.5 ? 1 : -1) * 5 * window.innerWidth,
			      screenPos.y * window.innerHeight), 8, camera);
	
	let resetPos = HP.getCoordFromMousePoint(
	    new THREE.Vector2((screenPos.x > 0.5 ? 1 : -1) * 5 * window.innerWidth,
			      screenPos.y * window.innerHeight), 12, camera);
	
	
	ship.mesh.position.copy(backPos);
	ship.mesh.rotation.y = 0;
	
	ship.mesh.path = new THREE.CatmullRomCurve3([
	    backPos, frontPos, sidePos, resetPos
	], false);
	ship.mesh.path.closed = true;
	ship.mesh.flightInterp = Math.random();
	

	ship.mesh.hit = false;
	ship.mesh.traverse(c => {
	    c.velocity = new THREE.Vector3(0,0,0);
	    c.angularVelocity = new THREE.Vector3(0,0,0);
	})
	ship.doneLoading = true;
    }
    
    enemyShipObjs = enemyShips.map(x => x.mesh.children).flat();
}


function shipShoot(ship, scene)
{
    ship.projectile.mesh.position.copy(ship.position);
    scene.add(ship.projectile.mesh);
    ship.projectile.active = true;
}

function projectileUpdate(ship, scene, dt)
{
    const proj = ship.projectile;
    const mesh = proj.mesh;
    if (proj.exploding)
    {
	let mat = mesh.children[0].material;
	proj.explodingTime = Math.max(0,proj.explodingTime - dt);

	mat.opacity = THREE.MathUtils.inverseLerp(0, 0.5, proj.explodingTime);
	let scale = ((1 - mat.opacity) * 0.5) + 1; //0 - 1.5
	mesh.scale.set(scale,scale,scale);
	if (proj.explodingTime <= 0.0)
	{
	    proj.active = false;	
	    scene.remove(mesh);
	    proj.exploding = false;
	    mat.opacity = 1.0;
	    mesh.scale.set(1,1,1);
	    mat.color.setHex(0xff4444);
	}
    }
    else
    {
    
	const playerPos = new THREE.Vector3(0.0,-0.75,4.5);
	const dir = playerPos.clone().sub(mesh.position).normalize();
	mesh.position.add(dir.multiplyScalar(dt * 5));

	if (mesh.position.distanceToSquared(playerPos) < 1)
	{
	    proj.exploding = true;
	    proj.explodingTime = 0.5;
	    UI.updateHealth(-1);
	    
	}
    }
}

export function shipUpdate(ship, scene, dt)
{

    if (ship.projectile.active)
    {
	projectileUpdate(ship, scene, dt);
    }
    
    if (ship.hit)
    {

	ship.deathTime += dt;
	if (ship.deathTime > 1.00)
	{
	    scene.remove(ship);
	    OJ.freeObject(ship);
	}
	ship.traverse(c => {
	    if (c.isMesh)
	    {
		c.position.addScaledVector(c.velocity, dt);
		c.rotateX(c.angularVelocity.x * dt);
		c.rotateY(c.angularVelocity.y * dt);
		c.rotateZ(c.angularVelocity.z * dt);
	    }
	});
    }
    else if (!ship.dead)
    {
	if (!ship.path)
	    console.log(ship);
	ship.path.getPointAt(ship.flightInterp, ship.position);
	const nextInterp = (ship.flightInterp + dt * 0.2) % 1.0;
	let nextPos = ship.path.getPointAt(nextInterp);
	if (!ship.projectile.active && ship.flightInterp > 0.5 && nextInterp < 0.5)
	{
	    shipShoot(ship, scene);
	}
	ship.lookAt(nextPos);
	ship.flightInterp += dt * 0.2;
	ship.flightInterp = ship.flightInterp % 1.0
    }

}

export function shipsLoadedCheck(scene)
{
    if (enemyShips.length != 4)
    {
	return false;
    }
    let allLoaded = true;
    for (let i = 0; i < enemyShips.length; i++)
    {
	if (!enemyShips[i].doneLoading || !enemyShips[i].mesh.path)
	{
	    allLoaded = false;
	    break;
	}
    }
    if (allLoaded)
    {
	for (let i = 0; i < enemyShips.length; i++)
	{
	    scene.add(enemyShips[i].mesh);
	}
    }
    return allLoaded;
}
export function activeProjectiles()
{
    return enemyShips.filter(i => i.mesh.projectile.active && !i.mesh.projectile.exploding)
	.map(i => i.mesh.projectile.mesh.children[0]);
}
export function handleShipHit(intersection)
{

    let baseObj = intersection.object.parent;
    enemyShipObjs = enemyShipObjs.filter(item =>
	!baseObj.children.includes(item));
    
    baseObj.hit = true;
    baseObj.traverse(c => {
	if (c.isMesh)
	{
	    c.velocity = new THREE.Vector3(HP.randomBilateral() * 5,
					   HP.randomBilateral() * 5,
					   HP.randomBilateral() * 5);
	    c.angularVelocity = new THREE.Vector3(
		HP.randomBilateral() * 10,
		HP.randomBilateral() * 10,
		HP.randomBilateral() * 10
	    );
	}
    })
    baseObj.deathTime = 0;
    intersection.object.material.color.set(0xff0000);

}
