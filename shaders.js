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

  //Matrix multiplication order!
  gl_Position = u_matrix * vec4(position + a_normal * 0.00001, 1.0);
  v_textureCoord = a_texcoord;
}`;

//Anime has exactly 2 different shadings, light OR dark
var fragmentShader = `
precision mediump float;
varying vec2 v_textureCoord;
uniform sampler2D u_texture;

void main() {
    gl_FragColor = vec4(texture2D(u_texture, v_textureCoord).xyz, 1.0);
}`;

//Normals shader
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


//Post process

var ppVShader = `
attribute vec2 a_coordinate;
varying vec2 v_texcoord;

void main(void) {
  gl_Position = vec4(a_coordinate, 0.0, 1.0);
  v_texcoord = (a_coordinate + 1.0) / 2.0;
}
`;

var ppFShader = `
precision mediump float;
varying vec2 v_texcoord;
uniform vec2 u_windowSize;
uniform vec3 u_light;
uniform sampler2D u_texture;
uniform sampler2D u_normalsTex;

void main(void) {
  vec2 onePixel = vec2(1.0)/u_windowSize;
  vec4 currColor = texture2D(u_texture, v_texcoord);
  
  vec3 rgb2lum = vec3(0.30, 0.59, 0.11);
  float lum[9];
  lum[0]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 1)).xyz, rgb2lum);
  lum[1]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).xyz, rgb2lum);
  lum[2]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 1)).xyz, rgb2lum);
  lum[3]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 0)).xyz, rgb2lum);
  lum[4]=dot(currColor.xyz, rgb2lum);
  lum[5]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).xyz, rgb2lum);
  lum[6]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1,-1)).xyz, rgb2lum);
  lum[7]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0,-1)).xyz, rgb2lum);
  lum[8]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1,-1)).xyz, rgb2lum);
  //[0,1,2]   [-,0,+]   [-,-,-]
  //[3,4,5]   [-,0,+]   [0,0,0]
  //[6,7,8]   [-,0,+]   [+,+,+]
  
  //float x = -lum[0]-lum[3]-lum[6]+lum[2]+lum[5]+lum[8];
  //float y = -lum[0]-lum[1]-lum[3]+lum[6]+lum[7]+lum[8];
  float edge = -lum[0]-lum[1]-lum[2]-lum[3]+lum[4]*8.0-lum[5]-lum[6]-lum[7]-lum[8];
  edge = 1.0 - clamp(edge, 0.0, 1.0);

  vec3 v_normal = texture2D(u_normalsTex, v_texcoord).xyz;
  vec3 a = -(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(1.0, 1.0)).xyz)
   - (texture2D(u_normalsTex, v_texcoord + onePixel * vec2(1.0, -1.0)).xyz)
   - (texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1.0, -1.0)).xyz)
   - (texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1.0, 1.0)).xyz)
   + v_normal * 4.0;
  float sum = 1.3 - clamp(a.x+a.y+a.z, 0.3, 1.0); //Better?


  float light = dot(v_normal * 2.0 - 1.0, normalize(u_light)) <= 1.0/13.0 ? 0.5 : 0.3;

  vec3 src = ceil(currColor.xyz * 10.0) / 10.0; //floor
  
  gl_FragColor = vec4(src * 2.0 * light * sum * edge * currColor.w,1.0);
  
  
  //if(light > 0.5){
  //gl_FragColor = vec4((1.0 - 2.0 * (1.0 - light) * (1.0 - src.y)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.z)),1);
}`;