var celLineVertexShader = `
attribute vec3 a_coordinate;
attribute vec2 a_bone;
attribute float a_boneWeight;
attribute vec3 a_normal;

uniform vec2 u_windowSize;
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

    //vec2 onePixel = vec2(1.0 / u_windowSize.x, 1.0 / u_windowSize.y);
    //vec2 screenConvert = vec2(2.0 / u_windowSize.x, -2.0 / u_windowSize.y);
    //vec2 convertedPix = normal.xy * screenConvert;

    //vec4 clip = u_matrix * vec4(position, 1.0);
    //gl_Position = vec4(clip.xyz + vec3(clip.w * convertedPix, 0.0), clip.w);
    
    //gl_Position = u_matrix * vec4(position + normal * 0.01, 1.0);
    
    vec2 onePixel = vec2(1.0 / u_windowSize.x, 1.0 / u_windowSize.y) * normalize(a_normal.xy) * 2.0;
    vec4 clip = u_matrix * vec4(position, 1.0);
    gl_Position = vec4(clip.xyz + vec3(clip.w * onePixel, 0.0), clip.w);
    
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
#extension GL_OES_standard_derivatives : enable
#define SMOOTHLIGHT
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
  
  float lum[5];
  lum[0]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).xyz, rgb2lum);
  lum[1]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 0)).xyz, rgb2lum);
  lum[2]=dot(currColor.xyz, rgb2lum);
  lum[3]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).xyz, rgb2lum);
  lum[4]=dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0,-1)).xyz, rgb2lum);
  
  //[0,1,2]   [-,0,+]   [-,-,-]
  //[3,4,5]   [-,0,+]   [0,0,0]
  //[6,7,8]   [-,0,+]   [+,+,+]
  
  //float x = -lum[0]-lum[3]-lum[6]+lum[2]+lum[5]+lum[8];
  //float y = -lum[0]-lum[1]-lum[3]+lum[6]+lum[7]+lum[8];
  float colorEdgeHorizontal = lum[0]-lum[2]*2.0+lum[4];
  float colorEdgeVertical = lum[1]-lum[2]*2.0+lum[3];
  float colorEdge = max(colorEdgeHorizontal, colorEdgeVertical);
  //= lum[1]+lum[3]-lum[4]*4.0+lum[5]+lum[7];
  // = lum[0]+lum[1]+lum[2]+lum[3]-lum[4]*8.0+lum[5]+lum[6]+lum[7]+lum[8]; //Woot woot!
  
  vec3 v_normal = texture2D(u_normalsTex, v_texcoord).xyz;
  
  vec3 a =
      max(
        -(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 0.0, 1.0)).xyz)
        -(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 0.0,-1.0)).xyz)
        +v_normal * 2.0,
        -(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1.0, 0.0)).xyz)
        -(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 1.0, 0.0)).xyz)
        +v_normal * 2.0
        );
        
  colorEdge = 1.0 - clamp(colorEdge, 0.0, 1.0);
  float normalsSum = 1.3 - clamp(a.x+a.y+a.z, 0.3, 1.0); //Better?

  float light = dot(v_normal * 2.0 - 1.0, normalize(u_light));
  #ifdef SMOOTHLIGHT
  float E = fwidth(light);
  light = light > 0.3 + E? 0.3 : 
    light < 0.3 - E? 0.5 : mix(0.5, 0.3, smoothstep(0.3 - E, 0.3 + E, light));
  #else
  light = light <= 1.0/13.0 ? 0.5 : 0.3;
  #endif

  vec3 src = currColor.xyz;//ceil(currColor.xyz * 10.0) / 10.0; //floor
  
  
  #ifdef DOTS
  // Distance to nearest point in a grid of
    // (frequency x frequency) points over the unit square
    vec2 frequency = u_windowSize*0.2;
    vec2 nearest = 2.0*fract(frequency * v_texcoord * mat2(0.707, -0.707, 0.707, 0.707)) - 1.0;
    float dist = length(nearest);
    #ifdef SHADOW_ONLY_DOTS
    float radius = 1.5 * (1.0 - dot(src,vec3(0.30, 0.59, 0.11)) * 2.5 * light * colorEdge * currColor.w * normalsSum);
    #else
    float radius = 1.5 * dot(1.0 - src * 2.0 * light * colorEdge * currColor.w * normalsSum,vec3(0.30, 0.59, 0.11));
    #endif
    
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 black = vec3(0.0, 0.0, 0.0);
    float afwidth = 0.7 * length(vec2(dFdx(dist), dFdy(dist)));
    vec3 fragcolor = mix(black, white, 
                         smoothstep(radius-afwidth, radius+afwidth, dist)
                        );
    gl_FragColor = vec4(fragcolor
    #ifdef SHADOW_ONLY_DOTS
    * step(0.2,dot(src,vec3(0.30, 0.59, 0.11)))
    #endif
    , 1.0);
    
  #else
  //gl_FragColor = vec4(src * 2.0 * light * colorEdge * normalsSum, colorEdge * normalsSum);
  gl_FragColor = vec4(src * 2.0 * light, colorEdge * currColor.w * normalsSum);
  #endif
  //if(light > 0.5){
  //gl_FragColor = vec4((1.0 - 2.0 * (1.0 - light) * (1.0 - src.y)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.z)),1);
}`;

