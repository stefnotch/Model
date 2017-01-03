/*
git commit -am "your message goes here"
git push
*/

/*global bones pickPixel animations */
/*global normalsVShader normalsFShader*/
/*global initSidebar rigging outlines*/

//cgc -entry dqsFast -profile glslv -profileopts version=120 C:\Users\stefan\Downloads\Skinning\test.cg
//https://www.opengl.org/wiki/Performance
//http://webglfundamentals.org/webgl/lessons/webgl-2-textures.html
//https://docs.google.com/presentation/d/12AGAUmElB0oOBgbEEBfhABkIMCL3CUX7kdAPLuwZ964/edit#slide=id.i51
//https://hacks.mozilla.org/2014/03/introducing-the-canvas-debugger-in-firefox-developer-tools/
/*TODO
Edit the texture at runtime (Color and edge detection)
Matrix multiplication library, they are doing everything that I can do, and better
bones:
https://www.cs.utah.edu/~ladislav/kavan05spherical/kavan05spherical.pdf (Spherical Blend Skinning)
http://image.diku.dk/projects/media/kasper.amstrup.andersen.07.pdf (Has source code!!!!)
http://www.opentissue.org/svn/OpenTissue/development/kasper/OpenTissue/kinematics/skinning/sbs/ (This be source code)

http://catalog.lib.kyushu-u.ac.jp/handle/2324/1430821/p147.pdf (Swing-twist deformers)

https://www.scss.tcd.ie/publications/tech-reports/reports.06/TCD-CS-2006-46.pdf (Bettah, but older)
https://www.cs.utah.edu/~ladislav/kavan08geometric/kavan08geometric.pdf (Bettah than the rest?)
Links about the bettah thingy:
https://web.archive.org/web/20070311225627/http://isg.cs.tcd.ie/projects/DualQuaternions/

Rotating light source
hide object upon click
USE gl.readPixels and apply an edge detection shader to all textures prefixed with l_
Apply a sharpen shader to all textures prefixed with s_
Triangles that make up the valleys are inside the model. (The ends of the spikes are inside the model)
Don't switch shaders as often
https://sourceforge.net/p/assimp/discussion/817654/thread/5462cbf5/

Normalize -> 32 bits (float) to 8 bits (0,1 range)

Webgl 2:
NPOT textures
https://www.opengl.org/wiki/Uniform_Buffer_Object (Tons of uniforms)
Occlusion Queries
No more VAO extension, it is built in!
Multiple Render Targets!!! (Render to multiple textures!!) -> Normals pass
3D textures (For water and such!)
Transform feedback
Floating point textures

*/
/*
quat2 * quat2^-1 == quat2^-1 * quat2 => identity
n = quat2.fromValues(Math.random()*30-15,Math.random()*30-15,Math.random()*30-15,Math.random()*30-15,Math.random()*30-15,Math.random()*30-15,Math.random()*30-15,Math.random()*30-15);
quat2.normalize(n,n);
t = quat2.conjugate(quat2.create(), n);

quat2.str(quat2.mul(quat2.create(), t, n)) + quat2.str(quat2.mul(quat2.create(), n, t));
*/


//Dual quat: What rot-trans means: A point with a rotation
//Pick a point. Now rotate it around the point you just picked (itself)

//Fetch progress
//https://jakearchibald.com/2015/thats-so-fetch/
//http://stackoverflow.com/questions/35711724/progress-indicators-for-fetch (last post)

//Ok, that's so dirty.
function require() {
  return null;
}
var glMatrix, quat2, quat, mat4, vec3;
var setUpRenderer;
if (false) {
  glMatrix = require("./gl-matrix-min.js");
  quat2 = require("./glmatrix/quat2.js");
  quat = require("./glmatrix/quat.js");
  mat4 = require("./glmatrix/mat4.js");
  vec3 = require("./glmatrix/vec3.js");
  setUpRenderer = require("./framebuffers.js");
}


var gl; //WebGL lives in here!
var vaoExt; //Vertex Array Objects extension
var glcanvas; //Our canvas
//Translation
var pos = [-2, 5, 5],
  velocity = [0, 0, 0],
  speed = 0.01;

