
var x = 100;
var y = 400;
var xVel = 0.0;
var yVel = 0.0;
var grav = 30.0;

var thrusterPower = 100.0;
var rotation = 0;

var fr = 30;
var dt = 1 / fr;
var msDt = Math.floor(dt * 1000);

var lander;
var aPressed = false;
var dPressed = false;
var wPressed = false;
var flames;
var segLength = 40;
var canvWidth = 800;
var canvHeight = 800;
console.log(dt);
console.log(msDt);
console.log(fr);
var ground;
var testCircle;
var interval;
var testPoints = [[0,-10],[10,0],[-10,0],[-10,20],[10,20]]; //Points to test collision;
var explosion;
var explosionRots;
var roundInterval;
var roundDoneTimer = 0.0;
var SKIP_AND_WIN = false;

var score = 0;
var multiplier = 1;

var fuelRemaining = 100;
var fuelBurnRate = 20;
var fuelBar;
function getHeightAtPoint(xC)
{

    let ind = Math.floor(xC / canvWidth * (segLength - 1));
    let height = segments[ind];
    let heightNext = segments[ind + 1];
    let decimal = (xC / canvWidth * (segLength - 1)) % 1;
    let yVal = (1.0 - decimal) * height + (decimal) * heightNext;
    return canvHeight - yVal;
}

function rotatePoint(point)
{
    let c = Math.cos(rotation);
    let s = Math.sin(rotation)
    return [c * point[0] - s * point[1], s * point[0] + c * point[1]]
}

function setupGround()
{
    testCircle = d3.select("#testCircle");

    segments = [50];
    let momentum = -1;

    for (let i = 0; i < segLength - 1; i += 1)
    {
	let val = segments[i] + (Math.random() * 2.0 - 1.0)  * 30;
	if (val < 0)
	    val = Math.random() * 10;
	segments[i] += 80;
	segments.push(val);
    }
    function getPath(context)
    {
	context.moveTo(0,canvWidth - segments[0]);
	for (let i = 0; i < segLength; i += 1)
	{
	    context.lineTo(i * canvWidth / (segLength - 1), canvHeight - segments[i]);
	}
	
	return context;
    }
    d3.select("#ground").selectAll("path").remove();
    ground = d3.select("#ground").append("path")
	.style("stroke", "white")
	.style("fill", "none")
	.attr("d", getPath(d3.path()));    

}
function handleOrientation(event)
{
    const ball = document.querySelector(".ball");
    const garden = document.querySelector(".garden");
    const output = document.querySelector(".output");

    const maxX = garden.clientWidth - ball.clientWidth;
    const maxY = garden.clientHeight - ball.clientHeight;

     let xa = event.alpha; // In degree in the range [-180,180)
  let ya = event.gamma; // In degree in the range [-90,90)

    //    d3.select(".output").text("beta: " + xa + " gamma: " + ya);
    d3.select(".output").text("hi?");

  // Because we don't want to have the device upside down
  // We constrain the x value to the range [-90,90]
  if (xa > 90) {
    xa = 90;
  }
  if (xa < -90) {
    xa = -90;
  }

  // To make computation easier we shift the range of
  // x and y to [0,180]
  xa += 90;
  ya += 90;

  // 10 is half the size of the ball
  // It centers the positioning point to the center of the ball
  ball.style.left = `${(maxY * ya) / 180 - 10}px`; // rotating device around the y axis moves the ball horizontappplly
  ball.style.top = `${(maxX * xa) / 180 - 10}px`; // rotating device around the x axis moves the ball vertically
}
function setupLander()
{

    d3.select("#multiplierText").text("MULTIPLIER: " + multiplier);
    d3.select("#successText").text("");
    d3.select("#successTextMult").text("");
    d3.select("#scoreText").text("SCORE: " + score);
    fuelBar = d3.select("#fuelbar");
    fuelRemaining = 100;
    x = canvWidth / 2.0;
    y = canvHeight / 10.0;
    lander = d3.select("#lander");
    explosion = d3.select("#explosion");
    explosion.selectAll("g").selectAll("line").attr("visibility","hidden");
    flames = d3.select("#flames");
    window.addEventListener("deviceorientation", handleOrientation);

    document.onkeydown = function (e) {
	e = e || window.event;
	if (e.key == "a")
	{
	    aPressed = true;
	}
	if (e.key == "d")
	{
	    dPressed = true;
	}
	if (e.key == "w")
	{
	    wPressed = true;
	}
	if (e.key == "e")
	{
	    getHeightAtPoint();
	}
	if (e.key == "g")
	{
	    SKIP_AND_WIN = true;
	}


    };
    document.onkeyup = function (e) {
	e = e || window.event;
	if (e.key == "a")
	{
	    aPressed = false;
	}
	if (e.key == "d")
	{
	    dPressed = false;
	}
	if (e.key == "w")
	{
	    wPressed = false;
	}

    };

    interval = setInterval(function() {
	//Swap read/write buffers
	update();
    }, msDt);
}
function update()
{

    if (dPressed)
    {
	rotation += 1.0 * dt;
    }
    if (aPressed)
    {
	rotation -= 1.0 * dt;
    }
    if (wPressed && fuelRemaining > 0.1)
    {
	yVel += thrusterPower * dt * Math.cos(rotation) * -1.0;
	xVel += thrusterPower * dt * Math.sin(rotation);
	flames.attr("stroke", "white");
	fuelRemaining = Math.max(0,fuelRemaining - (fuelBurnRate * dt));
    }
    else
	flames.attr("stroke", "black");


    if (x > canvWidth - 22.0) //ensures within bounds
    {
	xVel *= -1;
	x = canvWidth - 23;
    }
    if (x < 23) //ensures within bounds
    {
	xVel *= -1;
	x = 24;
    }

    fuelBar.attr("width", fuelRemaining / 100.0 * 200.0);
    yVel += grav * dt;
    x += xVel * dt;
    y += yVel * dt;

    let hitGround = false;
    for (let i = 0; i < testPoints.length; i++)
    {
	let d = testPoints[i];
	
	let p = rotatePoint(d);
	p[0] += x;
	p[1] += y;
	let h = getHeightAtPoint(p[0]);
	if (p[1] >= h)
	{
	    yVel = 0.0;
	    xVel = 0.0;
	    hitGround = true;
	    clearInterval(interval);
	    break;
	}
    }

    if (hitGround)
    {
	let p0 = rotatePoint(testPoints[3]); //leg 1
	p0[0] += x;
	p0[1] += y;
	let h0 = getHeightAtPoint(p0[0]);
	
	let p1 = rotatePoint(testPoints[4]); //leg 2
	p1[0] += x;
	p1[1] += y;
	let h1 = getHeightAtPoint(p1[0]);

	if (Math.abs(h0 - p0[1]) < 4.0 &&
	    Math.abs(h1 - p1[1]) < 4.0)
	{
	    console.log("success!");
	    success();
	}
	else
	{
	    console.log("crash");
	    explode();
	}
    }
    
    if (SKIP_AND_WIN)
    {
	clearInterval(interval);
	success();
    }
    

    lander.attr("transform", "translate(" + x + " " + y + ") " +
		"rotate(" + rotation / Math.PI * 180 + ")");
}
function success()
{
    d3.select("#successText").text("LANDED: 100 * " + multiplier + "... INCREASING MULTIPLIER").attr("stroke", "white");
    let rating = Math.abs(rotation % (Math.PI * 2)) / Math.PI;
    rating = Math.max((1 - rating) * 2.0, 1.0).toFixed(2);
    d3.select("#successTextMult").text("LAND RATING: " + rating).attr("stroke", "white");
    multiplier *= rating;
    multiplier = multiplier.toFixed(2);
    score += 100 * multiplier;

    d3.select("#scoreText").text("SCORE: " + score);
    SKIP_AND_WIN = false;
    roundInterval = setInterval(function() {
	successUpdate();
    }, msDt);

    
}
function successUpdate()
{
    roundDoneTimer += dt;
    if (roundDoneTimer > 2.0)
    {
	clearInterval(roundInterval);
	setupGround();
	setupLander();
	roundDoneTimer = 0.0;
    }
}


