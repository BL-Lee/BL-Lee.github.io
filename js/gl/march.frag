#version 300 es
precision mediump float;
precision highp sampler3D;
uniform sampler3D uSampler;
uniform float time;

in mediump vec2 vVertexUV;
out lowp vec4 FragColor;
in vec3 rayOrigin;
in vec3 rayDir;
float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float sphereTest(vec3 rayDir, vec3 rayOrig) {
    vec3 spherePos = vec3(0.0,0.0,0.0);
    float sphereRadius = 0.5;

    vec3 relativeSpherePos = rayOrig - spherePos;
    float a = dot(rayDir, rayDir);
    float b = 2.0*dot(rayDir, relativeSpherePos);
    float c = dot(relativeSpherePos, relativeSpherePos) - sphereRadius * sphereRadius;

    float root = b*b - 4.0*a*c;
    if (root < 0.001)
        {
            return -1.0;
        }
    return (-b - sqrt(root)) / 2.0*a;


    }
void main() {
  
  vec3 loc = vec3((sin(time / 2.0) + 1.0) / 2.0, rayOrigin.y, rayOrigin.x );
  float val = texture(uSampler, loc).r;
  float col = val < 0.2 ? 1.0 : 0.0;
  FragColor = vec4(val,val,val, 1.0);
  FragColor = vec4(vVertexUV.xy, 0.0, 1.0);
  return;
  
  
    vec3 cameraPos = vec3(0.0,0.0,1.0); //TODO: Camera uniform
    //vec3 rayDir = vec3(0.0,0.0,-1.0); //TODO: from camera
    //vec3 rayOrigin = cameraPos + vec3((vVertexUV - 0.5) * 2.0,0.0);
    float intersectDist = sphereTest(rayDir, rayOrigin);
    if (intersectDist == -1.0)
        {
            FragColor = vec4(vVertexUV, 1.0,1.0);
            return;
        }

    vec3 hitLocation = rayOrigin + rayDir * intersectDist;
    vec3 normal = normalize(hitLocation);//from center of sphere to location
    vec3 sunDir = vec3(0.0,-1.0,0.0);
    float dirLight = clamp((dot(normal, -sunDir)),0.0,1.0);
    FragColor = vec4(dirLight,dirLight,dirLight,1.0);

    //gl_FragCoord //TODO: From camera and projection


}
