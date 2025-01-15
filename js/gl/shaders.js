// Vertex shader program
const vsSource = `#version 300 es

    in lowp vec3 aVertexPosition;
    in lowp vec2 aVertexUV;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;


    out vec2 vVertexUV;
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition,1.0);
      vVertexUV = aVertexUV;
    }
  `;


const fsSource = `#version 300 es
    precision mediump float;
    uniform sampler2D uSampler;

    in lowp vec2 vVertexUV;
    out lowp vec4 FragColor;

    void main() {

    vec3 msd = texture(uSampler, vVertexUV).rgb;
    FragColor = vec4(msd,1.0) + vec4(vVertexUV,1.0,1.0) * 0.1;
}
  `;

// Vertex shader program
const vsOffscreenSource = `#version 300 es

    in lowp vec3 aVertexPosition;
    in lowp vec2 aVertexUV;

    out vec2 vVertexUV;
    void main() {
      gl_Position = vec4(aVertexPosition, 1.0);
      vVertexUV = aVertexUV;
    }
  `;


const fsOffscreenSource = `#version 300 es
    precision mediump float;
    uniform float uTime;

    in lowp vec2 vVertexUV;
    out lowp vec4 FragColor;

    void main() {
    //vec3 msd = texture(uSampler, vVertexUV).rgb;
    FragColor = vec4(vVertexUV.xy ,1.0,1.0);
}
  `;

export {vsSource, fsSource, vsOffscreenSource, fsOffscreenSource};