function explode()
{
    lineCount = 10;
    explosionRots = [];
    for (let i = 0; i < lineCount; i += 1)
    {
	explosionRots.push([Math.random() * 360,
			    4  * (Math.random() * 2.0 + 1.0),
			    0,0
			   ]);
    }

    explosion.selectAll("g").data(explosionRots).enter().append("g").append("line")
	.attr("x0", 0)
    	.attr("x1", 20)
    	.attr("y0", 0)
    	.attr("y1", 20)
	.attr("stroke", "white")
	.attr("stroke-width", 3)
    explosion.selectAll("g").selectAll("line").attr("visibility", "visible");
    
    
    roundInterval = setInterval(function() {
	explosionUpdate();
    }, msDt);
}
function explosionUpdate()
{
    for (let i = 0; i < lineCount; i += 1)
    {
	explosionRots[i][0] += explosionRots[i][1] * dt * 100.0;
	explosionRots[i][2] += Math.cos(explosionRots[i][1]) * dt * 100.0;
	explosionRots[i][3] += Math.sin(explosionRots[i][1]) * dt * 100.0;
    }
    
    roundDoneTimer += dt;
    if (roundDoneTimer > 2.0)
    {
	clearInterval(roundInterval);
	setupGround();
	setupLander();
	roundDoneTimer = 0.0;
    }
    multiplier = 1.0;
    score = 0;
    explosion.selectAll("g")
	.attr("transform", (d) => "translate(" + (x + d[2]) + " " + (y + d[3]) + ") rotate(" + d[0] + ") ")
    
}

setupGround();
setupLander();
