#version 300 es
in lowp vec4 aVertexPosition;

in lowp vec2 aVertexUV;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uInvProjMatrix;
//in lowp vec3 aVertexColour;
out vec2 vVertexUV;
out vec3 rayOrigin;
out vec3 rayDir;
void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  
  vVertexUV = aVertexUV;

  vec4 rayOrigins = uInvProjMatrix * vec4(aVertexUV.xy, 0.0, 1.0);
  rayDir = normalize(uInvProjMatrix * vec4(aVertexUV.xy,1.0,1.0) - rayOrigins).xyz; //TODO: from camera
  //rayDir = vec3(0,0,1);
  rayOrigin = vec3(aVertexUV.xy,0.0);
  //rayOrigin = rayOrigin.xyz;
}
