import { initBuffers } from "./init-buffers.js";
import { vsSource, fsSource } from "./shaders.js";
import { initShaderProgram } from "./shader.js";
import { pageInfo } from "./load-page-info.js";
import { initOffscreenInfo } from "./offscreenInfo.js";
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
function drawScene(gl, programInfo, buffers, texture) {
    // Clear the canvas before we start drawing on it.
    // render to the canvas
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, 700,700);
   // gl.clearColor(0, 0, 0, 1);   // clear to black
   // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    
    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    let projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    //mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();
/*
    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      [-0.0, 0.0, -6.0],
      ); // amount to translate*/
    // Tell WebGL to use our program when drawing
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.useProgram(programInfo.program);

    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexUV);

    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const stride = 5 * 4; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

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

    // Set the shader uniforms
    gl.uniformMatrix4fv(
	programInfo.uniformLocations.projectionMatrix,
	false,
	projectionMatrix,
    );
    gl.uniformMatrix4fv(
	programInfo.uniformLocations.modelViewMatrix,
	false,
	modelViewMatrix,
    );

    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
   gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, 0);
}
function drawOffscreenInfo(gl, offscreenInfo, time)
{
    // Clear the canvas before we start drawing on it.
    // render to the canvas
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenInfo.firstFb);
    gl.viewport(0, 0, 256,256);
    gl.useProgram(offscreenInfo.shaderProgram);
    //console.log(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME));
    
    gl.enableVertexAttribArray(offscreenInfo.programInfo.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(offscreenInfo.programInfo.attribLocations.vertexUV);

    gl.bindBuffer(gl.ARRAY_BUFFER, offscreenInfo.vbuffers.vertices);
    
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const stride = 5 * 4; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, offscreenInfo.vbuffers.vertices);
    gl.vertexAttribPointer(
	offscreenInfo.programInfo.attribLocations.vertexPosition,
	3,
	gl.FLOAT,
	false,
	stride,
	0,
    );
    gl.enableVertexAttribArray(offscreenInfo.programInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(
	offscreenInfo.programInfo.attribLocations.vertexUV,
	2,
	gl.FLOAT,
	false,
	stride,
	12,
    );

    gl.enableVertexAttribArray(offscreenInfo.programInfo.attribLocations.vertexUV);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, offscreenInfo.vbuffers.indices);
    //gl.uniform1i(offscreenInfo.programInfo.uniformLocations.uSampler, 0);
    gl.uniform1f(offscreenInfo.programInfo.uniformLocations.uTime, time);
    gl.drawElements(gl.TRIANGLES, offscreenInfo.vbuffers.indexCount, gl.UNSIGNED_SHORT, 0);
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

    let gridSize = 7;
    let offscreenInfo = initOffscreenInfo(gl, gridSize);
    let drawInfo = initDrawInfo(gl, gridSize);

    var then = 0;

    let submittedPageInfo = false;
    // Draw the scene repeatedly
    function render(now) {
	now *= 0.001; // convert to seconds
	deltaTime = now - then;
	then = now;
	drawOffscreenInfo(gl, offscreenInfo, now);
	drawScene(gl, drawInfo.programInfo, drawInfo.buffers, offscreenInfo.firstTex);

	requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
    
}

function initGrid(gridSize)
{
    let vSize = 5;
    let vertices = new Float32Array(gridSize * gridSize * vSize * 4);
    let count = 0;

    for (let i = 0; i < gridSize; i++)
    {
	for (let j = 0; j < gridSize; j++)
	{
	    let x = i * 2.0 / gridSize - 1.0;
	    let y = j * 2.0 / gridSize - 1.0;
	    let uvx = i / gridSize;
	    let uvy = j / gridSize;
	    let delta = 1.0 / gridSize;
	    //pos
	    vertices[count + 0] = x;
	    vertices[count + 1] = y;
	    vertices[count + 2] = 0;
	    //uv
	    vertices[count + 3] = uvx;
	    vertices[count + 4] = uvy;
            count += vSize;

	    //pos
	    vertices[count + 0] = x;
	    vertices[count + 1] = y + delta * 2;
	    vertices[count + 2] = 0;
	    //uv
	    vertices[count + 3] = uvx;
	    vertices[count + 4] = uvy + delta;
	    count += vSize;


	    //pos
	    vertices[count + 0] = x + delta * 2;
	    vertices[count + 1] = y + delta * 2;
	    vertices[count + 2] = 0;
	    //uv
	    vertices[count + 3] = uvx + delta;
	    vertices[count + 4] = uvy + delta;
	    count += vSize;


	    //pos
	    vertices[count + 0] = x + delta * 2;
	    vertices[count + 1] = y;
	    vertices[count + 2] = 0;
	    //uv
	    vertices[count + 3] = uvx + delta;
	    vertices[count + 4] = uvy;
	    count += vSize;

        }
    }
    return vertices;
}

function initDrawInfo(gl, gridSize)
{
        // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    let shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    let programInfo = {
	program: shaderProgram,
	attribLocations: {
	    vertexPosition: gl.getAttribLocation(shaderProgram,
						 "aVertexPosition"),
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

    let vertices = initGrid(gridSize);
    let buffers = initBuffers(gl, vertices, 5);
    
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    setVertexAttributes(gl, buffers, programInfo);

    return {buffers, shaderProgram, programInfo}
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
    const stride = 5 * 4; // how many bytes to get from one set of values to the next
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
}