//Rotation
var pitchRad = -0.23,
  yawRad = -0.33;
var pitchVel = 0,
  yawVel = 0;
var lightRot = [1, -0.5, -0.3];

var objectsToDraw = [];
var boneArray;
var boneMat;

var normalsRenderer;
var mainRenderer;

/**
 * If the mouse selected anything, it will be a value >= 0 otherwise -1
 */
var mouse = {
  clicked: false,
  pressed: false,
  selected: -1,
  X: 0,
  Y: 0
};


var postProcessOutline;
var postProcessObj;
var pickerFramebuffer;
//https://github.com/markaren/DualQuaternion/tree/master/src/main/java/info/laht/dualquat

//Called by the body
function start() {
  //window.onerror
  /*console.log = (s) => {
    alert(s.toString());
  };
  console.info = (s) => {
    alert(s.toString());
  };
  console.warn = (s) => {
    alert(s.toString());
  };*/

  initCanvas("glcanvas");
  initSidebar();
  //Init WebGL
  gl = initWebGL(glcanvas);

  if (gl) {
    // Put the vertex shader and fragment shader together into
    // a complete program
    var shaderProgram = new ShaderProg(vertexShader, fragmentShader); //eslint-disable-line

    Promise.all([
      loadModelFile("Model/lucario/output.modelfile", "Model/lucario", shaderProgram),
      loadModelBones("Model/lucario/outputBones.js")
    ]).then((stuff) => {
      setUpBones();
      boneMat = calculateBones();
      //DO SOMETHING
      glcanvas.style.backgroundColor = "white";
      window.requestAnimationFrame(redraw);
    }).catch((error) => {
      glcanvas.style.backgroundColor = "red";
      throw error;
    });

    //depthRenderer = new depthRenderer(vertexShader,depthShader,renderDepth);
    //setUpPicker();
    pickerFramebuffer = new pixelPicker(pickPixel);
    normalsRenderer = new setUpRenderer(normalsVShader, normalsFShader, renderNormals);
    mainRenderer = new setUpRenderer(celLineVertexShader, `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(0,0,0, 0.0);  // Alpha
    }`, renderMain);

    vaoExt = gl.getExtension("OES_vertex_array_object");
    //Standard derivatives
    gl.getExtension("OES_standard_derivatives");
    postProcessOutline = new setUpRenderer(ppVShader, ppFShader, renderPP);
    postProcessObj = createObjectToDraw("postprocess", new ShaderProg(ppAAVShader, ppAAFShader), [-1, -1,
        1, -1, -1, 1,
        1, 1
      ], [
        ["a_coordinate", 2, false]
      ],
      undefined, undefined
    );

    //Get rid of model, make it easier for the garbage collector

    // Everything we need has now been copied to the graphics
    // hardware, so we can start drawing

    // Clear the drawing surface
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
  }
}

var modelMat = mat4.create(),
  viewMat = mat4.create(),
  projectionMat = mat4.create(),
  mouseProjectionMat = mat4.create();

var r = 0,
  oldMouseX, oldMouseY;

var lookAtQuat = quat.create();
var inverseLookAtQuat = quat.create();
var rotQuat = quat.create();

var oldPitch = 0,
  oldYaw = 0;
/**
 * Draw loop
 */
