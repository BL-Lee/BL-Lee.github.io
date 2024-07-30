import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";
import { vsSource, fsSource } from "./shaders.js";
import { fontInfo } from "./font.js";
import { submitString } from "./text-submit.js";
import { pageInfo } from "./load-page-info.js";
main();

function initGL(canvas) {
    
    const gl = canvas.getContext("webgl2");

    if (gl === null) {
	alert("Unable to initialize WebGL2. Your browser or machine may not support it.",);
	return;
    }
    gl.clearColor(0.0, 1.0, 1.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT);
    return gl;
    
}

function main() {

    const canvas = document.querySelector("#glcanvas");
    window.addEventListener('resize', resizeCanvas, false);

    const gl = initGL(canvas);
    
    function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	gl.viewport(0,0,canvas.width, canvas.height);
    }
    resizeCanvas();

    let deltaTime = 0;    
    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    const programInfo = {
	program: shaderProgram,
	attribLocations: {
	    vertexPosition: gl.getAttribLocation(shaderProgram,
						 "aVertexPosition"),
	    vertexColour: gl.getAttribLocation(shaderProgram,
					       "aVertexColour"),
	    vertexUV: gl.getAttribLocation(shaderProgram,
					 "aVertexUV"),

	},
	uniformLocations: {
	    projectionMatrix: gl.getUniformLocation(shaderProgram,
						    "uProjectionMatrix"),
	    modelViewMatrix: gl.getUniformLocation(shaderProgram,
						   "uModelViewMatrix"),
	    uSampler: gl.getUniformLocation(shaderProgram,
						   "uSampler"),
	    
	},
    };

    var textVertexBuffer = [];//submitString("hello. TEXT TEXT", [], fontInfo, canvas, {x:-1.0,y:-1.0});

    var buffers = initBuffers(gl, textVertexBuffer);
    const texture = loadTexture(gl, "js/TIMES.bmp");
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    let then = 0;

    
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    setVertexAttributes(gl, buffers, programInfo);

    let submittedPageInfo = false;
    // Draw the scene repeatedly
    function render(now) {
	now *= 0.001; // convert to seconds
	deltaTime = now - then;
	then = now;
	drawScene(gl, programInfo, buffers, texture);
	if (pageInfo.pending == false && submittedPageInfo == false)
	{
	    for (var i = 0; i < 1; i++)
	    {
		textVertexBuffer = submitString(pageInfo.text[i], textVertexBuffer, fontInfo, canvas);
	    }
	    buffers = initBuffers(gl, textVertexBuffer);
	    setVertexAttributes(gl, buffers, programInfo);
	    submittedPageInfo = true;
	}

	requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
    
}
function initCamera(){
    
}
//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	alert(
	    `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram,
      )}`,
	);
	return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	alert(
	    `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
	);
	gl.deleteShader(shader);
	return null;
    }

    return shader;
}
//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be downloaded over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 0, 255, 255]); // opaque blue
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel,
  );

  const image = new Image();
    image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image,
    );

    // WebGL1 has different requirements for power of 2 images
    // vs. non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function setVertexAttributes(gl, buffers, programInfo) {
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 8 * 4; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
    gl.vertexAttribPointer(
	programInfo.attribLocations.vertexPosition,
	3,
	gl.FLOAT,
	false,
	stride,
	0,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(
	programInfo.attribLocations.vertexUV,
	2,
	gl.FLOAT,
	false,
	stride,
	12,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexUV);
    gl.vertexAttribPointer(
	programInfo.attribLocations.vertexColour,
	3,
	gl.FLOAT,
	false,
	stride,
	20,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColour);

}
