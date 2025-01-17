


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

function initPipeline(device, presentationFormat)
{
    const module = device.createShaderModule({
	label: 'doubling compute module',
	//RG -> horizontal output, vertical output respectively
	//Each pixel stores bottom and left values
	code: `
      struct timeUniform {
          time: f32,
          dt: f32,
          buffer: f32
      };
       @group(0) @binding(0) var readVel: texture_storage_2d<rgba32float, read>;
       @group(0) @binding(1) var writeVel: texture_storage_2d<rgba32float, write>;
       @group(0) @binding(2) var<uniform> uTime: timeUniform;
       @group(0) @binding(3) var swapChain: texture_storage_2d<${presentationFormat}, write>;
       @compute @workgroup_size(1) fn computeSomething(
         @builtin(global_invocation_id) id: vec3u
       ) {

          let time = uTime.time;
          let vid = id.x * 2 + u32(uTime.buffer);
          let coord = vec2u(vid % 127, vid / 127);
          let topOut = (textureLoad(readVel, coord + vec2u(0,1)));
          let rightOut = (textureLoad(readVel, coord + vec2u(1,0)));
          let prevVel = (textureLoad(readVel, coord));
          let totalInput = (rightOut.r + prevVel.r + topOut.g + prevVel.g);

          let output = prevVel + totalInput / 4.0 ;

          var color = output;
///          var color = vec4f(1.0 - uTime.buffer, uTime.buffer, 0.0, 1.0);
         if (coord.x >= 96 && coord.x < 105 && coord.y > 96 && coord.y < 105)
         //if (coord.x == 6 && coord.y == 5)
          {
             color.r = -8.0;
             color.g = 8.0;
          }

          textureStore(writeVel, coord, color);

          let newRightOut = vec4(rightOut.r - totalInput / 4.0, rightOut.gba);
          textureStore(writeVel, coord + vec2u(1,0), newRightOut);
          let newTopOut = vec4(topOut.r, topOut.g - totalInput  / 4.0, topOut.ba);
          textureStore(writeVel, coord + vec2u(0,1), newTopOut);

          let outColor = vec4f((color.rg + 1.0) / 2.0, totalInput, 1.0);
          //let outColor = vec4f(uTime.buffer, vec2f(coord) / 128 ,1.0);
          //let outColor = vec4f(totalInput);
          textureStore(swapChain, coord, outColor);
      }
    `,
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

function initBuffers(device)
{
    const uniformBufferSize = 12;
    const uniformBuffer = device.createBuffer({
	size: uniformBufferSize,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    return {uniformBuffer}
}

function initUniforms(device, pipeline, readTexture, writeTexture, swapChain,uniformBuffer)
{
    // Setup a bindGroup to tell the shader which
    // buffer to use for the computation
    const bindGroup = device.createBindGroup({
	label: 'bindGroup for canvas',
	layout: pipeline.getBindGroupLayout(0),
	entries: [
	    { binding: 0, resource:  readTexture.createView() },
	    { binding: 1, resource:  writeTexture.createView() },
	    { binding: 2, resource: {buffer : uniformBuffer}  },
	    { binding: 3, resource:  swapChain.createView() },
	],
    });
    return bindGroup;
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
    info.timeValues.set([info.timeValues[0] + 0.032, 0.032, 0.0], 0);
    info.device.queue.writeBuffer(info.uniformBuffer, 0, info.timeValues);
    const canvasTexture = info.context.getCurrentTexture();

    let bindGroup = initUniforms(info.device, info.pipeline,
				   info.writeBuffer, info.readBuffer,
				   canvasTexture, info.uniformBuffer );
    {

	let {renderPass, encoder} = beginRenderPass(info.device);
	renderPass.setPipeline(info.pipeline);
	renderPass.setBindGroup(0, bindGroup);

	renderPass.dispatchWorkgroups(canvasTexture.width * canvasTexture.height / 2);
	renderPass.end(info.device, encoder);
	endRenderPass(info.device, encoder);
    }

    info.timeValues.set([info.timeValues[0] + 0.032, 0.032, 1.0], 0);
    info.device.queue.writeBuffer(info.uniformBuffer, 0, info.timeValues);
     bindGroup = initUniforms(info.device, info.pipeline,
				   info.writeBuffer, info.readBuffer,
				   canvasTexture, info.uniformBuffer );

    {
	let {renderPass, encoder} = beginRenderPass(info.device);
	renderPass.setPipeline(info.pipeline);
	renderPass.setBindGroup(0, bindGroup);

	renderPass.dispatchWorkgroups(canvasTexture.width * canvasTexture.height / 2);
	renderPass.end(info.device, encoder);
	endRenderPass(info.device, encoder);

    }

/*
    const copyEncoder = info.device.createCommandEncoder({label: "copy to swapchain"})
    copyEncoder.copyTextureToTexture({texture : info.writeBuffer},
				 {texture : canvasTexture},
				 {
				     width: canvasTexture.width,
				     height: canvasTexture.height
				 });
    
    const commandBuffer = copyEncoder.finish();
    info.device.queue.submit([commandBuffer]);
*/
}

async function setup()
{
    var {adapter, device, context, presentationFormat} = await initWebGPU();
    var {module, pipeline} = initPipeline(device, presentationFormat);

    
    const canvasTexture = context.getCurrentTexture();
    var readBuffer = device.createTexture({
	label: "read",
	format : "rgba32float",
	size : [canvasTexture.width, canvasTexture.height],
	usage : GPUTextureUsage.STORAGE_BINDING
    })
    var writeBuffer = device.createTexture({
	label: "write",
	format : "rgba32float",
	size : [canvasTexture.width, canvasTexture.height],
	usage : GPUTextureUsage.STORAGE_BINDING
    })
    
    var timeValues = new Float32Array(3);
    var {uniformBuffer} = initBuffers(device);

    
    //var bindGroup = initUniforms(device, pipeline, readBuffer, writeBuffer, canvasTexture, uniformBuffer )
    //var bindSwapGroup = initUniforms(device, pipeline, writeBuffer, readBuffer, canvasTexture,  uniformBuffer )
    //device.queue.writeBuffer(uniformBuffer, 0, timeValues);

    //let usedBindGroup = bindGroup;

    var globalInfo = {device, adapter,
		      context, presentationFormat,
		      module, pipeline,
		      readBuffer,
		      writeBuffer, timeValues,
		      uniformBuffer};

    const interval = setInterval(function() {
	//Swap read/write buffers
	let swap = globalInfo.readBuffer;
	globalInfo.readBuffer = globalInfo.writeBuffer;
	globalInfo.writeBuffer = swap;

	render(globalInfo);
    }, 1000);

    //render(globalInfo);
    
    return globalInfo;
}
setup();