function redraw() {
  pos[0] += velocity[0] * speed;
  pos[1] += velocity[1] * speed;
  pos[2] += velocity[2] * speed;
  pitchRad += pitchVel;
  yawRad += yawVel;

  //Note to self: Matrix multiplication order is weird.
  //Model mat
  //Translation
  mat4.fromTranslation(modelMat, pos);
  //Rotation
  mat4.rotateY(modelMat, modelMat, yawRad);
  mat4.rotateX(modelMat, modelMat, pitchRad);

  //View mat
  mat4.invert(viewMat, modelMat);
  //Projection mat
  mat4.multiply(projectionMat, mat4.perspective(projectionMat, Math.PI / 4, glcanvas.clientWidth / glcanvas.clientHeight, 0.1, 2000),
    viewMat);

  if (mouse.clicked) {
    mouse.clicked = false;
  }

  if (mouse.pressed) {
    if (mouse.selected == -1) {
      //mouse.X / glcanvas.clientWidth;
      //-mouse.Y / glcanvas.clientHeight;
      mat4.fromTranslation(mouseProjectionMat, [-mouse.X / glcanvas.clientWidth * 2,
        (1 - mouse.Y / glcanvas.clientHeight) * -2,
        0
      ]);
      mat4.multiply(mouseProjectionMat, mouseProjectionMat, projectionMat);
      pickerFramebuffer.pickPixel(objectsToDraw, mouseProjectionMat, boneMat);

      //console.log(`rgba(${pickerFramebuffer.pixel[0]}`);
      if (pickerFramebuffer.pixel[0] == 255) {
        displayText.value = "Nu bones to see here";
      } else {
        displayText.value = bones[pickerFramebuffer.pixel[0]].name;
        displayText.style.backgroundColor = "red";
        mouse.selected = pickerFramebuffer.pixel[0];
        oldMouseX = mouse.X;
        oldMouseY = mouse.Y;
        
        //(parents --> child) --> undo(parents --> child) --> lookat quat (roll) --> redo (parents --> child)
        //Reset the rot quat
        quat.identity(rotQuat);
        //Get the inverse bone quat (parents --> child)
        quat.copy(lookAtQuat, bones[mouse.selected].worldDualQuat[0]);
        quat.conjugate(lookAtQuat, lookAtQuat);
        
        //Rotate it (so that it represents the camera vector)
        quat.rotateY(lookAtQuat, lookAtQuat, yawRad);
        quat.rotateX(lookAtQuat, lookAtQuat, pitchRad);
        //Just for safety
        quat.normalize(lookAtQuat, lookAtQuat);
        //Get the inverse
        quat.copy(inverseLookAtQuat, lookAtQuat);
        quat.conjugate(inverseLookAtQuat, inverseLookAtQuat);

        //TODO
        //https://www.opengl.org/wiki/Compute_eye_space_from_window_space
        //http://www.songho.ca/opengl/files/gl_transform02.png
      }
    } else {
      var mouseVec = vec2.create();
      mouseVec[0] = oldMouseX - mouse.X;
      mouseVec[1] = oldMouseY - mouse.Y;

      var oldRot = r;
      r = Math.atan2(mouseVec[0], mouseVec[1]);

      //Rotate around the cam vector
      if (rotAroundCam) {
        //If the lookat quat has changed
        if (oldPitch != pitchRad) quat.rotateX(lookAtQuat, lookAtQuat, -(oldPitch - pitchRad));
        if (oldYaw != yawRad) quat.rotateY(lookAtQuat, lookAtQuat, -(oldYaw - yawRad));
        //Roll it
        quat.rotateZ(lookAtQuat, lookAtQuat, r - oldRot);
        quat.normalize(lookAtQuat, lookAtQuat);
        //lookat quat --> inverse
        quat.mul(rotQuat, lookAtQuat, inverseLookAtQuat);

      } else {
        quat2.rotateY(bones[mouse.selected].dq, bones[mouse.selected].dq, -(oldRot - r));
      }
    }
    oldPitch = pitchRad;
    oldYaw = yawRad;
    //If the mouse wasn't pressed
  } else {
    displayText.style.backgroundColor = "white";
    mouse.selected = -1;
  }


  boneMat = calculateBones();
  //depthRenderer.render(objectsToDraw, matrix, boneMat);
  normalsRenderer.render(objectsToDraw, projectionMat, boneMat);
  mainRenderer.render(objectsToDraw, projectionMat, boneMat);
  postProcessOutline.render(postProcessObj, mainRenderer.tex, normalsRenderer.tex);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.cullFace(gl.BACK); //Not needed?
  gl.useProgram(postProcessObj.shader.prog);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(postProcessObj.shader.texUniforms["u_texture"], 0);
  gl.bindTexture(gl.TEXTURE_2D, postProcessOutline.tex);

  gl.uniform2f(postProcessObj.shader.uniforms["u_windowSize"], gl.drawingBufferWidth, gl.drawingBufferHeight);
  vaoExt.bindVertexArrayOES(postProcessObj.vao);
  //Draw the object
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, postProcessObj.bufferLength);

  //Draw transparent objects

  window.requestAnimationFrame(redraw);
}

