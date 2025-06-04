import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as THREE from 'three';
import * as HP from "./helpers.js";
export var UIElements = {};
export var UIRenderer;// = new THREE.CSS2DRenderer();
export var score = 0;
export var roundMult = 0;
var multTime = 0;
export var health = 9;
export var roundScore = 0;
var UIMultTicker = 1;
export function initUI(scene, camera)
{
    const healthDom = document.createElement( 'div' );
    healthDom.className = 'label';
    healthDom.textContent = 'HEALTH : ';
    healthDom.style.backgroundColor = 'transparent';
    healthDom.style.color = "white";
    UIElements.health = healthDom;
    
    const healthLabel = new CSS2DObject( healthDom );
    let screenPos = HP.getCoordFromMousePoint(
	new THREE.Vector2(5,15), 2, camera
    );
    
    healthLabel.center.set(0,0);
    healthLabel.position.copy( screenPos);

    scene.add(healthLabel);
    healthLabel.layers.set( 0 );

    const scoreDom = document.createElement( 'div' );
    scoreDom.className = 'label';
    scoreDom.textContent = 'SCORE : ';
    scoreDom.style.backgroundColor = 'transparent';
    scoreDom.style.color = "white";
    UIElements.score = scoreDom;
    
    const scoreLabel = new CSS2DObject( scoreDom );
    screenPos = HP.getCoordFromMousePoint(
	new THREE.Vector2(5,65), 2, camera
    );
    
    scoreLabel.center.set(0,0);
    scoreLabel.position.copy( screenPos);

    scene.add(scoreLabel);
    scoreLabel.layers.set( 0 );
    
    const hitDom = document.createElement( 'div' );
    hitDom.className = 'label';
    hitDom.textContent = '10';
    hitDom.style.backgroundColor = 'transparent';
    hitDom.style.color = "white";
    hitDom.style.opacity = 0.5;
    UIElements.hit = hitDom;
    
    const hitLabel = new CSS2DObject( hitDom );
    screenPos = HP.getCoordFromMousePoint(
	new THREE.Vector2(0,50), 2, camera
    );
    hitLabel.position.copy(screenPos);

    UIElements.hitLabel = hitLabel;
    hitLabel.layers.set(0);
    scene.add(hitLabel);

    
    UIRenderer = new CSS2DRenderer();
    UIRenderer.setSize( window.innerWidth, window.innerHeight );
    UIRenderer.domElement.style.position = 'absolute';
    UIRenderer.domElement.style.top = '0px';
    UIRenderer.domElement.style.left = '0px';
    document.body.appendChild( UIRenderer.domElement );

}

export function updateScore(diff)
{
    score += diff;
    UIElements.score.textContent = "SCORE : " + score;
}

export function hitLabelUpdate(dt)
{
    if (UIElements.hit.style.opacity > 0)
    {
	UIElements.hitLabel.position.y += 0.5 * dt;
	UIElements.hit.style.opacity -= 1 * dt;
    }
}
export function showHit(ship)
{
    UIElements.hitLabel.position.copy(ship.position);
    UIElements.hitLabel.position.y += 2;
    UIElements.hit.style.opacity = 1;
    UIElements.hit.textContent = 10;
    updateScore(10);
    roundScore += 10;
}
export function calculateMultiplier(missCount, camera)
{
    roundMult = Math.max(1, 10 - (missCount * 2));
    UIElements.hitLabel.position.copy(new THREE.Vector3(0,0,0));
    multTime = 0.0;
    UIElements.hit.style.opacity = 1;
    UIMultTicker = 1;
    updateScore(roundScore);
}

export function resetRound()
{
    roundScore = 0;
}

export function multiplierUpdate(dt)
{
    //0.3 second ticks
    multTime -= dt;
    if (multTime <= 0.0)
    {
	UIElements.hit.textContent = roundScore * UIMultTicker;

	if (UIMultTicker < roundMult)
	{
	    UIMultTicker += 1;
	    multTime = 0.15;
	    updateScore(roundScore);
	}
    }
}

export function updateHealth(diff)
{
    health += diff;
    let str = "HEALTH : ";
    for (let i = 0; i < health; i++)
    {
	str += "=";
    }
    UIElements.health.textContent = str;
}
