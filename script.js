/*
git commit -am "your message goes here"
git push
*/

/*global model bones setUpPicker pickPixel animations setUpRenderer*/
/*global Mat4 Quat DualQuat*/ //Math
/*global normalsVShader normalsFShader*/
/*global initSidebar rigging outlines*/

//cgc -entry dqsFast -profile glslv -profileopts version=120 C:\Users\stefan\Downloads\Skinning\test.cg
//https://www.opengl.org/wiki/Performance
//http://webglfundamentals.org/webgl/lessons/webgl-2-textures.html
//https://docs.google.com/presentation/d/12AGAUmElB0oOBgbEEBfhABkIMCL3CUX7kdAPLuwZ964/edit#slide=id.i51
//https://hacks.mozilla.org/2014/03/introducing-the-canvas-debugger-in-firefox-developer-tools/
/*TODO
Create class for shader programs
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
Move Shaders somewhere else
Matrix inverse

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
var gl; //WebGL lives in here!
var vaoExt; //Vertex Array Objects extension
var glcanvas; //Our canvas
//Translation
var pos = [-0.12583708965284524, 2.9979705362177205, 1.3783995901996082],
  velocity = [0, 0, 0],
  speed = 0.01;

//Rotation
var pitch = 5,
  yaw = 0;
var lightRot = [1, -0.5, -0.3];

var objectsToDraw = [];

var normalsRenderer;
var mainRenderer;
var mouse = {
  clicked: false,
  X: 0,
  Y: 0
};


var postProcessOutline;
var postProcessObj;
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
      loadModelFile("Model/cat/output.modelfile", "Model/cat", shaderProgram)
    ]).then((stuff) => {
      //DO SOMETHING
      glcanvas.style.backgroundColor = "white";
      window.requestAnimationFrame(redraw);
    }).catch((error) => {
      glcanvas.style.backgroundColor = "red";
      throw error;
    });

    setUpBones();
    //setUpPicker();
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

    for (var i = 0; i < model.length; i++) {
      var tex = model[i].name.split(";");
      //addObjectToDraw("Model/cat", shaderProgram, model[i].model, undefined, tex[0], [+tex[1] * 255, +tex[2] * 255, +tex[3] * 255, 255]);
    }
    //Get rid of model, make it easier for the garbage collector
    //model = null;

    // Everything we need has now been copied to the graphics
    // hardware, so we can start drawing

    // Clear the drawing surface
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
  }
}


/**
 * Draw loop
 */
function redraw() {
  pos[0] += velocity[0] * speed;
  pos[1] += velocity[1] * speed;
  pos[2] += velocity[2] * speed;

  var modelMat = Mat4.multiply(Mat4.rotX(pitch), Mat4.rotY(yaw));
  modelMat = Mat4.multiply(modelMat, Mat4.translation(pos[0], pos[1], pos[2]));
  var viewMat = Mat4.makeInverseCrap(modelMat);


  //Projection matrix => Mat4.makePerspective
  var matrix = Mat4.multiply(viewMat, Mat4.makePerspective(1, glcanvas.clientWidth / glcanvas.clientHeight, 0.5, 200));

  var boneMat = calculateBones();
  if (mouse.clicked) {
    //pickPixel(objectsToDraw, Mat4.multiply(matrix, Mat4.translation(-1, -1, 0)), boneMat);
    //mouse.X / glcanvas.clientWidth;
    //-mouse.Y / glcanvas.clientHeight;
    /*pickPixel(objectsToDraw,
      Mat4.multiply(matrix,
        Mat4.translation(-mouse.X / glcanvas.clientWidth * 2, (1 - mouse.Y / glcanvas.clientHeight) * -2, 0)
      ), boneMat);*/
    mouse.clicked = false;
  }

  normalsRenderer.render(objectsToDraw, matrix, boneMat);
  mainRenderer.render(objectsToDraw, matrix, boneMat);
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



  //

  //lightRot[0] = pitch;

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
    bones[boneIndex].dq.setRotation(Quat.nlerp1(
      keyframe1[i], keyframe2[i], interpolationFactor));
  }

  a.frame += 0.05;
  if (a.frame >= a.keyframes.length) {
    a.frame = 0;
    return true;
  }
  return false;
}