var animationName = "bindpose"; //TODO a changeanimation function

/**
 * Applies a step of an animation. Returns true, if it reached the end
 */
function animationStep(animationName) {
  var a = animations[animationName];

  if (a.frame == 0) {
    a.prevKeyframe = [];
    for (var i = 0; i < a.usedBones.length; i++) {
      var boneIndex = a.usedBones[i];
      a.prevKeyframe[i] = bones[boneIndex].dq.real;
    }

  }

  //The 2 keyframes
  var keyframe1;

  if (a.frame >= 1) { //Normal animation
    keyframe1 = a.keyframes[(a.frame << 0) - 1];
  } else { //Special case, interpolate with prev animation
    keyframe1 = a.prevKeyframe;
  }

  var keyframe2 = a.keyframes[(a.frame << 0) % a.keyframes.length];

  var interpolationFactor = a.frame % 1; //Really cool
  //For each bone in the animation
  for (var i = 0; i < a.usedBones.length; i++) {
    var boneIndex = a.usedBones[i];
    bones[boneIndex].dq.setRotation(quat2.lerp(out, keyframe1[i], keyframe2[i], interpolationFactor));
  }

  a.frame += 0.05;
  if (a.frame >= a.keyframes.length) {
    a.frame = 0;
    return true;
  }
  return false;
}

/**
 * Calculates the bones. (Every single tick. That's a bit expensive, but whatever.)
 */
function calculateBones() {
  //animationStep(animationName);
  var tempBone = quat2.create();
  for (var i = 0; i < bones.length; i++) {

    //Normalize the quaternions
    quat2.normalize(bones[i].dq, bones[i].dq);
    var localDualQuat = quat2.clone(bones[i].dq);

    //Rotation
    if (i == mouse.selected) {
      quat2.rotateByQuatAppend(localDualQuat, localDualQuat, rotQuat);
    }
    
    //Root bone
    if (bones[i].parent == -1) {
      bones[i].worldDualQuat = localDualQuat;
    } else {
      if (bones[bones[i].parent].worldDualQuat == undefined) {
        console.log("Somehow, the parent bone is messed up." + i + " parent: " + bones[i].parent);
      }
      //Chain the bones together
      quat2.multiply(bones[i].worldDualQuat, bones[bones[i].parent].worldDualQuat, localDualQuat);
    }
    
    //Flatten it for OpenGL
    quat2.multiply(tempBone, bones[i].worldDualQuat, bones[i].dqInverseBindpose);
    //Now the bones are all equal to the root bone/identity (Because of the inverse bindpose)

    //To WXYZ
    boneArray[i * 8] = tempBone[0][3];
    boneArray[i * 8 + 1] = tempBone[0][0];
    boneArray[i * 8 + 2] = tempBone[0][1];
    boneArray[i * 8 + 3] = tempBone[0][2];
    boneArray[i * 8 + 4] = tempBone[1][3];
    boneArray[i * 8 + 4 + 1] = tempBone[1][0];
    boneArray[i * 8 + 4 + 2] = tempBone[1][1];
    boneArray[i * 8 + 4 + 3] = tempBone[1][2];
  }
  return boneArray;
}

/**
 * Returns the index of the bone
 */
function boneByName(name) {
  //Loop over the other bones and find the parent
  for (var i = 0; i < bones.length; i++) {
    if (bones[i].name == name) {
      return i;
    }
  }
}


/**
 * Creates a shader and returns it.
 * Tries to figure out the type if not specified.
 */
function createShader(shaderCode, shaderType) {
  if (shaderType == undefined) {
    //Vertex shader
    if (shaderCode.indexOf("gl_Position") >= 0) {
      shaderType = gl.VERTEX_SHADER;
    } else {
      shaderType = gl.FRAGMENT_SHADER;
    }
  }
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.trace();
    throw new Error(gl.getShaderInfoLog(shader) + shaderCode);

  }

  return shader;
}

