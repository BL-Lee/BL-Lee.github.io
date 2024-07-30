// Vertex shader program
const vsSource = `#version 300 es

    in lowp vec4 aVertexPosition;
    in lowp vec3 aVertexColour;
    in lowp vec2 aVertexUV;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;


    out vec4 vColour;
    out vec2 vVertexUV;
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColour = vec4(aVertexColour,1.0);
      vVertexUV = aVertexUV;
    }
  `;


const fsSource = `#version 300 es
    precision mediump float;
    uniform sampler2D uSampler;

    in lowp vec4 vColour;
    in lowp vec2 vVertexUV;
    out lowp vec4 FragColor;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

    void main() {

    vec3 msd = texture(uSampler, vVertexUV).rgb;
    float sd = median(msd.r, msd.g, msd.b);
    float screenPxDistance = 4.0*(sd - 0.5);
    float opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);
    vec4 color = mix(vec4(1.0, 1.0, 1.0, 1.0),vec4 (0.0, 0.0, 0.0, 1.0) , opacity);

//    FragColor = vColour * texture(uSampler, vVertexUV) + vec4(vVertexUV,1.0,1.0);
    FragColor = color + vColour;
}
  `;
export {vsSource, fsSource};
