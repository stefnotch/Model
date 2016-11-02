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

    
    vec2 onePixel = vec2(1.0 / u_windowSize.x, 1.0 / u_windowSize.y);
    if(abs(normal.x) > abs(normal.y)){
        onePixel *= vec2(sign(normal.x) * 2.0,0.0);
    } else {
        onePixel *=vec2(0.0,sign(normal.y)*2.0);
    }
    
    //vec2 onePixel = vec2(1.0 / u_windowSize.x, 1.0 / u_windowSize.y) * normalize(normal.xy) * 2.0;
    vec4 clip = u_matrix * vec4(position, 1.0);
    //clip.z += 0.1; //Bias, dirty hack but works (Prevents z buffer fighting between the front and back face)
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

  blendDQ[0] = (a_boneWeight)*u_bones[(2*int(a_bone.x + a_normal * 0.00001) + 0)];
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
  gl_Position = u_matrix * vec4(position, 1.0);
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

var depthVShader = `
attribute vec3 a_coordinate;
attribute vec2 a_bone;
attribute float a_boneWeight;
uniform mat4 u_matrix; //The Matrix!
uniform vec4 u_bones[113 * 2]; //Bones that can be moved

void main(void){

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

  //Matrix multiplication order!
  gl_Position = u_matrix * vec4(position, 1.0);
}`;

