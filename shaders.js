var celLineVertexShader = `
attribute vec3 a_coordinate;
attribute vec2 a_bone;
attribute float a_boneWeight;
attribute vec3 a_normal;

uniform float u_width;
uniform mat4 u_matrix; //The Matrix!
uniform vec4 u_bones[113 * 2]; //Bones that can be moved

void main(void) {
    vec4 blendDQ[2];

    blendDQ[0] = (a_boneWeight) * u_bones[(2 * int(a_bone.x) + 0)];
    blendDQ[1] = (a_boneWeight) * u_bones[(2 * int(a_bone.x) + 1)];
    blendDQ[0] += (1.0 - a_boneWeight) * u_bones[(2 * int(a_bone.y) + 0)];
    blendDQ[1] += (1.0 - a_boneWeight) * u_bones[(2 * int(a_bone.y) + 1)];

    float len = length(blendDQ[0]);
    blendDQ[0] /= len;
    blendDQ[1] /= len;

    vec3 position = a_coordinate + 2.0 * cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, a_coordinate) + blendDQ[0].x * a_coordinate);
    vec3 trans = 2.0 * (blendDQ[0].x * blendDQ[1].yzw - blendDQ[1].x * blendDQ[0].yzw + cross(blendDQ[0].yzw, blendDQ[1].yzw));
    position += trans;

    vec3 normal = a_normal + 2.0 * cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, a_normal) + blendDQ[0].x * a_normal);

    gl_Position = u_matrix * vec4(position + normal * u_width, 1.0);

}`;

var vertexShader = `
attribute vec3 a_coordinate;
attribute vec2 a_bone;
attribute float a_boneWeight;
attribute vec3 a_normal;
attribute vec2 a_texcoord;
uniform mat4 u_matrix; //The Matrix!
uniform vec4 u_bones[113 * 2]; //Bones that can be moved
varying vec2 v_textureCoord;
varying vec3 v_normal;

void main(void){

  vec4 blendDQ[2];

  blendDQ[0] = (a_boneWeight)*u_bones[(2*int(a_bone.x) + 0)];
  blendDQ[1] = (a_boneWeight)*u_bones[(2*int(a_bone.x) + 1)];
  
  //if((a_boneWeight != 0.5)){
    blendDQ[0] += (1.0 - a_boneWeight)*u_bones[(2*int(a_bone.y) + 0)];
    blendDQ[1] += (1.0 - a_boneWeight)*u_bones[(2*int(a_bone.y) + 1)];
  //}
  
  float len = length(blendDQ[0]);
    blendDQ[0] /= len;
  blendDQ[1] /= len;
  
    vec3 position = a_coordinate + 2.0*cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, a_coordinate) + blendDQ[0].x*a_coordinate);
    vec3 trans = 2.0*(blendDQ[0].x*blendDQ[1].yzw - blendDQ[1].x*blendDQ[0].yzw + cross(blendDQ[0].yzw, blendDQ[1].yzw));
    position += trans;

    vec3 normal = a_normal + 2.0*cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, a_normal) + blendDQ[0].x*a_normal);

  //Matrix multiplication order!
  gl_Position = u_matrix * vec4(position, 1.0);
  v_normal = normal;
  
  v_textureCoord = a_texcoord;
}`;

