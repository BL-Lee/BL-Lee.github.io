/*

  need:
  height texture
  particle buffer
  canvas

  each particle needs:
  position
  speed
  volume (starts at 1
  sediment (fractional)
  
  steps:
  1: subtract from heightmap at agents
    - Draw as points in subtract mode?
  2. move agents
    - add to amount held
    - move according to heightmap gradient
    - evaporate
    - moves according to speed += 2d normal / (volume * density)
    - speed *= 1-frictino

    - mass transfer -> concentration c -> equilibrium concentration q
    dc/dt = k(q - c)
    - set q higher if moving downhill/moving faster/proportional to volume
    
  3. deposit
    - draw as points in add mode?
  4. draw
    - draw mode triangles/ or is there quads
    - choose height depending on texture read
  

  
  

 */
import {mat4} from 'https://webgpufundamentals.org/3rdparty/wgpu-matrix.module.js';
//import 'http://joeiddon.github.io/perlin/perlin.js';

var textureSize = '128';
var interval = null;
const particleUpdateShader = `struct timeUniform {
        time: f32,
        dt: f32,
        sensorAngle: f32,
        agentSpeed: f32,
        cameraMat: mat4x4f
    };
struct Particle {
 pos: vec2f,
 vel: vec2f,
 volume: f32,
 sediment: f32,
};

//@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uTime: timeUniform;
@group(0) @binding(2) var heightMap: texture_storage_2d<bgra8unorm, read>;

@compute @workgroup_size(1) fn computeSomething(
    @builtin(global_invocation_id) id: vec3u
) {

    let i = id.x;
    updated = Particle();


    agents[i] = updated;
}
`;

const particlePointShader = `struct Vertex {
 @location(0) pos: vec2f,
 @location(1) vel: vec2f,
 @location(2) volume: f32,
 @location(3) sediment: f32,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,

};
struct timeUniform {
        time: f32,
        dt: f32,
        sensorAngle: f32,
        agentSpeed: f32,
        cameraMat: mat4x4f,
    };

@group(0) @binding(0) var<uniform> uTime: timeUniform;

@vertex fn vs(vert: Vertex,) -> VSOutput {
  var vsOut: VSOutput;

  vsOut.position = vec4f(vert.pos.x, vert.pos.y, 0.0, 1.0);
  vsOut.color = vec4f(0.1,0.0,0.0,0.0);
  return vsOut;
}
 
@fragment fn fs(vsOut: VSOutput) ->  @location(0)  vec4f {
   return vsOut.color;
}
`

const drawShader = `struct Vertex {
  @location(0) position: vec2f,
};

struct timeUniform {
        time: f32,
        dt: f32,
        sensorAngle: f32,
        agentSpeed: f32,
        cameraMat: mat4x4f,
    };

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,

};

@group(0) @binding(0) var<uniform> uTime: timeUniform;
@group(0) @binding(1) var heightMap: texture_storage_2d<rgba8unorm, read>;

@vertex fn vs(vert: Vertex,) -> VSOutput {
  var vsOut: VSOutput;

let coord = vec2u(vert.position * vec2f(${textureSize}, ${textureSize})); 
let height = textureLoad(heightMap, coord).r;
let pos = vec4f(vert.position.x, vert.position.y,
  height * 0.5, 1.0);

  
  vsOut.position = uTime.cameraMat * pos;

  let topColor = vec4f(0.6,0.9,0.6,1.0);
  let bottomColor = vec4f(0.4,0.2,0.2,1.0);


  vsOut.color = mix(bottomColor, topColor, height);
  return vsOut;
}

 
@fragment fn fs(vsOut: VSOutput) ->  @location(0)  vec4f {
   return vsOut.color;
}
`

