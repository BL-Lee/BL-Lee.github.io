
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
var roundNumber = 0;
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
var highScore = 0;
var multiplier = 1;

var wind = 0;

var thrusterStrength = 0.0;
var dragStartX = 0;
var dragStartY = 0;
var isDragging = false;
var dragXDiff = 0.0;

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
	let doFlat = Math.random();
	let val = segments[i] + (Math.random() * 2.0 - 1.0)  * 30;
	if (doFlat < 0.33)
	{
	    val = segments[i];
	}

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
    	.style("stroke-width", 4)
	.style("fill", "none")
	.attr("d", getPath(d3.path()));    
}

function handleStart(e)
{
    if (e.touches)
    {
	console.log(e.touches[0].pageX + " " +  e.touches[0].pageY);
	dragStartX = e.touches[0].pageX;
	dragStartY = e.touches[0].pageY;
	isDragging = true;
    }
}

function handleMove(e)
{
    if (e.touches)
    {
	let yDiff = (dragStartY - e.touches[0].pageY) / (canvHeight / 4.0);
	thrusterStrength = Math.min(1.0,Math.max(0, yDiff));
	let xDiff = (dragStartX - e.touches[0].pageX) / (canvWidth / 4.0);
	dragXDiff = -xDiff;
    }
}

function handleEnd(e)
{
    isDragging = false;
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

    if (roundNumber > 0)
    {
	wind = ((Math.random() * 2.0 - 1.0) * 10.0).toFixed(2);
    }
    else
    {
	wind = 0;
    }
    d3.select("#wind").text("WIND: " + wind);
    const el = document.querySelector("svg");
    el.addEventListener("touchstart", handleStart);
    el.addEventListener("touchmove", handleMove);
    el.addEventListener("touchend", handleEnd);
//    el.addEventListener("touchcancel", handleCancel);

    
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
	    thrusterStrength = 1.0;
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
	    thrusterStrength = 0.0;
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

    if (isDragging) //mobile
    {
	rotation += 1.0 * dt * dragXDiff;
    }
    else //keyboard
    {
	if (dPressed)
	{
	    rotation += 1.0 * dt;
	}
	if (aPressed)
	{
	    rotation -= 1.0 * dt;
	}
    }
    if ((wPressed || isDragging) && fuelRemaining > 0.1)
    {
	let upStr = thrusterPower * thrusterStrength * dt;
	yVel += upStr * Math.cos(rotation) * -1.0;
	xVel += upStr * Math.sin(rotation);
	flames.attr("stroke", "white");
	fuelRemaining = Math.max(0,fuelRemaining - (fuelBurnRate * thrusterStrength * dt));
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
    xVel += wind * dt;
    x += xVel * dt;
    y += yVel * dt;

    xVel *= 0.9995 * (1 - dt);
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

	if (Math.abs(h0 - p0[1]) < 5.0 &&
	    Math.abs(h1 - p1[1]) < 5.0)
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
    roundNumber += 1;
    
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
    roundNumber = 0;
    lineCount = 10;
    explosionRots = [];
    for (let i = 0; i < lineCount; i += 1)
    {
	explosionRots.push([Math.random() * 360,
			    4  * (Math.random() * 2.0 + 1.0),
			    0,0
			   ]);
    }
    highScore = Math.max(score, highScore);
    d3.select("#successText").text("CRASHED").attr("stroke", "white");
    d3.select("#successTextMult").text("HIGH SCORE: " + highScore).attr("stroke", "white");

    explosion.selectAll("g").data(explosionRots).enter().append("g").append("line")
	.attr("x0", 0)
    	.attr("x1", 20)
    	.attr("y0", 0)
    	.attr("y1", 20)
	.attr("stroke", "white")
	.attr("stroke-width", 4)
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
    
    if (roundDoneTimer > 7.0)
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
