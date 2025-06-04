import * as THREE from 'three';
export const randomBilateral = () => Math.random() * 2 - 1;
export function getCoordFromMousePoint(point, depth, camera)
{

    let screenCoord = new THREE.Vector3((point.x / window.innerWidth * 2 - 1), -(point.y / window.innerHeight * 2 - 1), 1.0);

    let screenPos = screenCoord.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);

    let dir = screenPos.clone().sub(camera.position).normalize();
    return  camera.position.clone().addScaledVector(dir, depth);
}

export function hitDetectShips(screenPos, camera, raycaster, enemyShipObjs)
{
    let cameraPos = camera.position;
    if (screenPos.x != NaN)
    {
	let direction = new THREE.Vector3(screenPos.x, screenPos.y, screenPos.z);
	direction.sub(cameraPos).normalize();
	raycaster.set(cameraPos, direction);
	const intersects = raycaster.intersectObjects(enemyShipObjs, false);
	return intersects;
    }
    return null;
}
