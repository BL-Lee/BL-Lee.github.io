


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

fn hsl_n(magnitude: f32, n: f32, angle: f32) -> f32 {
 let k = (n + angle / 60) % 6;
 return magnitude - magnitude*f32(max(0, min(min(k, 4 - k), 1)));
}


fn to_out_color(angle: f32, magnitude: f32) -> vec4f {

  
  let output = vec4f(hsl_n(magnitude,5, angle),
                     hsl_n(magnitude,3, angle),
                     hsl_n(magnitude,1, angle)
                    , 1.0);  
  //let output = vec4f(cos(angle), cos(angle + 120), cos(angle - 120), 1.0) * magnitude;
  return output;
}


       @group(0) @binding(0) var readVel: texture_storage_2d<rgba32float, read>;
       @group(0) @binding(1) var writeVel: texture_storage_2d<rgba32float, write>;
       @group(0) @binding(2) var<uniform> uTime: timeUniform;
       @group(0) @binding(3) var swapChain: texture_storage_2d<${presentationFormat}, write>;
       @compute @workgroup_size(1) fn computeSomething(
         @builtin(global_invocation_id) id: vec3u
       ) {

          let time = uTime.time;
          //let vid = id.x * 2 + u32(uTime.buffer);
          //let coord = vec2u(vid % 127, vid / 127);
          let coord = vec2u(id.xy);
          let topOut = textureLoad(readVel, vec2u(coord + vec2u(0,1)));
          let leftOut = textureLoad(readVel, vec2u(vec2i(coord) + vec2i(-1,0)));
          let bottomOut = textureLoad(readVel, vec2u(vec2i(coord) + vec2i(0,-1)));
          let rightOut = textureLoad(readVel, vec2u(coord + vec2u(1,0)));
          let prevOut = textureLoad(readVel, coord);

//Forces and diffusion

          var totalInput = leftOut.r + bottomOut.g - rightOut.r - topOut.g;

          totalInput *= 1.0;
          var s = vec4f(1.0, 1.0, 1.0, 1.0);
          if (coord.x >= 126)
          {
            s.z = 0.0;
          }
          if (coord.x <= 0)
          {
            s.x = 0.0;
          }
          if (coord.y >= 126)
          {
            s.y = 0.0;
          }
          if (coord.y <= 0)
          {
            s.w = 0.0;
          }

          let gridWidth = 1.0;

          let pressure = vec4f(rightOut.b * s.z, leftOut.b * s.x,
                                       topOut.b * s.y, bottomOut.b * s.a);
          
          let pressureGradient = vec2f(pressure.x - pressure.y,
                                       pressure.z - pressure.w);

          let pressureVal = pressure.x + pressure.y + pressure.z + pressure.w;

          let sVal = s.x + s.y + s.z + s.w;
          var output = vec4f(0.0,0.0,
                              (totalInput + pressureVal) / sVal,
                              1.0);
 
          //advect velocity

          var tracedPos = (vec2f(coord)) - uTime.dt * prevOut.xy;
          var tracedTexel = vec2u(tracedPos);
          //Might need to center to pixel

          var mixVal = fract(tracedPos);

          let bl = textureLoad(readVel, tracedTexel + vec2u(0,0)).rg;
          let br = textureLoad(readVel, tracedTexel + vec2u(1,0)).rg;
          let tl = textureLoad(readVel, tracedTexel + vec2u(0,1)).rg;
          let tr = textureLoad(readVel, tracedTexel + vec2u(1,1)).rg;

          let advectedVel = mix(mix(bl,br, mixVal.x), mix(tl, tr, mixVal.x), mixVal.y);

          output.x = advectedVel.x;
          output.y = advectedVel.y;



          var color = output;
          var inPix = 0.0;
          if (coord.x == 65 && coord.y == 55)
          {
             color = vec4(200.0,2.0,0.0,1.0);
             inPix = 1.0;
          }
          if (coord.x >= 96 && coord.x < 105 && coord.y > 90 && coord.y < 96)
          {
             color = vec4(12.0,1.0,0.0,1.0);
             inPix = 1.0;
          }

          
          textureStore(writeVel, coord, color);

          //let angle = atan2(pressureGradient.x, pressureGradient.y);
          let angle = atan2(output.x, output.y);
           
          //let outColor = to_out_color(180 *  angle / 3.1415 , min(1.0, abs(output.b)));

          //let outColor = vec4f((1.0 + output.b) / 2.0, inPix, 0.0, 1.0);
          let outColor = vec4f((pressureGradient + 1.0) / 2.0, 1.0, 1.0);
          //let outColor = vec4f((pressureVal + 1.0) / 2.0);
          //let outColor = vec4f((color.xy + 1.0) / 2.0, inPix, 1.0);
          //let outColor = vec4f(vec2f(tr.xy) / 127.0, bl.xy);
          //let outColor = vec4f((mixVal.xy + 1.0) / 2.0, inPix, 1.0);
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

function initUniforms(device, pipeline, rTex, wTex, swapChain,uniformBuffer)
{
    // Setup a bindGroup to tell the shader which
    // buffer to use for the computation
    const bindGroup = device.createBindGroup({
	label: 'bindGroup for canvas',
	layout: pipeline.getBindGroupLayout(0),
	entries: [
	    { binding: 0, resource:  rTex.createView() },
	    { binding: 1, resource:  wTex.createView() },
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
    info.timeValues.set([info.timeValues[0] + 0.032, 0.32, 1.0], 0);
    info.device.queue.writeBuffer(info.uniformBuffer, 0, info.timeValues);
    const canvasTexture = info.context.getCurrentTexture();

    let bindGroup = initUniforms(info.device, info.pipeline,
				   info.readBuffer, info.writeBuffer,
				   canvasTexture, info.uniformBuffer );
    {

	let {renderPass, encoder} = beginRenderPass(info.device);
	renderPass.setPipeline(info.pipeline);
	renderPass.setBindGroup(0, bindGroup);

	//renderPass.dispatchWorkgroups(canvasTexture.width * canvasTexture.height / 2);
	renderPass.dispatchWorkgroups(canvasTexture.width, canvasTexture.height);
	renderPass.end(info.device, encoder);
	endRenderPass(info.device, encoder);
    }

/*    info.timeValues.set([info.timeValues[0], 0.032, 0.0], 0);
    info.device.queue.writeBuffer(info.uniformBuffer, 0, info.timeValues);
     //bindGroup = initUniforms(info.device, info.pipeline,
//				   info.readBuffer, info.writeBuffer,
//				   canvasTexture, info.uniformBuffer );

    {
	let {renderPass, encoder} = beginRenderPass(info.device);
	renderPass.setPipeline(info.pipeline);
	renderPass.setBindGroup(0, bindGroup);

	renderPass.dispatchWorkgroups(canvasTexture.width * canvasTexture.height / 2);
	renderPass.end(info.device, encoder);
	endRenderPass(info.device, encoder);

    }
*/
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
/*
    const interval = setInterval(function() {
	//Swap read/write buffers
	let swap = globalInfo.readBuffer;
	globalInfo.readBuffer = globalInfo.writeBuffer;
	globalInfo.writeBuffer = swap;

	render(globalInfo);
    }, 32);
*/
    //render(globalInfo);
    
    return globalInfo;
}

setup().then((globalInfo) =>
    {
addEventListener("keypress", function(event) {
        //Swap read/write buffers
	let swap = globalInfo.readBuffer;
	globalInfo.readBuffer = globalInfo.writeBuffer;
	globalInfo.writeBuffer = swap;

	render(globalInfo);
    
});
	
    });