function ShaderProg(vShaderCode, fShaderCode) {
  // Put the vertex shader and fragment shader together into
  // a complete program
  this.prog = gl.createProgram();
  this.vShaderProg = createShader(vShaderCode, gl.VERTEX_SHADER);
  this.fShaderProg = createShader(fShaderCode, gl.FRAGMENT_SHADER);
  gl.attachShader(this.prog, this.vShaderProg);
  gl.attachShader(this.prog, this.fShaderProg);

  function compile() {
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(this.prog));
    var nu = gl.getProgramParameter(this.prog, gl.ACTIVE_UNIFORMS);
    this.uniforms = {};
    this.texUniforms = {};
    for (var i = 0; i < nu; ++i) {
      var uniformName = gl.getActiveUniform(this.prog, i).name;
      if (uniformName.toLowerCase().indexOf("tex") == -1) {
        this.uniforms[uniformName] = gl.getUniformLocation(this.prog, uniformName);
      } else {
        this.texUniforms[uniformName] = gl.getUniformLocation(this.prog, uniformName);
      }
    }
  };

  compile.call(this);
  //Extract the #defines

  this.vShaderHeader = {};
  vShaderCode = vShaderCode.replace(/#define ([A-Za-z0-9_]+)\n?/g, (match, group1) => {
    this.vShaderHeader[group1] = true;
    return "";
  });

  this.fShaderHeader = {};
  fShaderCode = fShaderCode.replace(/#define ([A-Za-z0-9_]+)\n?/g, (match, group1) => {
    this.fShaderHeader[group1] = true;
    return "";
  });

  this.vShaderCode = vShaderCode;
  this.fShaderCode = fShaderCode;

  this.recompileV = function() {
    gl.shaderSource(this.vShaderProg, headerToString(this.vShaderHeader) + this.vShaderCode);
    gl.compileShader(this.vShaderProg);
    if (gl.getShaderParameter(this.vShaderProg, gl.COMPILE_STATUS)) {
      compile.call(this);
    }
  };

  this.recompileF = function() {
    gl.shaderSource(this.fShaderProg, headerToString(this.fShaderHeader) + this.fShaderCode);
    gl.compileShader(this.fShaderProg);
    if (gl.getShaderParameter(this.fShaderProg, gl.COMPILE_STATUS)) {
      compile.call(this);
    }
  };

  function headerToString(header) {
    var returnString = "";
    Object.keys(header).forEach(function(key) {
      if (header[key]) {
        returnString += "#define " + key + "\n";
      }
    });
    return returnString;
  }
}

/**
 * Sets the current attributes for a given shader
 * attributes: object with names, number of components and normalize
 * Returns the number of attributes
 */
function setAttributes(attributes, shader, offset) {
  offset = offset == undefined ? 0 : offset;
  /*attribute, number of elements per vertex, type, normalize, stride (for packed vertices: 3*4),
  offset (must be a multiple of the type)*/
  //Stride: 3*vertex, 2*uv, 3*normal,3*bary,1*bone index
  var numberOfElements = 0;
  attributes.forEach(attribute => {
    numberOfElements += attribute[1];
  });
  var prevNumberOfElements = 0;
  attributes.forEach(attribute => {
    var att = gl.getAttribLocation(shader, attribute[0]);
    gl.enableVertexAttribArray(att);
    //gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    gl.vertexAttribPointer(att, attribute[1], gl.FLOAT, attribute[2], numberOfElements * 4, offset + prevNumberOfElements * 4);
    prevNumberOfElements += attribute[1];
  });
  return numberOfElements;
  //console.trace();
  //return positionLocation; //Location of the stuff that is being fed to the shader
}
/**
 * Creates an object (VAO) to draw
 */
function createObjectToDraw(name, shader, modelData, attributes, textureName, color) {
  if (attributes == undefined) {
    attributes = [
      ["a_coordinate", 3, false],
      ["a_texcoord", 2, true],
      ["a_normal", 3, true],
      ["a_bone", 2, false],
      ["a_boneWeight", 1, true]
    ];
  }
  //Create VAO
  var vao = vaoExt.createVertexArrayOES();
  // Start setting up VAO
  vaoExt.bindVertexArrayOES(vao);
  //Create a VBO
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  //CO, UV, NORMALS
  var numberOfAttributes = setAttributes(attributes, shader.prog);
  if (modelData instanceof Float32Array) {
    gl.bufferData(gl.ARRAY_BUFFER, modelData, gl.STATIC_DRAW);
  } else {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData), gl.STATIC_DRAW);
  }


  vaoExt.bindVertexArrayOES(null);

  return {
    shader: shader,
    vao: vao,
    bufferLength: (modelData.length / numberOfAttributes), //Subtract the UVs, subtract the vertex normals
    texture: loadTextures(textureName, color, name),
  };
}

