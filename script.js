/*
git commit -am "your message goes here"
git push
*/
/*global model bones setUpPicker pickPixel initSidebar animations*/
/*global Mat4 Quat DualQuat*/
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
https://www.opengl.org/wiki/Uniform_Buffer_Object
Occlusion Queries
*/
var gl; //WebGL lives in here!
var vaoExt; //Vertex Array Objects extension
var glcanvas; //Our canvas
//Translation
var pos = [-0.07357800747744046, 3, 3],
  velocity = [0, 0, 0],
  speed = 0.01;

//Rotation
var pitch = 5,
  yaw = 0;
var lightRot = [1, -0.5, -0.3];

var objectsToDraw = [];

var drawDragon = true;

var celLineShader;

var mouse = {
  clicked: false,
  X: 0,
  Y: 0
};
var rigging = false;

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
    setUpBones();
    setUpPicker();
    vaoExt = gl.getExtension("OES_vertex_array_object");
    //Standard derivatives
    gl.getExtension("OES_standard_derivatives");
    var celLineVertexShader = `
    attribute vec3 a_coordinate;
    attribute float a_bone;
    attribute vec3 a_normal;
    
    uniform float u_width;
    uniform mat4 u_matrix; //The Matrix!
    uniform mat4 u_bones[113];
    
    void main(void){
      gl_Position = u_matrix * u_bones[int(a_bone)] * vec4(a_coordinate + a_normal * u_width, 1);

    }`;

    var celLineFragmentShader = `
    precision mediump float;

    void main() {
      gl_FragColor = vec4(0,0,0, 1);  // black
    }`;

    celLineShader = new ShaderProg(celLineVertexShader, celLineFragmentShader);

    var vertexShader = `
    attribute vec3 a_coordinate;
    attribute float a_bone;
    attribute vec3 a_normal;
    attribute vec2 a_texcoord;
    attribute vec3 a_bary;
    uniform mat4 u_matrix; //The Matrix!
    uniform mat4 u_bones[113]; //Bones that can be moved
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    varying vec3 v_bary;
    
    vec3 qtransform( vec4 q, vec3 v ){ 
	    return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
	  }
    
    void main(void){
      vec4 vertPos = u_bones[int(a_bone)] * vec4(a_coordinate, 1);
      gl_Position = u_matrix * vertPos;
      
      v_textureCoord = a_texcoord;
      v_normal = vec3(u_bones[int(a_bone)] * vec4(a_normal , 1.0)); //Just rotation and translation
      v_bary = a_bary;
    }`;


    //Anime has exactly 2 different shadings, light OR dark
    var fragmentShader = `
    #extension GL_OES_standard_derivatives : enable
    precision mediump float;
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    varying vec3 v_bary;
    uniform vec3 u_light;
    uniform sampler2D u_texture;

    void main() {
    if(any(lessThan(v_bary, vec3(0.001)))){
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }else{
      //step?
        float light = dot(v_normal, normalize(u_light));
        if(light <= 1.0/16.0 * 7.0){
          light = 0.5;
        }else{
          light = 0.3;
        }
        
        vec3 src = vec3(texture2D(u_texture, v_textureCoord));
        
        gl_FragColor = vec4(src * 2.0 * light,1);
        //if(light > 0.5){
        //gl_FragColor = vec4((1.0 - 2.0 * (1.0 - light) * (1.0 - src.y)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.z)),1);
        
      }
    }`;

    // Put the vertex shader and fragment shader together into
    // a complete program
    var shaderProgram = new ShaderProg(vertexShader, fragmentShader);
    for (var i = 0; i < model.length; i++) {
      addObjectToDraw("cat", shaderProgram, model[i], {
        locations: [model[i][0]],
        uniforms: ["u_texture"]
      }, 1);
    }
    //Get rid of model, make it easier for the garbage collector
    //model = null;

    // Everything we need has now been copied to the graphics
    // hardware, so we can start drawing

    // Clear the drawing surface
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    window.requestAnimationFrame(redraw);
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
  var matrix = Mat4.multiply(viewMat, Mat4.makePerspective(1, glcanvas.clientWidth / glcanvas.clientHeight, 0.5, 1000));

  var boneMat = calculateBones();
  if (mouse.clicked) {
    //pickPixel(objectsToDraw, Mat4.multiply(matrix, Mat4.translation(-1, -1, 0)), boneMat);
    //mouse.X / glcanvas.clientWidth;
    //-mouse.Y / glcanvas.clientHeight;
    pickPixel(objectsToDraw,
      Mat4.multiply(matrix,
        Mat4.translation(-mouse.X / glcanvas.clientWidth * 2, (1 - mouse.Y / glcanvas.clientHeight) * -2, 0)
      ), boneMat);
    mouse.clicked = false;
  }
  //
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);

  gl.cullFace(gl.FRONT);
  gl.enable(gl.CULL_FACE);

  //Check what is faster: moving this into the other loop or leaving it this way
  //What shader program
  gl.useProgram(celLineShader.prog);
  //Uniforms such as the matrix
  gl.uniformMatrix4fv(celLineShader.uniforms["u_matrix"], false, matrix);
  gl.uniformMatrix4fv(celLineShader.uniforms["u_bones[0]"], false, boneMat);
  gl.uniform1f(celLineShader.uniforms["u_width"], 0.005);
  objectsToDraw.forEach((object) => {
    //Bind VAO
    vaoExt.bindVertexArrayOES(object.vao);
    //Draw the outlines
    gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    //vaoExt.bindVertexArrayOES(null);
  });

  gl.cullFace(gl.BACK);
  var prevShaderProg = objectsToDraw[0].shaderProgram;
  gl.useProgram(prevShaderProg.prog);

  objectsToDraw.forEach((object) => {
    //What shader program
    if (prevShaderProg != object.shaderProgram) {
      gl.useProgram(object.shaderProgram.prog);
      prevShaderProg = object.shaderProgram;
    }
    for (var i = 0; i < object.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.uniform1i(object.textureUniforms[i], i);
      gl.bindTexture(gl.TEXTURE_2D, object.textures[i]);
    }

    //Uniforms such as the matrix
    gl.uniformMatrix4fv(object.shaderProgram.uniforms["u_matrix"], false, matrix);
    gl.uniform3fv(object.shaderProgram.uniforms["u_light"], lightRot);
    gl.uniformMatrix4fv(object.shaderProgram.uniforms["u_bones[0]"], false, boneMat);
    //Bind VAO
    vaoExt.bindVertexArrayOES(object.vao);

    //Draw the object
    if (drawDragon)
      gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
  });


  gl.disable(gl.CULL_FACE);
  //Draw transparent objects

  window.requestAnimationFrame(redraw);
}