//Post process thicken lines

var ppThickenVShader = `
attribute vec2 a_coordinate;
varying vec2 v_texcoord;

void main(void) {
  gl_Position = vec4(a_coordinate, 0.0, 1.0);
  v_texcoord = (a_coordinate + 1.0) / 2.0;
}
`;

var ppThickenFShader = `
precision mediump float;
varying vec2 v_texcoord;
uniform vec2 u_windowSize;
uniform sampler2D u_texture;

void main(void) {
  vec2 onePixel = vec2(1.0)/u_windowSize;
  vec4 currColor = texture2D(u_texture, v_texcoord);
  float nearBy = min(texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).w, 
  texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).w);
  gl_FragColor = vec4(currColor.xyz, nearBy * currColor.w);
}`;


//Post process anti alias

var ppAAVShader = `
attribute vec2 a_coordinate;
varying vec2 v_texcoord;

void main(void) {
  gl_Position = vec4(a_coordinate, 0.0, 1.0);
  v_texcoord = (a_coordinate + 1.0) / 2.0;
}
`;

var ppAAFShader = `
#define ANTIALIAS1
precision mediump float;
varying vec2 v_texcoord;
uniform vec2 u_windowSize;
uniform sampler2D u_texture;

void main(void) {
    vec2 onePixel = vec2(1.0)/u_windowSize;
  vec4 currColor = texture2D(u_texture, v_texcoord);

#ifdef ANTIALIAS1
  vec2 vPixelViewport = onePixel;

float fScale = 1.4;

// Offset coordinates
vec2 upOffset = vec2( 0, vPixelViewport.y ) * fScale;
vec2 rightOffset = vec2( vPixelViewport.x, 0 ) * fScale;

float topHeight =  texture2D( u_texture, v_texcoord + upOffset).w;
float bottomHeight =  texture2D( u_texture, v_texcoord - upOffset).w;
float rightHeight =  texture2D( u_texture, v_texcoord + rightOffset).w;
float leftHeight =  texture2D( u_texture, v_texcoord - rightOffset).w;
float leftTopHeight =  texture2D( u_texture, v_texcoord - rightOffset + upOffset).w;
float leftBottomHeight =  texture2D( u_texture, v_texcoord - rightOffset - upOffset).w;
float rightBottomHeight =  texture2D( u_texture, v_texcoord + rightOffset + upOffset).w;
float rightTopHeight =  texture2D( u_texture, v_texcoord + rightOffset - upOffset).w;
  
// Normal map creation
float sum0 = rightTopHeight+ topHeight + rightBottomHeight;
float sum1 = leftTopHeight + bottomHeight + leftBottomHeight;
float sum2 = leftTopHeight + leftHeight + topHeight;
float sum3 = leftBottomHeight + rightHeight + rightBottomHeight;

float vec1 = (sum1 - sum0);
float vector2 = (sum2 - sum3);

// Put them together and scale.
vec2 Normal = vec2( vec1, vector2) * vPixelViewport * fScale;

// Color
vec4 Scene0 = currColor;
vec4 Scene1 = texture2D( u_texture, v_texcoord + Normal.xy );
vec4 Scene2 = texture2D( u_texture, v_texcoord - Normal.xy );
vec4 Scene3 = texture2D( u_texture, v_texcoord + vec2(Normal.x, -Normal.y) * 0.5 );
vec4 Scene4 = texture2D( u_texture, v_texcoord - vec2(Normal.x, -Normal.y) * 0.5 );
vec4 finally = (Scene0 + Scene1 + Scene2 + Scene3 + Scene4) * 0.2;
// Final color
gl_FragColor = finally * pow(finally.w,1.5);
  
  
#else
  
  //Blur?
  float nearBy =
  -texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).w -
  texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 0)).w -
  texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).w -
  texture2D(u_texture, v_texcoord + onePixel * vec2( 0,-1)).w + 4.0;
  
  //(1.0-nearBy/4.0) -> nearBy is in the range 0 - 1 and shows the brightness
  //float darkness = 1.0 - clamp(nearBy/2.0 * 0.4 + (1.0-currColor.w) * 0.6, 0.0, 1.0); //Also works
  nearBy = 1.0-nearBy/4.0;
  //2 adj -> 50% or less
  
  //If something is near by
  //TODO pow()?
  gl_FragColor = vec4(currColor.xyz * pow(nearBy * (1.0-(1.0-currColor.w)*0.5), 2.0),1.0);//* (nearBy) + currColor.xyz * (1.0 - nearBy),1.0);
 #endif 
  //blur = vec3(1.0,0,0);
  //blur = blur * (currColor.w / 2.0 + 0.5);
  //blur *= (currColor.w * (1.0 - 0.2)) + 0.2;
  
  
}`;