function addObjectToDraw(name, shader, modelData, attributes, texture, color) {
  objectsToDraw.push(
    createObjectToDraw(name, shader, modelData, attributes, texture, color));
}

/**
 * Loads a texture from a URL
 */
function loadTextures(textureName, color, prefix) {
  if (textureName == undefined) {
    return null;
  }
  // Create a texture.
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  //If it is a nonexistent texture
  if (textureName.indexOf("nonexistent.png") > -1 && color != undefined) {
    if (color.length == 3) { //If it is an RGB color
      color.push(255);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array(color));
  } else {
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]));
    // Asynchronously load an image
    var image = new Image();

    image.addEventListener('load', function() {
      //Bind the texture
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height)) {
        // Scale up the texture to the next highest power of two dimensions.
        var canvas = document.createElement("canvas");
        canvas.width = nextHighestPowerOfTwo(image.width);
        canvas.height = nextHighestPowerOfTwo(image.height);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        image = canvas;
      }
      // Now that the image has loaded make copy it to the texture.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
    image.src = prefix + "/" + textureName;
  }

  return texture;
}

function isPowerOfTwo(x) {
  return (x & (x - 1)) == 0;
}

function nextHighestPowerOfTwo(x) {
  --x;
  for (var i = 1; i < 32; i <<= 1) {
    x = x | x >> i;
  }
  return x + 1;
}


function loadModelFile(url, dataURL, shaderProgram) {
  //TODO: also load the bones!
  //TODO: Show progress
  //Better than XMLHttpRequest, because the name is shorter!
  return fetch(url, {
    method: "get"
  }).then((response) => {
    console.log(response.headers.get("Content-Length"));
    if (response.status === 200) {
      return response.arrayBuffer().then((arrayBuffer) => {
        var charByte = 1;
        var floatByte = 4,
          intByte = 4;
        //Where are we?
        var pointer = 0;
        //As long as we aren't done with the file
        while (true) {
          var data = new DataView(arrayBuffer);

          //Read the header
          /** LENGTH_OF_STRING TEX_NAME
           * (3_VALUES) 
           * (NUMBER_OF_FACES_2454365473467463)
           */
          //Texture name
          var stringLength = data.getInt32(pointer, true);
          pointer += intByte;
          var texName = "";
          for (var i = 0; i < stringLength; i += charByte) {
            texName += String.fromCharCode(data.getUint8(pointer + i));
          }
          pointer += stringLength * charByte;
          //Color:
          var color = [];
          for (var i = 0; i < 3 * floatByte; i += floatByte) {
            color.push(data.getFloat32(pointer + i, true) * 255);
          }
          pointer += 3 * floatByte;

          /*Model format:
           * 3 floats (pos)
           * 2 floats (uv)
           * 3 floats (normal)
           * 2 floats (bone index) (Could be stored as shorts)
           * 1 float (bone weight)
           */
          //Length of the array
          var numberOfFaces = data.getInt32(pointer, true);
          var arrayLength = numberOfFaces * 3 * (3 + 2 + 3 + 2 + 1);
          pointer += 1 * intByte;
          //Read the model
          var newModel = new Float32Array(arrayLength);
          for (var i = 0; i < newModel.length; i++) {
            newModel[i] = data.getFloat32(pointer + i * floatByte, true);
          }
          pointer += arrayLength * floatByte;
          //Whee! Everything seems to be working so far..
          addObjectToDraw(dataURL, shaderProgram, newModel, undefined, texName, color);
          if (pointer >= data.byteLength) break;
        }
      });
    } else {
      throw new Error("fetch failed" + response.status);
    }
  });
}

function loadModelBones(url) {
  //TODO: Show progress
  return fetch(url, {
    method: "get"
  }).then((response) => {
    if (response.status === 200) {
      return response.text().then((code) => {
        //TODO: Use something different. This is horrible
        eval(code);
      });
    } else {
      throw new Error("fetch failed" + response.status);
    }
  });
}

