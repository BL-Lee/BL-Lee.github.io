


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
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
	device: device,
	format: canvasFormat,
    });
    return {adapter, device, context};
}

function initPipeline(device)
{
    const module = device.createShaderModule({
	label: 'doubling compute module',
	code: `
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;
 
      @compute @workgroup_size(1) fn computeSomething(
        @builtin(global_invocation_id) id: vec3u
      ) {
        let i = id.x;
        data[i] = data[i] * 2.0;
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

function initBuffers(input)
{
    //const input = new Float32Array([1, 3, 5]);

    // create a buffer on the GPU to hold our computation
    // input and output
    const workBuffer = device.createBuffer({
	label: 'work buffer',
	size: input.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    // Copy our input data to that buffer
    device.queue.writeBuffer(workBuffer, 0, input);

    // create a buffer on the GPU to get a copy of the results
    const resultBuffer = device.createBuffer({
	label: 'result buffer',
	size: input.byteLength,
	usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    return {workBuffer, resultBuffer}
}

function initUniforms(device, pipeline, workBuffer)
{
    // Setup a bindGroup to tell the shader which
    // buffer to use for the computation
    const bindGroup = device.createBindGroup({
	label: 'bindGroup for work buffer',
	layout: pipeline.getBindGroupLayout(0),
	entries: [
	    { binding: 0, resource: { buffer: workBuffer } },
	],
    });
    return bindGroup;
}

function beginRenderPass(device)
{
    // Encode commands to do the computation
    const encoder = device.createCommandEncoder({
	label: 'doubling encoder',
    });
    const renderPass = encoder.beginComputePass({
	label: 'doubling compute pass',
    });

    return {renderPass, encoder};
}

function endRenderPass(device, encoder)
{
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

var {adapter, device, context} = await initWebGPU();
var {module, pipeline} = initPipeline(device);
var inputs = new Float32Array([1,5,7,2]);
var {workBuffer, resultBuffer} = initBuffers(inputs);
var bindGroup = initUniforms(device, pipeline, workBuffer)

var {renderPass, encoder} = beginRenderPass(device);
console.log(renderPass);
renderPass.setPipeline(pipeline);
renderPass.setBindGroup(0, bindGroup);
renderPass.dispatchWorkgroups(inputs.length);
renderPass.end(device, encoder);
encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);
endRenderPass(device, encoder);


// Read the results
await resultBuffer.mapAsync(GPUMapMode.READ);
const result = new Float32Array(resultBuffer.getMappedRange());

console.log('input', inputs);
console.log('result', result);

resultBuffer.unmap();