var animationName = "nod"; //TODO a changeanimation function

/**
 * Applies a step of an animation. Returns true, if it reached the end
 */
function animationStep(animationName) {
  var a = animations[animationName];

  if (a.frame == 0) {
    a.prevKeyframe = [];
    for (var i = 0; i < a.usedBones.length; i++) {
      var boneIndex = a.usedBones[i];
      a.prevKeyframe[i] = bones[boneIndex].qRot;
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
    bones[boneIndex].qRot = Quat.nlerp1(
      keyframe1[i], keyframe2[i], interpolationFactor);
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
    boneMat[i] = bones[i].dqInverseBindpose.copy().multiply(bones[i].worldDualQuat).toMat4();
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
 * Loads a texture from a URL
 */
function loadTextures(textureLocations, prefix) {

  var returnTextures = [];
  for (var i = 0; i < textureLocations.length; i++) {
    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    var tex = textureLocations[i].split(";");
    //If it is a nonexistent texture
    if (textureLocations[i].indexOf("nonexistent.png") > -1) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([+tex[1] * 255, +tex[2] * 255, +tex[3] * 255, 255]));
    } else {
      // Fill the texture with a 1x1 blue pixel.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));

      // Asynchronously load an image
      var image = new Image();
      image.src = prefix + "/" + tex[0];

      image.addEventListener('load', function() {
        var mips = false;
        //Bind the texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height)) {
          if (image.width == image.height) {
            // Scale up the texture to the next highest power of two dimensions.
            var canvas = document.createElement("canvas");
            canvas.width = nextHighestPowerOfTwo(image.width);
            canvas.height = nextHighestPowerOfTwo(image.height);
            var ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            image = canvas;
            mips = true;
          } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            //No mipmaps
          }
        } else {
          //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
          mips = true;
        }
        // Now that the image has loaded make copy it to the texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (mips) {
          //Generate some mipmaps!
          gl.generateMipmap(gl.TEXTURE_2D);
        }
      });
    }
    returnTextures.push(texture);
  }
  return returnTextures;
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
    throw new Error(gl.getShaderInfoLog(shader));

  }

  return shader;
}