//Anime has exactly 2 different shadings, light OR dark
var fragmentShader = `
#extension GL_OES_standard_derivatives : enable
precision mediump float;
varying vec2 v_textureCoord;
varying vec3 v_normal;
uniform vec3 u_light;
uniform vec2 u_onePixel;
uniform sampler2D u_texture;
uniform sampler2D u_normalsTex;

void main() {
  /*
   // Normal discontinuity filter

 vec3 nc = tex2D(u_normalsTex, I.tc0); //Same as v_normal

 vec4 nd;

 nd.x = dot(nc, texture2D(u_normalsTex, I.tc1).xyz);

 nd.y = dot(nc, texture2D(u_normalsTex, I.tc2).xyz);

 nd.z = dot(nc, texture2D(u_normalsTex, I.tc3).xyz);

 nd.w = dot(nc, texture2D(u_normalsTex, I.tc4).xyz);

 nd -= e_barrier.x;

 nd = step(0, nd);

 float ne = clamp(dot(nd, e_weights.x), 0.0, 1.0);
 
 
 OR
 
  // Normal discontinuity filter

 float3 nc = tex2D(NormalMap, uv);

 float4 nd;

 nd.x = abs(dot(nc, tex2D(NormalMap, uv + offs[1]* pixel_size).xyz));

 nd.y = abs(dot(nc, tex2D(NormalMap, uv + offs[2]* pixel_size).xyz));

 nd.z = abs(dot(nc, tex2D(NormalMap, uv + offs[3]* pixel_size).xyz));

 nd.w = abs(dot(nc, tex2D(NormalMap, uv + offs[4]* pixel_size).xyz));

 nd -= e_barrier.x;

 nd = step(0, nd);

 float ne = saturate(dot(nd, e_weights.x));

  
  */

    vec2 oP = vec2(1.0)/u_onePixel;
    vec2 pos = gl_FragCoord.xy/u_onePixel;
    vec3 a = clamp((v_normal - texture2D(u_normalsTex, pos + oP * vec2(1.0, 1.0)).xyz * 2.0 + 1.0) +
    (v_normal - texture2D(u_normalsTex, pos + oP * vec2(1.0, -1.0)).xyz * 2.0 + 1.0)+
    (v_normal - texture2D(u_normalsTex, pos + oP * vec2(-1.0, 1.0)).xyz * 2.0 + 1.0), 0.0, 1.0);
    float sum = 1.0 - max(a.x + a.y + a.z, 0.1); //Seems to look fairly decent
    /*
    vec3 nd;
    nd.x = (dot(v_normal, texture2D(u_normalsTex, pos + oP * vec2(1.0, 1.0)).xyz * 2.0 - 1.0));
    nd.y = (dot(v_normal, texture2D(u_normalsTex, pos + oP * vec2(1.0, -1.0)).xyz * 2.0 - 1.0));
    nd.z = (dot(v_normal, texture2D(u_normalsTex, pos + oP * vec2(-1.0, 1.0)).xyz * 2.0 - 1.0));
    nd -= 0.4;
    float sum = clamp(nd.x + nd.y + nd.z,0.0,1.0);*/
    gl_FragColor = vec4(sum,0.0, 0.0, 1.0);
    
  //step?
    float light = dot(v_normal, normalize(u_light)) <= 1.0/13.0 ? 0.5 : 0.3;
    
    vec3 src = ceil(vec3(texture2D(u_texture, v_textureCoord)) * 10.0) / 10.0; //floor
    
    //gl_FragColor = vec4(src * 2.0 * light * sum,1);
    //if(light > 0.5){
    //gl_FragColor = vec4((1.0 - 2.0 * (1.0 - light) * (1.0 - src.y)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.z)),1);

  
}`;


var normalsVShader = `
attribute vec3 a_coordinate;
attribute vec2 a_bone;
attribute float a_boneWeight;
attribute vec3 a_normal;

uniform mat4 u_matrix; //The Matrix!
uniform vec4 u_bones[113 * 2]; //Bones that can be moved
varying vec3 v_normal;


void main(void) {
    vec4 blendDQ[2];

    blendDQ[0] = (a_boneWeight)*u_bones[(2*int(a_bone.x) + 0)];
    blendDQ[1] = (a_boneWeight)*u_bones[(2*int(a_bone.x) + 1)];
  
    blendDQ[0] += (1.0 - a_boneWeight)*u_bones[(2*int(a_bone.y) + 0)];
    blendDQ[1] += (1.0 - a_boneWeight)*u_bones[(2*int(a_bone.y) + 1)];
  
    float len = length(blendDQ[0]);
    blendDQ[0] /= len;
    blendDQ[1] /= len;
  
    vec3 position = a_coordinate + 2.0*cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, a_coordinate) + blendDQ[0].x*a_coordinate);
    vec3 trans = 2.0*(blendDQ[0].x*blendDQ[1].yzw - blendDQ[1].x*blendDQ[0].yzw + cross(blendDQ[0].yzw, blendDQ[1].yzw));
    position += trans;

    v_normal = a_normal + 2.0*cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, a_normal) + blendDQ[0].x*a_normal);

    //Matrix multiplication order!
    gl_Position = u_matrix * vec4(position, 1.0);

}`;


var normalsFShader = `
precision mediump float;
varying vec3 v_normal;

void main() {
    gl_FragColor = vec4(v_normal * 0.5 + 0.5, 1.0);
}`;