var depthShader = `
precision mediump float;

void main() {
    gl_FragColor = vec4(0,0,0, 1);  //The GPU is going to ignore this
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
  v_texcoord = (a_coordinate + 1.0) * 0.5;
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

vec3 desaturate(vec3 color, float amount)
{
    vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), color));
    return mix(color, gray, amount);
}

void main(void) {
  vec2 onePixel = vec2(1.0)/u_windowSize;
  vec4 currColor = texture2D(u_texture, v_texcoord);
  vec3 rgb2lum = vec3(0.30, 0.59, 0.11);

  float colorEdge =
  //-dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, -1)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 0)).xyz,rgb2lum)
  //-dot(texture2D(u_texture, v_texcoord + onePixel * vec2(-1, 1)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0,-1)).xyz,rgb2lum)
  
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 0, 1)).xyz,rgb2lum)
  //-dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1,-1)).xyz,rgb2lum)
  -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 0)).xyz,rgb2lum)
 // -dot(texture2D(u_texture, v_texcoord + onePixel * vec2( 1, 1)).xyz,rgb2lum)
  +dot(currColor.xyz,rgb2lum) * 4.0;

  vec3 v_normal = texture2D(u_normalsTex, v_texcoord).xyz;
  float normalsEdge =
  //-dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1, -1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1, 0)).xyz,rgb2lum)
  //-dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2(-1, 1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 0,-1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 0, 1)).xyz,rgb2lum)
  //-dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 1,-1)).xyz,rgb2lum)
  -dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 1, 0)).xyz,rgb2lum)
  //-dot(texture2D(u_normalsTex, v_texcoord + onePixel * vec2( 1, 1)).xyz,rgb2lum)
  +dot(v_normal,rgb2lum) * 4.0;

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
      gl_FragColor = vec4(src * 2.0 * light * darkness,  1.0);
    #else
    //desaturate(src * 2.0 * light,-0.4)
      //gl_FragColor = vec4(src * 2.0 * light,  darkness);
      gl_FragColor = vec4(desaturate(src * 2.0 * light,-0.2), darkness);
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
  v_texcoord = (a_coordinate + 1.0) * 0.5;
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
#define FXAA_SUBPIX_SHIFT (1.0/8.0)

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

/**
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


/* FXAA 3.11
vec4 FxaaPixelShader(
    //
    // Use noperspective interpolation here (turn off perspective interpolation).
    // {xy} = center of pixel
    vec2 pos,
    //
    // Used only for FXAA Console, and not used on the 360 version.
    // Use noperspective interpolation here (turn off perspective interpolation).
    // {xy__} = upper left of pixel
    // {__zw} = lower right of pixel
    vec4 fxaaConsolePosPos,
    //
    // Input color texture.
    // {rgb_} = color in linear or perceptual color space
    // if (FXAA_GREEN_AS_LUMA == 0)
    //     {___a} = luma in perceptual color space (not linear)
    sampler2D tex,
    //
    // Only used on the optimized 360 version of FXAA Console.
    // For everything but 360, just use the same input here as for "tex".
    // For 360, same texture, just alias with a 2nd sampler.
    // This sampler needs to have an exponent bias of -1.
    sampler2D fxaaConsole360TexExpBiasNegOne,
    //
    // Only used on the optimized 360 version of FXAA Console.
    // For everything but 360, just use the same input here as for "tex".
    // For 360, same texture, just alias with a 3nd sampler.
    // This sampler needs to have an exponent bias of -2.
    sampler2D fxaaConsole360TexExpBiasNegTwo,
    //
    // Only used on FXAA Quality.
    // This must be from a constant/uniform.
    // {x_} = 1.0/screenWidthInPixels
    // {_y} = 1.0/screenHeightInPixels
    vec2 fxaaQualityRcpFrame,
    //
    // Only used on FXAA Console.
    // This must be from a constant/uniform.
    // This effects sub-pixel AA quality and inversely sharpness.
    //   Where N ranges between,
    //     N = 0.50 (default)
    //     N = 0.33 (sharper)
    // {x___} = -N/screenWidthInPixels  
    // {_y__} = -N/screenHeightInPixels
    // {__z_} =  N/screenWidthInPixels  
    // {___w} =  N/screenHeightInPixels 
    vec4 fxaaConsoleRcpFrameOpt,
    //
    // Only used on FXAA Console.
    // Not used on 360, but used on PS3 and PC.
    // This must be from a constant/uniform.
    // {x___} = -2.0/screenWidthInPixels  
    // {_y__} = -2.0/screenHeightInPixels
    // {__z_} =  2.0/screenWidthInPixels  
    // {___w} =  2.0/screenHeightInPixels 
    vec4 fxaaConsoleRcpFrameOpt2,
    //
    // Only used on FXAA Console.
    // Only used on 360 in place of fxaaConsoleRcpFrameOpt2.
    // This must be from a constant/uniform.
    // {x___} =  8.0/screenWidthInPixels  
    // {_y__} =  8.0/screenHeightInPixels
    // {__z_} = -4.0/screenWidthInPixels  
    // {___w} = -4.0/screenHeightInPixels 
    vec4 fxaaConsole360RcpFrameOpt2,
    //
    // Only used on FXAA Quality.
    // This used to be the FXAA_QUALITY__SUBPIX define.
    // It is here now to allow easier tuning.
    // Choose the amount of sub-pixel aliasing removal.
    // This can effect sharpness.
    //   1.00 - upper limit (softer)
    //   0.75 - default amount of filtering
    //   0.50 - lower limit (sharper, less sub-pixel aliasing removal)
    //   0.25 - almost off
    //   0.00 - completely off
    float fxaaQualitySubpix,
    //
    // Only used on FXAA Quality.
    // This used to be the FXAA_QUALITY__EDGE_THRESHOLD define.
    // It is here now to allow easier tuning.
    // The minimum amount of local contrast required to apply algorithm.
    //   0.333 - too little (faster)
    //   0.250 - low quality
    //   0.166 - default
    //   0.125 - high quality 
    //   0.063 - overkill (slower)
    float fxaaQualityEdgeThreshold,
    //
    // Only used on FXAA Quality.
    // This used to be the FXAA_QUALITY__EDGE_THRESHOLD_MIN define.
    // It is here now to allow easier tuning.
    // Trims the algorithm from processing darks.
    //   0.0833 - upper limit (default, the start of visible unfiltered edges)
    //   0.0625 - high quality (faster)
    //   0.0312 - visible limit (slower)
    // Special notes when using FXAA_GREEN_AS_LUMA,
    //   Likely want to set this to zero.
    //   As colors that are mostly not-green
    //   will appear very dark in the green channel!
    //   Tune by looking at mostly non-green content,
    //   then start at zero and increase until aliasing is a problem.
    float fxaaQualityEdgeThresholdMin,
    // 
    // Only used on FXAA Console.
    // This used to be the FXAA_CONSOLE__EDGE_SHARPNESS define.
    // It is here now to allow easier tuning.
    // This does not effect PS3, as this needs to be compiled in.
    //   Use FXAA_CONSOLE__PS3_EDGE_SHARPNESS for PS3.
    //   Due to the PS3 being ALU bound,
    //   there are only three safe values here: 2 and 4 and 8.
    //   These options use the shaders ability to a free *|/ by 2|4|8.
    // For all other platforms can be a non-power of two.
    //   8.0 is sharper (default!!!)
    //   4.0 is softer
    //   2.0 is really soft (good only for vector graphics inputs)
    float fxaaConsoleEdgeSharpness,
    //
    // Only used on FXAA Console.
    // This used to be the FXAA_CONSOLE__EDGE_THRESHOLD define.
    // It is here now to allow easier tuning.
    // This does not effect PS3, as this needs to be compiled in.
    //   Use FXAA_CONSOLE__PS3_EDGE_THRESHOLD for PS3.
    //   Due to the PS3 being ALU bound,
    //   there are only two safe values here: 1/4 and 1/8.
    //   These options use the shaders ability to a free *|/ by 2|4|8.
    // The console setting has a different mapping than the quality setting.
    // Other platforms can use other values.
    //   0.125 leaves less aliasing, but is softer (default!!!)
    //   0.25 leaves more aliasing, and is sharper
    float fxaaConsoleEdgeThreshold,
    //
    // Only used on FXAA Console.
    // This used to be the FXAA_CONSOLE__EDGE_THRESHOLD_MIN define.
    // It is here now to allow easier tuning.
    // Trims the algorithm from processing darks.
    // The console setting has a different mapping than the quality setting.
    // This only applies when FXAA_EARLY_EXIT is 1.
    // This does not apply to PS3, 
    // PS3 was simplified to avoid more shader instructions.
    //   0.06 - faster but more aliasing in darks
    //   0.05 - default
    //   0.04 - slower and less aliasing in darks
    // Special notes when using FXAA_GREEN_AS_LUMA,
    //   Likely want to set this to zero.
    //   As colors that are mostly not-green
    //   will appear very dark in the green channel!
    //   Tune by looking at mostly non-green content,
    //   then start at zero and increase until aliasing is a problem.
    float fxaaConsoleEdgeThresholdMin,
    //    
    // Extra constants for 360 FXAA Console only.
    // Use zeros or anything else for other platforms.
    // These must be in physical constant registers and NOT immedates.
    // Immedates will result in compiler un-optimizing.
    // {xyzw} = float4(1.0, -1.0, 0.25, -0.25)
    vec4 fxaaConsole360ConstDir
) {
    vec2 posM;
    posM.x = pos.x;
    posM.y = pos.y;
        vec4 rgbyM = texture2DLod(tex, posM, 0.0);
        float lumaS = FxaaLuma(texture2DLod(tex, posM + (ivec2( 0, 1) * fxaaQualityRcpFrame.xy), 0.0));
        float lumaE = FxaaLuma(texture2DLod(tex, posM + (ivec2( 1, 0) * fxaaQualityRcpFrame.xy), 0.0));
        float lumaN = FxaaLuma(texture2DLod(tex, posM + (ivec2( 0,-1) * fxaaQualityRcpFrame.xy), 0.0));
        float lumaW = FxaaLuma(texture2DLod(tex, posM + (ivec2(-1, 0) * fxaaQualityRcpFrame.xy), 0.0));
    float maxSM = max(lumaS, rgbyM.w);
    float minSM = min(lumaS, rgbyM.w);
    float maxESM = max(lumaE, maxSM);
    float minESM = min(lumaE, minSM);
    float maxWN = max(lumaN, lumaW);
    float minWN = min(lumaN, lumaW);
    float rangeMax = max(maxWN, maxESM);
    float rangeMin = min(minWN, minESM);
    float rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;
    float range = rangeMax - rangeMin;
    float rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);
    bool earlyExit = range < rangeMaxClamped;
    if(earlyExit)
            return rgbyM;
        float lumaNW = FxaaLuma(texture(tex, posM + (ivec2(-1,-1) * fxaaQualityRcpFrame.xy)));
        float lumaSE = FxaaLuma(texture(tex, posM + (ivec2( 1, 1) * fxaaQualityRcpFrame.xy)));
        float lumaNE = FxaaLuma(texture(tex, posM + (ivec2( 1,-1) * fxaaQualityRcpFrame.xy)));
        float lumaSW = FxaaLuma(texture(tex, posM + (ivec2(-1, 1) * fxaaQualityRcpFrame.xy)));
    float lumaNS = lumaN + lumaS;
    float lumaWE = lumaW + lumaE;
    float subpixRcpRange = 1.0/range;
    float subpixNSWE = lumaNS + lumaWE;
    float edgeHorz1 = (-2.0 * rgbyM.w) + lumaNS;
    float edgeVert1 = (-2.0 * rgbyM.w) + lumaWE;
    float lumaNESE = lumaNE + lumaSE;
    float lumaNWNE = lumaNW + lumaNE;
    float edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
    float edgeVert2 = (-2.0 * lumaN) + lumaNWNE;
    float lumaNWSW = lumaNW + lumaSW;
    float lumaSWSE = lumaSW + lumaSE;
    float edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
    float edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
    float edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
    float edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
    float edgeHorz = abs(edgeHorz3) + edgeHorz4;
    float edgeVert = abs(edgeVert3) + edgeVert4;
    float subpixNWSWNESE = lumaNWSW + lumaNESE;
    float lengthSign = fxaaQualityRcpFrame.x;
    bool horzSpan = edgeHorz >= edgeVert;
    float subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;
    if(!horzSpan) lumaN = lumaW;
    if(!horzSpan) lumaS = lumaE;
    if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;
    float subpixB = (subpixA * (1.0/12.0)) - rgbyM.w;
    float gradientN = lumaN - rgbyM.w;
    float gradientS = lumaS - rgbyM.w;
    float lumaNN = lumaN + rgbyM.w;
    float lumaSS = lumaS + rgbyM.w;
    bool pairN = abs(gradientN) >= abs(gradientS);
    float gradient = max(abs(gradientN), abs(gradientS));
    if(pairN) lengthSign = -lengthSign;
    float subpixC = clamp(abs(subpixB) * subpixRcpRange, 0.0, 1.0);
    vec2 posB;
    posB.x = posM.x;
    posB.y = posM.y;
    vec2 offNP;
    offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
    offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;
    if(!horzSpan) posB.x += lengthSign * 0.5;
    if( horzSpan) posB.y += lengthSign * 0.5;
    vec2 posN;
    posN.x = posB.x - offNP.x * 1.0;
    posN.y = posB.y - offNP.y * 1.0;
    vec2 posP;
    posP.x = posB.x + offNP.x * 1.0;
    posP.y = posB.y + offNP.y * 1.0;
    float subpixD = ((-2.0)*subpixC) + 3.0;
    float lumaEndN = FxaaLuma(texture2DLod(tex, posN, 0.0));
    float subpixE = subpixC * subpixC;
    float lumaEndP = FxaaLuma(texture2DLod(tex, posP, 0.0));
    if(!pairN) lumaNN = lumaSS;
    float gradientScaled = gradient * 1.0/4.0;
    float lumaMM = rgbyM.w - lumaNN * 0.5;
    float subpixF = subpixD * subpixE;
    bool lumaMLTZero = lumaMM < 0.0;
    lumaEndN -= lumaNN * 0.5;
    lumaEndP -= lumaNN * 0.5;
    bool doneN = abs(lumaEndN) >= gradientScaled;
    bool doneP = abs(lumaEndP) >= gradientScaled;
    if(!doneN) posN.x -= offNP.x * 1.5;
    if(!doneN) posN.y -= offNP.y * 1.5;
    bool doneNP = (!doneN) || (!doneP);
    if(!doneP) posP.x += offNP.x * 1.5;
    if(!doneP) posP.y += offNP.y * 1.5;
    if(doneNP) {
        if(!doneN) lumaEndN = FxaaLuma(texture2DLod(tex, posN.xy, 0.0));
        if(!doneP) lumaEndP = FxaaLuma(texture2DLod(tex, posP.xy, 0.0));
        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
        doneN = abs(lumaEndN) >= gradientScaled;
        doneP = abs(lumaEndP) >= gradientScaled;
        if(!doneN) posN.x -= offNP.x * 2.0;
        if(!doneN) posN.y -= offNP.y * 2.0;
        doneNP = (!doneN) || (!doneP);
        if(!doneP) posP.x += offNP.x * 2.0;
        if(!doneP) posP.y += offNP.y * 2.0;
        if(doneNP) {
            if(!doneN) lumaEndN = FxaaLuma(texture2DLod(tex, posN.xy, 0.0));
            if(!doneP) lumaEndP = FxaaLuma(texture2DLod(tex, posP.xy, 0.0));
            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
            doneN = abs(lumaEndN) >= gradientScaled;
            doneP = abs(lumaEndP) >= gradientScaled;
            if(!doneN) posN.x -= offNP.x * 4.0;
            if(!doneN) posN.y -= offNP.y * 4.0;
            doneNP = (!doneN) || (!doneP);
            if(!doneP) posP.x += offNP.x * 4.0;
            if(!doneP) posP.y += offNP.y * 4.0;
            if(doneNP) {
                if(!doneN) lumaEndN = FxaaLuma(texture2DLod(tex, posN.xy, 0.0));
                if(!doneP) lumaEndP = FxaaLuma(texture2DLod(tex, posP.xy, 0.0));
                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                doneN = abs(lumaEndN) >= gradientScaled;
                doneP = abs(lumaEndP) >= gradientScaled;
                if(!doneN) posN.x -= offNP.x * 12.0;
                if(!doneN) posN.y -= offNP.y * 12.0;
                doneNP = (!doneN) || (!doneP);
                if(!doneP) posP.x += offNP.x * 12.0;
                if(!doneP) posP.y += offNP.y * 12.0;
            }
        }
    }
    float dstN = posM.x - posN.x;
    float dstP = posP.x - posM.x;
    if(!horzSpan) dstN = posM.y - posN.y;
    if(!horzSpan) dstP = posP.y - posM.y;
    bool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
    float spanLength = (dstP + dstN);
    bool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
    float spanLengthRcp = 1.0/spanLength;
    bool directionN = dstN < dstP;
    float dst = min(dstN, dstP);
    bool goodSpan = directionN ? goodSpanN : goodSpanP;
    float subpixG = subpixF * subpixF;
    float pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
    float subpixH = subpixG * fxaaQualitySubpix;
    float pixelOffsetGood = goodSpan ? pixelOffset : 0.0;
    float pixelOffsetSubpix = max(pixelOffsetGood, subpixH);
    if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;
    if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;
        return vec4(texture2D(tex, posM).xyz, rgbyM.w);
    }
*/