function ShaderProg(vertexShader, fragmentShader) {
  // Put the vertex shader and fragment shader together into
  // a complete program
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, createShader(vertexShader, gl.VERTEX_SHADER));
  gl.attachShader(shaderProgram, createShader(fragmentShader, gl.FRAGMENT_SHADER));
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(shaderProgram));

  this.uniforms = {};

  /* var na = gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES);
console.log(na, 'attributes');
for (var i = 0; i < na; ++i) {
  var a = gl.getActiveAttrib(shaderProgram, i);
  console.log(i, a.size, a.type, a.name);
}*/
  var nu = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
  for (var i = 0; i < nu; ++i) {
    var uniformName = gl.getActiveUniform(shaderProgram, i).name;
    if (uniformName.indexOf("texture") == -1) {
      this.uniforms[uniformName] = gl.getUniformLocation(shaderProgram, uniformName);
    }
  }

  this.prog = shaderProgram;
}

/**
 * Sets the current attributes for a given shader
 * attributes: object with names, number of components and normalize
 */
function setAttributes(attributes, shaderProgram, offset) {
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
    var att = gl.getAttribLocation(shaderProgram, attribute[0]);
    gl.enableVertexAttribArray(att);
    //gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    gl.vertexAttribPointer(att, attribute[1], gl.FLOAT, attribute[2], numberOfElements * 4, offset + prevNumberOfElements * 4);
    prevNumberOfElements += attribute[1];
  });

  //console.trace();
  //return positionLocation; //Location of the stuff that is being fed to the shader
}
/**
 * Creates an object (VAO) to draw
 */
function createObjectToDraw(name, shaderProgram, object, textures, boneType) {
  //Create VAO
  var vao = vaoExt.createVertexArrayOES();
  // Start setting up VAO
  vaoExt.bindVertexArrayOES(vao);
  //Create a VBO
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  //CO, UV, NORMALS
  setAttributes([
    ["a_coordinate", 3, false],
    ["a_texcoord", 2, true],
    ["a_normal", 3, true],
    ["a_bary", 3, false],
    ["a_bone", 1, true]
  ], shaderProgram.prog, 4);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object), gl.STATIC_DRAW);

  var textureUniforms = [];
  for (var i = 0; i < textures.uniforms.length; i++) {
    //Shader program texture index
    textureUniforms.push(gl.getUniformLocation(shaderProgram.prog, textures.uniforms[i]), i);
  }

  vaoExt.bindVertexArrayOES(null);

  return {
    shaderProgram: shaderProgram,
    vao: vao,
    bufferLength: (object.length - (2 * (object.length / 12)) - (3 * (object.length / 12)) - (3 * (object.length / 12)) - (1 * (object.length / 12))), //Subtract the UVs, subtract the vertex normals
    textures: loadTextures(textures.locations, "Model/" + name),
    textureUniforms: textureUniforms
  };
}

function addObjectToDraw(name, shaderProgram, object, textures, boneType) {
  objectsToDraw.push(
    createObjectToDraw(name, shaderProgram, object, textures, boneType));
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
  window.addEventListener('resize', () => {
    glcanvas.width = window.innerWidth;
    glcanvas.height = window.innerHeight;
  }, false);
  window.addEventListener("keydown", keyboardHandlerDown);
  window.addEventListener("keyup", keyboardHandlerUp);
  window.addEventListener("wheel", scrollHandler);
  glcanvas.addEventListener("mousemove", mouseHandler);
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
      gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    } catch (e) {
      alert(e);
    }
    if (!gl) {
      alert("Your browser supports WebGL, but something screwed up.");
      gl = null;
    }
    console.log(gl);
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
      drawDragon = !drawDragon;
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