async function initWebGPU()
{
    const canvas = document.querySelector("canvas");
    // Your WebGPU code will begin here!
    console.log(navigator);
    if (!navigator.gpu || !navigator) {
	return {adapter : null, device : null,
		context : null, presentationFormat : null,
		succeed : false};
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
	return {adapter : null, device : null,
		context : null, presentationFormat : null,
		succeed : false};
    }
    let presentationFormat = 'rgba8unorm';
    var device = await adapter?.requestDevice();
    if (!device)
    {
	return {adapter : null, device : null,
		context : null, presentationFormat : null,
		succeed : false};
    }
    const context = canvas.getContext("webgpu");
    context.configure({
	device: device,
	format: presentationFormat,
	usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    return {adapter, device, context, presentationFormat, succeed : true};
}

function initPipeline(device, presentationFormat, program)
{
    const module = device.createShaderModule({
	label: 'doubling compute module',
	//RG -> horizontal output, vertical output respectively
	//Each pixel stores bottom and left values
	code: program,
    });

    const pipeline = device.createComputePipeline({
	label: 'doubling compute pipeline',
	layout: 'auto',
	compute: {
	    module,
	},
    });
    return {module, pipeline};
}
function initDrawPipeline(device, presentationFormat)
{
    const module = device.createShaderModule({
	label: 'doubling compute module',
	//RG -> horizontal output, vertical output respectively
	//Each pixel stores bottom and left values
	code: drawShader,
    });

    const pipeline = device.createRenderPipeline({
	label: 'heightmap draw',
	layout: 'auto',
	vertex: {
	    module,
	    buffers: [
		{
		    arrayStride: 4 * 2, // 2 floats, 4 bytes each
		    attributes: [
			{shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
		    ],
		},
	    ],
	},
	fragment: {
	    module,
	    targets: [{ format: presentationFormat },
		     ],
	},
	primitive: {
	    topology: 'triangle-list',
	},
    });
    return pipeline;
}
function initDepositPipeline(device, presentationFormat)
{
    const module = device.createShaderModule({
	label: 'doubling compute module',
	//RG -> horizontal output, vertical output respectively
	//Each pixel stores bottom and left values
	code: particlePointShader,
    });

    const pipeline = device.createRenderPipeline({
	label: 'heightmap deposit',
	layout: 'auto',
	vertex: {
	    module,
	    buffers: [
		{
		    arrayStride: 4 * 6, 
		    attributes: [
			{shaderLocation: 0, offset: 0, format: 'float32x2'}, 
			{shaderLocation: 1, offset: 8, format: 'float32x2'}, 
			{shaderLocation: 2, offset: 16, format: 'float32'},  
			{shaderLocation: 3, offset: 20, format: 'float32'},  
		    ],
		},
	    ],
	},
	fragment: {
	    module,
	    targets: [
		{
		    format: "rgba8unorm",
		    blend: {
			color: {
			    operation: 'subtract',
			    srcFactor: 'one',
			    dstFactor: 'one-minus-src-alpha',
			},
			alpha: {
			    srcFactor: 'one',
			    dstFactor: 'one-minus-src-alpha',
			}
		    }
		},
	    ],
	    
	},
	primitive: {
	    topology: 'point-list',
	},
    });
    return pipeline;
}

function initBuffers(device)
{
    const uniformBufferSize = 4 * 4 + 16 * 4;
    const uniformBuffer = device.createBuffer({
	size: uniformBufferSize,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    return {uniformBuffer}
}



function beginRenderPass(device)
{
    // Encode commands to do the computation
    const encoder = device.createCommandEncoder({
////	label: 'doubling encoder',
    });
    const renderPass = encoder.beginComputePass({
//	label: 'doubling compute pass',
    });

    return {renderPass, encoder};
}

function endRenderPass(device, encoder)
{
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

function render(info)
{

    const canvasTexture = info.context.getCurrentTexture();    
    // Set the matrix in the uniform buffer
    const fov = 44 * Math.PI / 180;
    const aspect = 1.0;

    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [1.5, 1.5, 1],  // position
      [0.5, 0.5, 0],    // target
      [0, 0, 1],    // up
    );
    const viewProjection = mat4.multiply(projection, view);


    let angle = 10 / 180.0 * 3.14159;
    info.uniformValues.set([info.uniformValues[0] + 0.02, 0.0042, angle, 1.0], 0);
    mat4.rotateX(viewProjection, 0, info.matrixValue);
    info.device.queue.writeBuffer(info.uniformBuffer, 0, info.uniformValues);

    {
	const bindGroup = info.device.createBindGroup({
	    label: 'bindGroup for draw',
	    layout: info.drawPipeline.getBindGroupLayout(0),
	    entries: [
		{ binding: 0, resource: {buffer : info.uniformBuffer}},
		{ binding: 1, resource:  info.heightMap.createView()},
	    ],
	});

	info.renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
	const encoder = info.device.createCommandEncoder();
	const pass = encoder.beginRenderPass(info.renderPassDescriptor);
	pass.setPipeline(info.drawPipeline);
	pass.setVertexBuffer(0, info.vertexBuffer);
	pass.setBindGroup(0, bindGroup);
	pass.draw(6 * (textureSize-1) * (textureSize-1));
	pass.end();
	const commandBuffer = encoder.finish();
	info.device.queue.submit([commandBuffer]);
    }

    {
	const bindGroup = info.device.createBindGroup({
	    label: 'bindGroup for point',
	    layout: info.pointPipeline.getBindGroupLayout(0),
	    entries: [
		{ binding: 0, resource: {buffer : info.uniformBuffer}},
	    ],
	});

	info.pointRenderPassDescriptor.colorAttachments[0].view = info.heightMap.createView();
	const encoder = info.device.createCommandEncoder();
	const pass = encoder.beginRenderPass(info.pointRenderPassDescriptor);
	pass.setPipeline(info.pointPipeline);
	pass.setVertexBuffer(0, info.particleBuffer);
	pass.setBindGroup(0, bindGroup);
	pass.draw(200);
	pass.end();
	const commandBuffer = encoder.finish();
	info.device.queue.submit([commandBuffer]);
    }


    
}

async function setup()
{
    var {adapter, device, context, presentationFormat, succeed} = await initWebGPU();
    if (!succeed)
    {
	d3.select("#notAvailable").text("Oops! Looks like WebGPU isn't available on your browser/device. A pre-recorded video will play instead.").style("padding-top", "1em");
	return null;
    }
    //var {module, pipeline} = initPipeline(device, presentationFormat, slimeSensorProgram);

    
    const canvasTexture = context.getCurrentTexture();
    
    var uniformValues = new Float32Array(4 + 4*4);
    var {uniformBuffer} = initBuffers(device);

    let kMatrixOffset = 4;
    const matrixValue = uniformValues.subarray(
      kMatrixOffset, kMatrixOffset + 16);

    var vertices = new Float32Array((textureSize - 1) * (textureSize - 1) * 6 * 2);

    const rand = (min, max) => min + Math.random() * (max - min);

    let offset = 0;
    for (let i = 0; i < (textureSize - 1); ++i) {
	for (let j = 0; j < (textureSize - 1); ++j) {

	    vertices[offset + 0] = i / (textureSize - 1);
	    vertices[offset + 1] = j / (textureSize - 1);
	    offset += 2;
	    
	    vertices[offset + 0] = (i + 1)  / (textureSize - 1);
	    vertices[offset + 1] = j / (textureSize - 1);
	    offset += 2;
	    
	    vertices[offset + 0] = i / (textureSize - 1);
	    vertices[offset + 1] = (j + 1) / (textureSize - 1);
	    offset += 2;
	    
	    vertices[offset + 0] = i / (textureSize - 1);
	    vertices[offset + 1] = (j + 1) / (textureSize - 1);
	    offset += 2;
	    
	    vertices[offset + 0] = (i + 1) / (textureSize - 1);
	    vertices[offset + 1] = j / (textureSize - 1);
	    offset += 2;
	    
	    vertices[offset + 0] = (i + 1) / (textureSize - 1);
	    vertices[offset + 1] = (j + 1) / (textureSize - 1);
	    offset += 2;
	}
    }

    
    const vertexBuffer = device.createBuffer({
	label: 'vertex buffer',
	size: vertices.byteLength,
	usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices);


    var particleCount = 200;
    var particleSize = 6;
    var particles = new Float32Array(particleCount * 6);
    offset = 0;
    for (let i = 0; i < particleCount; ++i) {
	vertices[offset + 0] = rand(0,1);
	vertices[offset + 1] = rand(0,1);
	
	vertices[offset + 2] = 0; //speed
	vertices[offset + 3] = 0;
	
	vertices[offset + 4] = 1.0; //volume
	vertices[offset + 5] = 0.0; //sediment
	
	offset += 6;
    }

    const particleBuffer = device.createBuffer({
	label: 'particle buffer',
	size: particles.byteLength,
	usage: GPUBufferUsage.COPY_DST |
	    GPUBufferUsage.VERTEX |
	    GPUBufferUsage.STORAGE_BINDING
    });
    device.queue.writeBuffer(particleBuffer, 0, particles);


    
    const heightMap = device.createTexture({
	label: "heightmap",
	format: 'rgba8unorm',
	size: [textureSize, textureSize],
	usage: GPUTextureUsage.COPY_DST |
	    GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const textureData = new Uint8Array(Array.from({length: textureSize * textureSize * 4},
				   function(v,i) {
				       return Math.max(0,Math.min(1,(perlin.get(i / 4 / textureSize / 20.0,
										i / 4 % textureSize / 20.0) * 0.5 + 0.5))) * 255
							   })
				      );

    console.log(textureData);
    
    device.queue.writeTexture(
	{texture:  heightMap },
	textureData,
	{ bytesPerRow: textureSize * 4 },
	{ width: textureSize, height: textureSize },
    );
    var renderPassDescriptor = {
	label: 'draw renderpass',
	colorAttachments: [
	    {
		// view: <- to be filled out when we render
		clearValue: [0.0, 0.0, 0.0, 1],
		loadOp: 'clear',
		storeOp: 'store',
	    },
	],
    };
    var pointRenderPassDescriptor = {
	label: 'point renderpass',
	colorAttachments: [
	    {
		// view: <- to be filled out when we render
		clearValue: [0.0, 0.0, 0.0, 1],
		loadOp: 'load',
		storeOp: 'store',
	    },
	],
    };

    const drawPipeline = initDrawPipeline(device, presentationFormat);
    const pointPipeline = initDepositPipeline(device, presentationFormat);
    
    var globalInfo = {device, adapter,
		      context, presentationFormat,
		      renderPassDescriptor, 
		      drawPipeline,
		      pointPipeline,
		      //		      positionBuffer,
		      heightMap,
		      matrixValue,
		      particleBuffer,
		      pointRenderPassDescriptor,
		      vertices, vertexBuffer, uniformValues,
		      uniformBuffer};

    interval = setInterval(function() {
	//Swap read/write buffers
	render(globalInfo);

    }, 32);
    //render(globalInfo);

    return globalInfo;
}


setup().then((globalInfo) =>
    {

    });


