import { CSS2DRenderer, CSS2DObject } from '../../modules/three/examples/jsm/renderers/CSS2DRenderer.js';
import * as THREE from "../../modules/three/build/three.module.js";

import * as HP from "./helpers.js";
export var UIElements = {};
export var UIRenderer;// = new THREE.CSS2DRenderer();
export var score = 0;
export var roundMult = 0;
var multTime = 0;
export var health = 7;
export var roundScore = 10;
export var highScore = 0;
var UIMultTicker = 1;
export function resetGame()
{
    resetRound();
    score = 0;
    health = 7;
    const startPrompt = document.getElementById("startPrompt");
    startPrompt.textContent = "Tap/Click to Start";
    startPrompt.style.opacity = 0;
}
export function initUI(scene, camera)
{
    const healthDom = document.createElement( 'div' );
    healthDom.className = 'label';
    healthDom.textContent = 'HEALTH : ';
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

    
    const multDom = document.createElement( 'div' );
    multDom.className = 'label';
    multDom.textContent = 'Accuracy Multiplier : ';
    multDom.style.opacity = 0.0;
    UIElements.mult = multDom;
    
    const multLabel = new CSS2DObject( multDom );
    screenPos = HP.getCoordFromMousePoint(
	new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2 - 80), 2, camera
    );
    multLabel.position.copy(screenPos);

    UIElements.multLabel = multLabel;
    multLabel.layers.set(0);
    scene.add(multLabel);

    
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
    UIElements.hit.textContent = roundScore;
//    updateScore(score);
    roundScore += 10 + Math.floor(roundScore / 10);
}
export function calculateMultiplier(missCount, camera)
{
    roundMult = Math.max(1, 10 - (missCount * 2));
    UIElements.hitLabel.position.copy(new THREE.Vector3(0,0,0));
    multTime = 0.0;
    UIElements.hit.style.opacity = 1;
    UIMultTicker = 1;
    updateScore(roundScore);
    UIElements.mult.style.opacity = 1;
}

export function resetRound()
{
    UIElements.mult.style.opacity = 0;
    UIElements.hit.style.fontSize = "2vh";
    roundScore = 10;
}

export function multiplierUpdate(dt)
{
    //0.3 second ticks
    multTime -= dt;
    if (multTime <= 0.0)
    {
	UIElements.hit.textContent = roundScore * UIMultTicker;
	UIElements.mult.textContent = "Accuracy Multiplier : " + UIMultTicker + "x";
	UIElements.hit.style.fontSize = UIMultTicker + 1 + "vh";
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
export function showHighScore()
{
    highScore = Math.max(highScore, score);
    UIElements.mult.textContent = "HIGH SCORE : " + highScore;
    UIElements.hit.textContent = "SCORE : " + score;
    UIElements.hitLabel.position.copy(new THREE.Vector3(0,0,0));
    UIElements.hit.style.opacity = 1;
    UIElements.mult.style.opacity = 1;
    const startPrompt = document.getElementById("startPrompt");
    startPrompt.style.opacity = 1;
    
}