//Init functions

/**
 * Inits the canvas
 */
function initCanvas(canvasName) {
  //init canvas
  glcanvas = document.getElementById(canvasName);
  glcanvas.width = window.innerWidth;
  glcanvas.height = window.innerHeight;
  //Events
  //window.addEventListener('resize', () => {
  //glcanvas.width = window.innerWidth;
  //glcanvas.height = window.innerHeight;
  //}, false);
  window.addEventListener("keydown", keyboardHandlerDown);
  window.addEventListener("keyup", keyboardHandlerUp);
  window.addEventListener("wheel", scrollHandler);
  glcanvas.addEventListener("mousemove", mouseHandler);
  glcanvas.addEventListener("mousedown", (e) => {
    mouse.pressed = true;
  });
  glcanvas.addEventListener("mouseup", (e) => {
    mouse.pressed = false;
  });
  //TODO https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
  glcanvas.addEventListener("touchstart", touchHandlerStart);
  glcanvas.addEventListener("touchmove", touchHandlerMove);
  glcanvas.addEventListener("touchend", touchHandlerEnd);
  glcanvas.addEventListener("click", mouseClickHandler);

  glcanvas.requestPointerLock = glcanvas.requestPointerLock ||
    glcanvas.mozRequestPointerLock ||
    glcanvas.webkitRequestPointerLock;
  glcanvas.addEventListener("click", () => {
    if (!rigging) {
      glcanvas.requestPointerLock();
    }
  });

}

/**
 * Create WebGL
 */
function initWebGL(canvas) {
  gl = null;

  // browser supports WebGL
  if (window.WebGLRenderingContext) {
    try {
      // Try to grab the new context. If it fails, fallback to webgl.
      gl = canvas.getContext("webgl", {
        antialias: false,
        alpha: false,
        premultipliedAlpha: false
      }) || canvas.getContext("experimental-webgl", {
        antialias: false,
        alpha: false,
        premultipliedAlpha: false
      });
    } catch (e) {
      alert(e);
    }
    if (!gl) {
      alert("Your browser supports WebGL, but something screwed up.");
    }
  } else {
    alert("No WebGL?");
  }

  return gl;
}

function setUpBones() {
  boneArray = new glMatrix.ARRAY_TYPE(bones.length * 8);
  for (var i = 0; i < bones.length; i++) {
    if (bones[i].pos == undefined) {
      bones[i].pos = [0, 0, 0];
    }
    //Dual Quat
    bones[i].dq = quat2.create();
    bones[i].worldDualQuat = quat2.create();
    quat2.fromRotationTranslation(bones[i].dq, bones[i].qRot, bones[i].pos);
    //bones[i].dq = new DualQuat();
    //bones[i].dq.fromQuatTrans(bones[i].qRot, bones[i].pos);
    //Inverse bindpose
    bones[i].dqInverseBindpose = quat2.create();
    quat2.fromRotationTranslation(bones[i].dqInverseBindpose, bones[i].offsetRot, bones[i].offsetPos);
    quat2.normalize(bones[i].dqInverseBindpose, bones[i].dqInverseBindpose);
    //bones[i].dqInverseBindpose = new DualQuat();
    //bones[i].dqInverseBindpose.fromQuatTrans(bones[i].offsetRot, bones[i].offsetPos);
    //bones[i].dqInverseBindpose.normalize();
    //If the bone's parent is given as a string
    if (typeof bones[i].parent == "string") {
      bones[i].parent = boneByName(bones[i].parent);
    }
    //If the parent comes after the child, something is wrong
    if (bones[i].parent >= i) {
      throw new Error("Bone parent after child!" + i);
    }
  }
  animations.bindpose = {};
  animations.bindpose.frame = 1;
  animations.bindpose.usedBones = [];
  animations.bindpose.keyframes = [
    []
  ];
  bones.forEach((bone, i) => {
    animations.bindpose.usedBones.push(i);
    animations.bindpose.keyframes[0].push(bone.qRot);
  });

}

/**
 * For quickly loading a locally stored model
 */
