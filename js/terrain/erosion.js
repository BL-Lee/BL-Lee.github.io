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
var PARTICLE_COUNT = 2000;
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

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uTime: timeUniform;
@group(0) @binding(2) var heightMap: texture_storage_2d<rgba8unorm, read>;
fn newRandomPos(uv : vec2f) -> vec2f {
     return vec2f(fract(sin(dot(vec2f(uv.xy), vec2f(12.9898, 78.233))) * 43758.5453),
                  fract(sin(dot(vec2f(uv.yx), vec2f(12.9898, 78.233))) * 43758.5453)) * 2.0 - 1.0;
}

fn calcGrad(coord: vec2u) -> vec2f {
  let here = textureLoad(heightMap, coord);
  let right = textureLoad(heightMap, coord + vec2u(1,0));
  let down = textureLoad(heightMap, coord + vec2u(0,1));

  return vec2f(here.r - right.r, here.r - down.r);
}

@compute @workgroup_size(1) fn computeSomething(
    @builtin(global_invocation_id) id: vec3u
) {

    let i = id.x;
    var updated = particles[i];
    let coord = vec2u((updated.pos * 0.5 + 0.5) * ${textureSize});
    let grad = calcGrad(coord);
    updated.vel += 4.0 * grad * uTime.dt;
    updated.volume *= 0.99;
    updated.pos += vec2f(updated.vel * uTime.dt * 1.0);
    let c = updated.sediment / updated.volume; //concentration
    let q = 0.5; //equilibrium
    updated.sediment += (q-c)* 0.5;
    //updated.sediment += (updated.sediment - q) * uTime.dt;
    if (updated.pos.x > 1.0 ||
        updated.pos.x < -1.0 ||
        updated.pos.y > 1.0 ||
        updated.pos.y < -1.0 ||
        updated.volume < 0.01)
    {
        updated.pos = newRandomPos(updated.pos);
        updated.vel = vec2f(0.0,0.0);
        updated.volume = 1.0;
        updated.sediment = 0.0;
    }

    particles[i] = updated;
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
        subtractMode: f32,
        cameraMat: mat4x4f,
    };

@group(0) @binding(0) var<uniform> uTime: timeUniform;

@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;
  let position = vec4f(vert.pos.x, -vert.pos.y, 0.0, 1.0);
  vsOut.position = position;//vec4f(vert.pos, 0.0, 1.0);
  //vsOut.color = vec4f( uTime.dt * 2, vert.sediment,1.0,1.0);
  let c = vert.sediment / vert.volume;
  let q = 0.5; //equilibrium
  let diff = (q - c) * 0.5;
  


  if ((uTime.subtractMode == 1.0 && diff < 0.0) ||
      (uTime.subtractMode == 0.0 && diff > 0.0)
     )
   {
      vsOut.color = vec4f( (diff),1.0,1.0,1.0);
   }
  else if ((uTime.subtractMode == 1.0 && diff > 0.0) ||
           (uTime.subtractMode == 0.0 && diff < 0.0))
   {
     vsOut.color = vec4f(0.0,1.0,1.0,1.0);
   }

  return vsOut;
}


