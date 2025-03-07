
var angleValue = 50.0;
var anglePrintout = d3.select("#sensor-angle-print");
// Listen to the slider?
d3.select("#sensor-angle").on("change", function(d){
    anglePrintout.html(this.value + "&deg;");
    angleValue = this.value;
})
var agentSpeed = 1.0;
var speedPrintout = d3.select("#agent-speed-print");
// Listen to the slider?
d3.select("#agent-speed").on("change", function(d){
    speedPrintout.html(this.value);
    agentSpeed = this.value;
})
var interval = null;

var textureSize = '512';
var slimeSensorProgram = `struct timeUniform {
        time: f32,
        dt: f32,
        sensorAngle: f32,
        agentSpeed: f32
    };
fn sampleLinear(uv : vec2f) -> vec4f {

    let texel = vec2u(wrap(uv) * ${textureSize});
    return textureLoad(trail, wrapTexel(texel));
    let BL = textureLoad(trail, wrapTexel(texel));
    let BR = textureLoad(trail, wrapTexel(texel + vec2u(1,0)));
    let TL = textureLoad(trail, wrapTexel(texel + vec2u(0,1)));
    let TR = textureLoad(trail, wrapTexel(texel + vec2u(1,1)));


    let mixVal = fract(uv * ${textureSize});

    return mix(mix(BL, BR, mixVal.x), mix(TL, TR, mixVal.x), mixVal.y);

}
fn wrapTexel(texel : vec2u) -> vec2u {
   var newTexel = vec2u(texel);
   if (texel.x < 0)
     {
         newTexel.x = ${textureSize} - texel.x;
     }
   if (texel.y < 0)
     {
         newTexel.y = ${textureSize} - texel.y;
     }
   if (texel.x > ${textureSize} - 1)
     {
         newTexel.x = texel.x - ${textureSize};
     }
   if (texel.y > ${textureSize} - 1)
     {
         newTexel.y = texel.y - ${textureSize};
     }

   return vec2u(newTexel);
}

fn wrap(uv : vec2f) -> vec2f {
  
  var newUv = uv;

   if (uv.x < 0.0)
     {
         newUv.x = 1.0 - uv.x;
     }
   if (uv.y < 0.0)
     {
         newUv.y = 1.0 - uv.y;
     }
   if (uv.x > 1.0)
     {
         newUv.x = uv.x - 1.0;
     }
   if (uv.y > 1.0)
     {
         newUv.y = uv.y - 1.0;
     }


   return newUv;
}

@group(0) @binding(0) var<storage, read_write> agents: array<vec4f>;
@group(0) @binding(1) var<uniform> uTime: timeUniform;
@group(0) @binding(2) var trail: texture_storage_2d<bgra8unorm, read>;

@compute @workgroup_size(1) fn computeSomething(
    @builtin(global_invocation_id) id: vec3u
) {

    let i = id.x;
    let uv = agents[i].yz;

    let PI = 3.14159265358979323;
    //Sensor
    let angle = agents[i].x;// * 2.0 * PI;
    let sensorAngle = uTime.sensorAngle;
    let sensorDist = 2.0 / ${textureSize};
    let uvFront = vec2f(sin(angle), cos(angle)) * sensorDist + uv;
    let uvFrontLeft = vec2f(sin(angle - sensorAngle), cos(angle - sensorAngle)) * sensorDist + uv;
    let uvFrontRight = vec2f(sin(angle + sensorAngle), cos(angle + sensorAngle)) * sensorDist + uv;

    let valFront = sampleLinear(uvFront);
    let valFrontLeft = sampleLinear(uvFrontLeft);
    let valFrontRight = sampleLinear(uvFrontRight);


    let rotationAmount = sensorAngle;//16.0 / 180.0 * PI;
    var newRotation = 0.0;
    let leftDiff = -valFront.b + valFrontLeft.b;
    let rightDiff = -valFront.b + valFrontRight.b;

    if (valFront.b > valFrontRight.b && valFront.b > valFrontLeft.b)
    {
       newRotation = fract(sin(dot(uv * uTime.dt, vec2f(12.9898, 78.233))) * 43758.5453) * 0.1;

    }
    else if (valFrontRight.b > valFrontLeft.b)
    {
      newRotation = rotationAmount; 
    }
    else if (valFrontLeft.b > valFrontRight.b)
    {
      newRotation = -rotationAmount; 
    }

    let nextAngle = (newRotation + angle) % (2.0 * PI);// / (2.0 * PI);
    let dir = vec2f(sin(nextAngle), cos(nextAngle));


    let newPos = wrap(agents[i].yz + dir * uTime.agentSpeed / ${ textureSize} );
    
    agents[i] = vec4f(nextAngle, newPos, 0.0);
}
`;
var slimeDiffuseProgram = `
struct timeUniform {
        time: f32,
        dt: f32,
        sensorRadius: f32,
        agentSpeed : f32
    };
fn wrapTexel(texel : vec2i) -> vec2u {
   var newTexel = vec2i(texel);
   if (texel.x < 0)
     {
         newTexel.x = ${textureSize} - texel.x;
     }
   if (texel.y < 0)
     {
         newTexel.y = ${textureSize} - texel.y;
     }
   if (texel.x > ${textureSize} - 1)
     {
         newTexel.x = texel.x - ${textureSize};
     }
   if (texel.y > ${textureSize} - 1)
     {
         newTexel.y = texel.y - ${textureSize};
     }

   return vec2u(newTexel);
}

@group(0) @binding(0) var<uniform> uTime: timeUniform;
@group(0) @binding(1) var trail: texture_storage_2d<bgra8unorm, read>;
@group(0) @binding(2) var trail_write: texture_storage_2d<bgra8unorm, write>;
@group(0) @binding(3) var swapChain: texture_storage_2d<bgra8unorm, write>;
@compute @workgroup_size(1) fn computeSomething(
    @builtin(global_invocation_id) id: vec3u
) {
     var trailValue = textureLoad(trail, id.xy) * (1.0 -  uTime.dt) * 0.999;
    //Deposit/reposition
     var outColour = vec4(trailValue);
     if (outColour.b < 0.3)
     {
        outColour.b = 0.0;
     }

     
     textureStore(trail_write, id.xy, outColour);

     if (outColour.b < 0.8)
     {
        outColour.b = 0.0;
     }

     textureStore(swapChain, id.xy, outColour.b * vec4(0.6,0.9,0.2,1.0));
}
`;
var pointShader = `struct Vertex {
  @location(0) position: vec4f,
};
 
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,

};
 
@vertex fn vs(vert: Vertex,) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vec4f(vert.position.y * 2.0 - 1.0, -(vert.position.z * 2.0 - 1.0), 1.0, 1.0);

  vsOut.color = vec4f(vert.position.a,0.0,1.0,1.0);
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
    if (!navigator.gpu) {
	throw new Error("WebGPU not supported on this browser.");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
	throw new Error("No appropriate GPUAdapter found.");
    }
    // bgra8unorm as a storage texture is an optional feature so
  // if it's supported then we don't care if presentationFormat is
  // bgra8unorm or rgba8unorm but if the feature does not exist
  // then we must use rgba8unorm
    let presentationFormat = adapter.features.has('bgra8unorm-storage')
	? navigator.gpu.getPreferredCanvasFormat()
	: 'rgba8unorm';

    const device = await adapter?.requestDevice({
	requiredFeatures: presentationFormat === 'bgra8unorm'
            ? ['bgra8unorm-storage']
            : [],
    });
    const context = canvas.getContext("webgpu");
    context.configure({
	device: device,
	format: presentationFormat,
	usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING
    });
    return {adapter, device, context, presentationFormat};
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
function initPointPipeline(device, presentationFormat)
{
    const module = device.createShaderModule({
	label: 'doubling compute module',
	//RG -> horizontal output, vertical output respectively
	//Each pixel stores bottom and left values
	code: pointShader,
    });

    const pipeline = device.createRenderPipeline({
	label: '1 pixel points',
	layout: 'auto',
	vertex: {
	    module,
	    buffers: [
		{
		    arrayStride: 4 * 4, // 2 floats, 4 bytes each
		    attributes: [
			{shaderLocation: 0, offset: 0, format: 'float32x4'},  // position
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
	    topology: 'point-list',
	},
    });
    return pipeline;
}

function initBuffers(device)
{
    const uniformBufferSize = 16;
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
    //40.0 / 180.0 * PI;

    let angle = angleValue / 180.0 * 3.14159;
    info.timeValues.set([info.timeValues[0] + 0.002, 0.0042, angle, agentSpeed], 0);
    info.device.queue.writeBuffer(info.uniformBuffer, 0, info.timeValues);
    const canvasTexture = info.context.getCurrentTexture();
    //Draw
    {
	info.renderPassDescriptor.colorAttachments[0].view = info.trailBuffer.createView();
	const encoder = info.device.createCommandEncoder();
	const pass = encoder.beginRenderPass(info.renderPassDescriptor);
	pass.setPipeline(info.pointPipeline);
	pass.setVertexBuffer(0, info.agentBuffer);
	pass.draw(10000);
	pass.end();
	const commandBuffer = encoder.finish();
	info.device.queue.submit([commandBuffer]);
    }

    //Diffuse
    {
	const bindGroup = info.device.createBindGroup({
	    label: 'bindGroup for diffuse',
	    layout: info.diffusePipeline.getBindGroupLayout(0),
	    entries: [
		{ binding: 0, resource: {buffer : info.uniformBuffer}  },
		{ binding: 1, resource:  info.trailBuffer.createView() },
		{ binding: 2, resource:  info.trailBufferWrite.createView() },
				{ binding: 3, resource:  canvasTexture.createView() },
	    ],
	});

	let {renderPass, encoder} = beginRenderPass(info.device);
	renderPass.setPipeline(info.diffusePipeline);
	renderPass.setBindGroup(0, bindGroup);

	renderPass.dispatchWorkgroups(canvasTexture.width, canvasTexture.height);

	renderPass.end(info.device, encoder);
	endRenderPass(info.device, encoder);

    }
    //Sensor
    {
	const bindGroup = info.device.createBindGroup({
	    label: 'bindGroup for canvas',
	    layout: info.pipeline.getBindGroupLayout(0),
	    entries: [
		{ binding: 0, resource:  {buffer :  info.agentBuffer}},
		{ binding: 1, resource: {buffer : info.uniformBuffer}  },
		{ binding: 2, resource:  info.trailBuffer.createView() },

	    ],
	});

	let {renderPass, encoder} = beginRenderPass(info.device);
	renderPass.setPipeline(info.pipeline);
	renderPass.setBindGroup(0, bindGroup);

	//renderPass.dispatchWorkgroups(canvasTexture.width * canvasTexture.height / 2);
	renderPass.dispatchWorkgroups(10000);
	renderPass.end(info.device, encoder);
	endRenderPass(info.device, encoder);
    }

    //Swap read/write buffers
    let swap = info.trailBuffer;
    info.trailBuffer = info.trailBufferWrite;
    info.trailBufferWrite = swap;


}

async function setup()
{
    var {adapter, device, context, presentationFormat} = await initWebGPU();
    var {module, pipeline} = initPipeline(device, presentationFormat, slimeSensorProgram);

    
    const canvasTexture = context.getCurrentTexture();
    
    var timeValues = new Float32Array(4);
    var {uniformBuffer} = initBuffers(device);
    var agent_count = 10000;
    var agents = new Float32Array(4 * agent_count);
      const rand = (min, max) => min + Math.random() * (max - min);

    for (let i = 0; i < agent_count; ++i) {
	const offset = i * 4;
	agents[offset + 0] = rand(0, 6.14);
	//agents[offset + 0] = rand(0.1,3.14);
	agents[offset + 1] = rand(0.2, 0.8);
	agents[offset + 2] = rand(0.2, 0.8);
	agents[offset + 3] = rand(-1, 1);

    }
    const agentBuffer = device.createBuffer({
	label: 'work buffer',
	size: agents.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });
    device.queue.writeBuffer(agentBuffer, 0, agents);


    var trailBuffer = device.createTexture({
	label: "read",
	format : "bgra8unorm",
	size : [canvasTexture.width, canvasTexture.height],
	usage : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    })
    var trailBufferWrite = device.createTexture({
	label: "write",
	format : "bgra8unorm",
	size : [canvasTexture.width, canvasTexture.height],
	usage : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    })

    var diffuseInfo = initPipeline(device, presentationFormat, slimeDiffuseProgram);
    var diffusePipeline = diffuseInfo.pipeline;
    
    var renderPassDescriptor = {
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
    const pointPipeline = initPointPipeline(device, presentationFormat);
    var globalInfo = {device, adapter,
		      context, presentationFormat,
		      module, pipeline, agent_count, renderPassDescriptor, diffusePipeline,
		      trailBufferWrite,
		      pointPipeline,
		      trailBuffer,
		      agents, agentBuffer, timeValues,
		      uniformBuffer};

    interval = setInterval(function() {
	//Swap read/write buffers
	render(globalInfo);

    }, 16);
    //render(globalInfo);

    return globalInfo;
}


setup().then((globalInfo) =>
    {
	addEventListener("keypress", function(event) {
	    render(globalInfo);
	});
	d3.select("#fps-input").on("change", function(d){
	    let fps = d3.select('input[name="fps"]:checked').node().value;

	    if (fps == 30)
	    {
		clearInterval(interval);
		interval = setInterval(function() {
		    //Swap read/write buffers
		    render(globalInfo);

		}, 32);
	    }
	    if (fps == 60)
	    {
		clearInterval(interval);
		interval = setInterval(function() {
		    //Swap read/write buffers
		    render(globalInfo);

		}, 16);
	    }
	})
    });


/*

  COMPUTE pass ->
  Agents -> sample sensors/move
  Draw pass ->
  agents -> draw as pixels

 */