function debugReadModel() {
  // Check for the various File API support.
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Setup the dnd listeners.
    var dropZone = document.getElementById('glcanvas');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);
  } else {
    alert('The File APIs are not fully supported in this browser.');
  }
}

function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var files = evt.dataTransfer.files; // FileList object.
  var reader = new FileReader();
  reader.addEventListener("loadend", data => {
    //Sorry
    eval(data.target.result);
    start();
  });
  reader.readAsText(files[0]);
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function keyboardHandlerDown(keyboardEvent) {

  switch (keyboardEvent.code) {
    case "KeyW":
    case "ArrowUp":
      velocity[0] = -Math.sin(yawRad) * Math.cos(pitchRad);
      velocity[1] = Math.sin(pitchRad);
      velocity[2] = -Math.cos(yawRad) * Math.cos(pitchRad);
      break;
    case "KeyS":
    case "ArrowDown":
      velocity[0] = Math.sin(yawRad) * Math.cos(pitchRad);
      velocity[1] = -Math.sin(pitchRad);
      velocity[2] = Math.cos(yawRad) * Math.cos(pitchRad);
      break;
    case "KeyA":
    case "ArrowLeft":
      //yawVel = 1;
      velocity[0] = -Math.sin(yawRad + Math.PI / 2);
      velocity[1] = 0;
      velocity[2] = -Math.cos(yawRad + Math.PI / 2);
      break;
    case "KeyD":
    case "ArrowRight":
      //yawVel = -1;
      velocity[0] = -Math.sin(yawRad - Math.PI / 2);
      velocity[1] = 0;
      velocity[2] = -Math.cos(yawRad - Math.PI / 2);
      break;
  }
}

function keyboardHandlerUp(keyboardEvent) {
  switch (keyboardEvent.code) {
    case "KeyW":
    case "KeyS":
    case "ArrowUp":
    case "ArrowDown":
      velocity[0] = 0;
      velocity[1] = 0;
      velocity[2] = 0;
      break;
      /*case "ArrowLeft":
        velocity[2] = 0.00;
        break;
      case "ArrowRight":
        velocity[2] = 0.00;
        break;*/
    case "KeyH":
      //drawDragon = !drawDragon;
    case "KeyA":
    case "ArrowLeft":
    case "KeyD":
    case "ArrowRight":
      velocity[0] = 0;
      velocity[1] = 0;
      velocity[2] = 0;
      yawVel = 0;
      break;
  }
}

function mouseClickHandler(mouseEvent) {
  mouse.clicked = true;
  mouse.X = mouseEvent.offsetX;
  mouse.Y = mouseEvent.offsetY;
  //http://www.opengl-tutorial.org/miscellaneous/clicking-on-objects/picking-with-an-opengl-hack/
  //http://stackoverflow.com/questions/21841483/webgl-using-framebuffers-for-picking-multiple-objects
}

function scrollHandler(scrollEvent) {
  speed -= scrollEvent.deltaY / 100;
}

function mouseHandler(mouseEvent) {
  if (!rigging && mouse.selected == -1) {
    yawRad -= mouseEvent.movementX / 500;
    pitchRad -= mouseEvent.movementY / 500;
  }
  mouse.X = mouseEvent.offsetX;
  mouse.Y = mouseEvent.offsetY;
}

var touchX = 0,
  touchY = 0;

function touchHandlerStart(event) {
  event.preventDefault();
  var touch = event.changedTouches[0];
  touchX = touch.clientX;
  touchY = touch.clientY;
}

function touchHandlerMove(event) {
  event.preventDefault();
  var touch = event.changedTouches[0];
  if (!rigging && mouse.selected == -1) {
    yawRad -= (touchX - touch.clientX) / 500;
    pitchRad -= (touchY - touch.clientY) / 500;
  }
  touchX = touch.clientX;
  touchY = touch.clientY;
}

function touchHandlerEnd(event) {
  event.preventDefault();
  var touch = event.changedTouches[0];
  if (!rigging && mouse.selected == -1) {
    yawRad -= (touchX - touch.clientX) / 500;
    pitchRad -= (touchY - touch.clientY) / 500;
  }
  touchX = touch.clientX;
  touchY = touch.clientY;
}