/**


precision mediump float;
varying vec2 v_texcoord;
uniform vec2 u_windowSize;
uniform sampler2D u_texture;

void main(void) {
  vec2 onePixel = vec2(1.0)/u_windowSize;
  vec4 currColor = texture2D(u_texture, v_texcoord);
  
  
  //Blur?
  float nearBy =
  -texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).w -
  texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 0)).w -
  texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).w -
  texture2D(u_texture, v_texcoord + onePixel * vec2( 0,-1)).w + 4.0;
  float darkness = nearBy/4.0 + (0.8-currColor.w * 0.8);
  darkness = clamp(darkness,0.0,1.0);
  //#ifdef BLUR
  //nearBy += 1.0;
  //#endif
  //nearBy = clamp(nearBy, 0.0, 1.0);
  //nearBy = nearBy + currColor.w;
  
  vec3 blur=texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 1)).xyz+
  texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).xyz+
  texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 1)).xyz+
  texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 0)).xyz+
  currColor.xyz+
  texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).xyz+
  texture2D(u_texture, v_texcoord + onePixel * vec2(-1,-1)).xyz+
  texture2D(u_texture, v_texcoord + onePixel * vec2( 0,-1)).xyz+
  texture2D(u_texture, v_texcoord + onePixel * vec2( 1,-1)).xyz;
  
  blur = blur / vec3(9.0);
  
  //If something is near by
  //(1.0-nearBy/4.0) -> nearBy is in the range 0 - 1 and shows the brightness (Nope?)

   gl_FragColor = vec4(darkness,0,0,1.0);//* (nearBy) + currColor.xyz * (1.0 - nearBy),1.0);

  
  //blur = vec3(1.0,0,0);
  //blur = blur * (currColor.w / 2.0 + 0.5);
  //blur *= (currColor.w * (1.0 - 0.2)) + 0.2;
  
  
}


*/
//#extension GL_OES_standard_derivatives : enable
