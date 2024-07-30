
function initBuffers(gl, vertices) {
    // Create a buffer for the square's positions.
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
/*    vertices.push(-1.0,-1.0,0.0,
		  0.0,0.0,
		  0.0,0.0,1.0,
		  
		  -1.0,1.0,0.0,
		  0.0,1.0,
		  0.0,1.0,1.0,

		  1.0,1.0,0.0,
		  1.0,1.0,
		  1.0,0.0,1.0,

		  1.0,-1.0,0.0,
		  1.0,0.0,
		  1.0,1.0,0.0);
*/		

		  
		  
    /*
    const vertices = [
	-1.0, -1.0, 0.0,
	0.0,0.0,
	1.0, 0.0, 0.0,
	
	-1.0, 1.0, 0.0,
	0.0,1.0,
	0.0, 1.0, 0.0,
	
	1.0, 1.0, 0.0,
	1.0,1.0,
	0.0, 0.0, 1.0,
	
	1.0, -1.0, 0.0,
	1.0,0.0,
	1.0, 0.0, 1.0,
    ];*/
    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    // Create a buffer for the indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    //Assume all quads
    const indices = [];

    const vertexCount = vertices.length / 8; //8 attributes, so 56 vertices
    for (let i = 0; i < vertexCount; i+=4)
    {
	indices.push(i, i+1, i+2, i, i+2, i+3);
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {vertices: vertexBuffer, indices: indexBuffer, indexCount: indices.length};
}

export { initBuffers };
