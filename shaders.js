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
#define COLORFXAA
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

  float colorEdge =
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, -1)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 0)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 1)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0,-1)).xyz,rgb2lum)
  
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1,-1)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 1)).xyz,rgb2lum)
  +dot(currColor.xyz,rgb2lum) * 8.0;

  vec3 v_normal = texture2D(u_normalsTex, v_texcoord).xyz;
  float normalsEdge =
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1, -1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1, 0)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1, 1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 0,-1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 0, 1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 1,-1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 1, 0)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 1, 1)).xyz,rgb2lum)
  +dot(v_normal,rgb2lum) * 8.0;

  float light = dot(v_normal * 2.0 - 1.0, normalize(u_light));
  float darkness = pow((1.0 - clamp(-colorEdge,0.0,1.0) - clamp(normalsEdge,0.1,1.0) + 0.1) * currColor.w,2.0);
  
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
    float radius = 1.5 * (1.0 - dot(src,vec3(0.30, 0.59, 0.11)) * 2.5 * light * darkness);
    #else
    float radius = 1.5 * dot(1.0 - src * 2.0 * light * darkness,vec3(0.30, 0.59, 0.11));
    #endif
    
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 black = vec3(0.0, 0.0, 0.0);
    float afwidth = 0.7 * length(vec2(dFdx(dist), dFdy(dist)));
    vec3 fragcolor = mix(black, white, 
                         smoothstep(radius-afwidth, radius+afwidth, dist)
                        );
    #ifdef DOTSFXAA
    gl_FragColor = vec4(vec3(1)
        #ifdef SHADOW_ONLY_DOTS
        * step(0.2,dot(src,vec3(0.30, 0.59, 0.11)))
        #endif
      , fragcolor);
    #else
    gl_FragColor = vec4(fragcolor
        #ifdef SHADOW_ONLY_DOTS
        * step(0.2,dot(src,vec3(0.30, 0.59, 0.11)))
        #endif
      , 1.0);
    #endif
    
  #else
    #ifdef COLORFXAA
      gl_FragColor = vec4(src * 2.0 * light,  darkness);
    #else
      gl_FragColor = vec4(src * 2.0 * light * darkness,  1.0);
    #endif
  #endif
  
  //if(light > 0.5){
  //gl_FragColor = vec4((1.0 - 2.0 * (1.0 - light) * (1.0 - src.y)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.z)),1);
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
precision mediump float;
varying vec2 v_texcoord;
uniform vec2 u_windowSize;
uniform sampler2D u_texture;
#define FXAA_SPAN_MAX 8.0
#define FXAA_REDUCE_MUL   (1.0/FXAA_SPAN_MAX)
#define FXAA_REDUCE_MIN   (1.0/128.0)
#define FXAA_SUBPIX_SHIFT (1.0/4.0)

//w only FXAA
vec3 FxaaPixelShader( vec4 uv, sampler2D tex, vec2 rcpFrame) {
    
    float rgbNW = texture2D(tex, uv.zw).w;
    float rgbNE = texture2D(tex, uv.zw + vec2(1,0)*rcpFrame.xy).w;
    float rgbSW = texture2D(tex, uv.zw + vec2(0,1)*rcpFrame.xy).w;
    float rgbSE = texture2D(tex, uv.zw + vec2(1,1)*rcpFrame.xy).w;
    float rgbM  = texture2D(tex, uv.xy).w;

    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = (rgbNW);
    float lumaNE = (rgbNE );
    float lumaSW = (rgbSW );
    float lumaSE = (rgbSE );
    float lumaM  = (rgbM  );

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max(
        (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
        FXAA_REDUCE_MIN);
    float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);
    
    dir = min(vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),
          max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
          dir * rcpDirMin)) * rcpFrame.xy;

    vec4 rgbA = (1.0/2.0) * (
        texture2D(tex, uv.xy + dir * (1.0/3.0 - 0.5)) +
        texture2D(tex, uv.xy + dir * (2.0/3.0 - 0.5)));
    vec4 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (
        texture2D(tex, uv.xy + dir * (0.0/3.0 - 0.5)) +
        texture2D(tex, uv.xy + dir * (3.0/3.0 - 0.5)));
    
    float lumaB = rgbB.w;

    if((lumaB < lumaMin) || (lumaB > lumaMax)) return rgbA.xyz * rgbA.w;
    
    return rgbB.xyz * rgbB.w; 
}
void main(void) {
  vec2 texXY = v_texcoord;
  vec2 onePixel = vec2(1.0)/u_windowSize;
  vec4 currColor = texture2D(u_texture, texXY);

  vec4 uv = vec4( texXY, texXY - (onePixel * (0.5 + FXAA_SUBPIX_SHIFT)));
gl_FragColor = vec4(
    FxaaPixelShader( uv, u_texture, onePixel )
,1.0);
  
  //gl_FragColor = vec4(currColor.xyz,1.0);//* (nearBy) + currColor.xyz * (1.0 - nearBy),1.0);
  //blur = vec3(1.0,0,0);
  //blur = blur * (currColor.w / 2.0 + 0.5);
  //blur *= (currColor.w * (1.0 - 0.2)) + 0.2;
  
}`;


//#extension GL_OES_standard_derivatives : enable


/* Color FXAA
vec3 FxaaPixelShader( vec4 uv, sampler2D tex, vec2 rcpFrame) {
    
    vec3 rgbNW = texture2D(tex, uv.zw).xyz;
    vec3 rgbNE = texture2D(tex, uv.zw + vec2(1,0)*rcpFrame.xy).xyz;
    vec3 rgbSW = texture2D(tex, uv.zw + vec2(0,1)*rcpFrame.xy).xyz;
    vec3 rgbSE = texture2D(tex, uv.zw + vec2(1,1)*rcpFrame.xy).xyz;
    vec3 rgbM  = texture2D(tex, uv.xy).xyz;

    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM  = dot(rgbM,  luma);

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max(
        (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
        FXAA_REDUCE_MIN);
    float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);
    
    dir = min(vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),
          max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
          dir * rcpDirMin)) * rcpFrame.xy;

    vec3 rgbA = (1.0/2.0) * (
        texture2D(tex, uv.xy + dir * (1.0/3.0 - 0.5)).xyz +
        texture2D(tex, uv.xy + dir * (2.0/3.0 - 0.5)).xyz);
    vec3 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (
        texture2D(tex, uv.xy + dir * (0.0/3.0 - 0.5)).xyz +
        texture2D(tex, uv.xy + dir * (3.0/3.0 - 0.5)).xyz);
    
    float lumaB = dot(rgbB, luma);

    if((lumaB < lumaMin) || (lumaB > lumaMax)) return rgbA;
    
    return rgbB; 
}
*/