function calculateBones() {
  var boneMat = [];
  //animationStep(animationName);
  for (var i = 0; i < bones.length; i++) {

    //Normalize the quaternions
    bones[i].dq.normalize();
    var localDualQuat = bones[i].dq.copy();
    /* Mat4.multiply(
          Quat.toMat4(bones[i].qRot),
          Mat4.translation(bones[i].pos[0], bones[i].pos[1], bones[i].pos[2])
        );*/

    //Root bone
    if (bones[i].parent == -1) {
      bones[i].worldDualQuat = localDualQuat;
    } else {
      if (bones[bones[i].parent].worldDualQuat == undefined) {
        console.log(i);
      }

      bones[i].worldDualQuat = localDualQuat.multiply(bones[bones[i].parent].worldDualQuat);
    }
    boneMat[i] = bones[i].dqInverseBindpose.copy().multiply(bones[i].worldDualQuat).toArray(); //.toMat4();
  }
  return [].concat.apply([], boneMat); //Flatten it for OpenGL
}

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
    console.log(textureName);
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

function loadModelFile(url, texUrl, shaderProgram) {
  //Better than XMLHttpRequest, because the name is shorter!
  return fetch(url, {
    method: "get"
  }).then((response) => {
    if (response.status === 200) {
      //response.arrayBuffer().then((hi) => {
      //  console.log(hi[0]);
      //});
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
          addObjectToDraw(texUrl, shaderProgram, newModel, undefined, texName, color);

          if (pointer >= data.byteLength) break;
        }
        /*var x = Uint8Array.BYTES_PER_ELEMENT;
        alert(
          String.fromCharCode(data.getUint8(0), data.getUint8(1 * x), data.getUint8(2 * x), data.getUint8(3 * x))
        );
        var modelArray = new Float32Array(Math.floor(data.byteLength / Float32Array.BYTES_PER_ELEMENT));
        for (var i = 0; i < modelArray.length; i++) {
          modelArray[i] = data.getFloat32(i * Float32Array.BYTES_PER_ELEMENT, true);
        }
        return modelArray;
        */
        //Call the createObjectToDraw() fuction in here
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
  //TODO https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
  //glcanvas.addEventListener("touchmove", mouseHandler);
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
      gl = null;
    }
  } else {
    alert("No WebGL?");
  }

  return gl;
}

function setUpBones() {
  for (var i = 0; i < bones.length; i++) {
    bones[i].dq = new DualQuat();
    bones[i].dq.fromQuatTrans(bones[i].qRot, bones[i].pos);
    bones[i].dqInverseBindpose = new DualQuat();
    bones[i].dqInverseBindpose.fromQuatTrans(bones[i].offsetRot, bones[i].offsetPos);
    bones[i].dqInverseBindpose.normalize();
    if (bones[i].pos == undefined) {
      bones[i].pos = [0, 0, 0];
    }
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
  var yawRad = Mat4.degToRad(yaw);
  var pitchRad = Mat4.degToRad(pitch);
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
      yaw++;
      break;
    case "KeyD":
    case "ArrowRight":
      yaw--;
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
  }
}

function scrollHandler(scrollEvent) {
  speed -= scrollEvent.deltaY / 100;
}

function mouseHandler(mouseEvent) {
  if (!rigging) {
    yaw -= mouseEvent.movementX / 10;
    pitch -= mouseEvent.movementY / 10;
  }
}

function mouseClickHandler(mouseEvent) {
  mouse.clicked = true;
  mouse.X = mouseEvent.offsetX;
  mouse.Y = mouseEvent.offsetY;
  //http://www.opengl-tutorial.org/miscellaneous/clicking-on-objects/picking-with-an-opengl-hack/
  //http://stackoverflow.com/questions/21841483/webgl-using-framebuffers-for-picking-multiple-objects
}