@fragment fn fs(vsOut: VSOutput) ->  @location(0)  vec4f {
  //Subtract mode and valid
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
let pixel = textureLoad(heightMap, coord);
let height = pixel.r;
let pos = vec4f(vert.position.x, vert.position.y,
  height * 0.4, 1.0);

  
  vsOut.position = uTime.cameraMat * pos;

  /*let topColor = vec4f(0.6,0.9,0.6,1.0);
  let bottomColor = vec4f(0.4,0.2,0.2,1.0);*/
  let topColor = vec4f(1.0,1.0,1.0,1.0);
  let bottomColor = vec4f(0.0,0.0,1.0,1.0);


  vsOut.color = mix(bottomColor, topColor, smoothstep(0,1,height));
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
function initUpdatePipeline(device)
{
    const module = device.createShaderModule({
	label: 'particle update shader',
	//RG -> horizontal output, vertical output respectively
	//Each pixel stores bottom and left values
	code: particleUpdateShader,
    });

    const pipeline = device.createComputePipeline({
	label: 'particleUpdate',
	layout: 'auto',
	compute: {module},
    });
    return pipeline;
}


function initPointPipelines(device, presentationFormat)
{
    const module = device.createShaderModule({
	label: 'doubling compute module',
	//RG -> horizontal output, vertical output respectively
	//Each pixel stores bottom and left values
	code: particlePointShader,
    });
    let info = {
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
			    operation: 'add',
			    srcFactor: 'one',
			    dstFactor: 'one',
			},
			alpha: {
			    srcFactor: 'one',
			    dstFactor: 'one',
			}
		    }
		},
	    ],
	    
	},
	primitive: {
	    topology: 'point-list',
	},
    }
    const depositPipeline = device.createRenderPipeline(info);
    info.fragment.targets[0].blend.color.operation = 'reverse-subtract';
    const subtractPipeline = device.createRenderPipeline(info);
    
    return {depositPipeline, subtractPipeline};
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
    /*const view = mat4.lookAt(
      [1.5, 1.5, 1],  // position
      [0.0, 0.0, 0],    // target
      [0, 0, 1],    // up
    );*/
    const viewProjection = mat4.multiply(projection, view);

    info.uniformValues.set([info.uniformValues[0] + 0.02, 0.02, 0.0, 0.0], 0);
    mat4.rotateZ(viewProjection, 0, info.matrixValue);
    info.device.queue.writeBuffer(info.uniformBuffer, 0, info.uniformValues);

    
    //Draw pass
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
	    label: 'bindGroup for canvas',
	    layout: info.updatePipeline.getBindGroupLayout(0),
	    entries: [
		{ binding: 0, resource:  {buffer :  info.particleBuffer}},
		{ binding: 1, resource: {buffer : info.uniformBuffer}  },
		{ binding: 2, resource: info.heightMap.createView()  },
	    ],
	});
	let {renderPass, encoder} = beginRenderPass(info.device);
	renderPass.setPipeline(info.updatePipeline);
	renderPass.setBindGroup(0, bindGroup);
	//renderPass.dispatchWorkgroups(canvasTexture.width * canvasTexture.height / 2);
	renderPass.dispatchWorkgroups(PARTICLE_COUNT);
	renderPass.end(info.device, encoder);
	endRenderPass(info.device, encoder);
    }
    
    //Deposit pass
    {
	/*
	let bindPointGroup = info.device.createBindGroup({
	    label: 'bindGroup for point',
	    layout: info.depositPipeline.getBindGroupLayout(0),
	    entries: [
		{ binding: 0, resource: {buffer : info.uniformBuffer}},
	    ],
	});

	info.pointRenderPassDescriptor.colorAttachments[0].view = info.heightMap.createView();
	const encoder = info.device.createCommandEncoder();
	const pass = encoder.beginRenderPass(info.pointRenderPassDescriptor);
	pass.setPipeline(info.depositPipeline);
	pass.setVertexBuffer(0, info.particleBuffer);
	pass.setBindGroup(0, bindPointGroup);
	pass.draw(PARTICLE_COUNT);
	pass.setBindGroup(0, bindPointGroup);
	pass.end();
	const commandBuffer = encoder.finish();
	info.device.queue.submit([commandBuffer]);
	*/
    }

    //subtract pass
    {
	info.uniformValues.set([info.uniformValues[0] + 0.02, 0.02, 0.0, 1.0], 0);
	info.device.queue.writeBuffer(info.uniformBuffer, 0, info.uniformValues);
	let bindPointGroup = info.device.createBindGroup({
	    label: 'bindGroup for point',
	    layout: info.subtractPipeline.getBindGroupLayout(0),
	    entries: [
		{ binding: 0, resource: {buffer : info.uniformBuffer}},
	    ],
	});

	info.pointRenderPassDescriptor.colorAttachments[0].view = info.heightMap.createView();
	const encoder = info.device.createCommandEncoder();
	const pass = encoder.beginRenderPass(info.pointRenderPassDescriptor);
	pass.setPipeline(info.subtractPipeline);
	pass.setVertexBuffer(0, info.particleBuffer);
	pass.setBindGroup(0, bindPointGroup);
	pass.draw(PARTICLE_COUNT);
	pass.setBindGroup(0, bindPointGroup);
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


    var particleSize = 6;
    var particles = new Float32Array(PARTICLE_COUNT * 6);
    offset = 0;
    for (let i = 0; i < PARTICLE_COUNT; ++i) {
	particles[offset + 0] = rand(-1,1);
	  particles[offset + 1] = rand(-1,1);
	
	/*particles[offset + 0] = 0.7;
	particles[offset + 1] = -0.7;*/
	
	particles[offset + 2] = 0.0; //speed
	particles[offset + 3] = 0.0;
	
	particles[offset + 4] = 1.0; //volume
	particles[offset + 5] = 0.0; //sediment
	
	offset += 6;
    }

    const particleBuffer = device.createBuffer({
	label: 'particle buffer',
	size: particles.byteLength,
	usage: GPUBufferUsage.COPY_DST |
	    GPUBufferUsage.VERTEX |
	    GPUBufferUsage.STORAGE
    });
    device.queue.writeBuffer(particleBuffer, 0, particles);

    const updatePipeline = initUpdatePipeline(device);

    
    const heightMap = device.createTexture({
	label: "heightmap",
	format: 'rgba8unorm',
	size: [textureSize, textureSize],
	usage: GPUTextureUsage.COPY_DST |
	    GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT,
	//alphaMode: 'premultiplied',
    });

    const textureData = new Uint8Array(Array.from({length: textureSize * textureSize * 4},
				   function(v,i) {
				       return Math.max(0,Math.min(1,(perlin.get(i / 4 / textureSize / 30.0,
					 i / 4 % textureSize / 30.0) * 0.5 + 0.5))) * 255})
				       /*let x = i / 4 / textureSize / textureSize;
				       let y = (i / 4) % (textureSize) / textureSize;
				       return Math.max(0,
 				       Math.min(1, y * 0.5 + x * 0.5)) * 255})*/
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
    const {depositPipeline, subtractPipeline} = initPointPipelines(device, presentationFormat);
    
    var globalInfo = {device, adapter,
		      context, presentationFormat,
		      renderPassDescriptor, 
		      drawPipeline,
		      depositPipeline, subtractPipeline,
		      updatePipeline,
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


