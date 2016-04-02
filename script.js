/*
git commit -am "your message goes here"
git push
*/
/*global model*/

//Uses http://threejs.org/editor/
/*TODO 
Move Shaders somewhere else
Only pass attributes to GPU once and use in both shaders (how to use multiple shaders)
Cel Shading
Matrix inverse
http://stackoverflow.com/a/29514445/3492994
*/
var gl; //WebGL lives in here!
var vaoExt; //Vertex Array Objects extension
var glcanvas; //Our canvas
//Translation
var pos = [-13.74153029749956, 119.80755982476153, -184.15868065037967],
  velocity = [0, 0, 0];
  //-0.6695563612951321, -6.247855263929647, -32.9644536444527
  //-13.74153029749956, 119.80755982476153, -184.15868065037967
//Rotation
//var rotation = [0, 0, 0];
var pitch = 50,
  yaw = 0; //15,5
var scale = 0.05;

var objectsToDraw = [];

var transparentObjectsToDraw = [];

var drawDragon = true;

var MatrixMath = {
  degToRad: function(angleInDeg) {
    return angleInDeg * Math.PI / 180;
  },
  rotationXMatrix: function(angle) {
    var angleInRadians = angle * Math.PI / 180;
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ];
  },
  rotationYMatrix: function(angle) {
    var angleInRadians = angle * Math.PI / 180;
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ];
  },
  rotationZMatrix: function(angle) {
    var angleInRadians = angle * Math.PI / 180;
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      c, s, 0, 0, //Hehe, no screwing up my formatting, ok!?
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
  translationMatrix: function(tx, ty, tz) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  },
  scaleMatrix: function(scale) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, scale
    ];
  },
  scaleDimensionsMatrix: function(scaleX, scaleY, scaleZ) {
    return [
      scaleX, 0, 0, 0,
      0, scaleY, 0, 0,
      0, 0, scaleZ, 0,
      0, 0, 0, 1
    ];
  },
  perspectiveMatrix: function(fudgeFactor) {
    //z to w
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, fudgeFactor,
      0, 0, 0, 1,
    ]
  },
  makePerspective: function(fieldOfViewInRadians, aspect, near, far) {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ];
  },
  multiply: function(matrix1, matrix2) {
    if (matrix1.length != 16 || matrix2.length != 16) {
      throw Error("The matrices need to be 4 * 4.");
    }
    var returnMatrix = [];
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var dotProduct = 0;
        for (var count = 0; count < 4; count++) {
          dotProduct += matrix1[y * 4 + count] * matrix2[count * 4 + x];
        }

        returnMatrix[y * 4 + x] = dotProduct;
      }
    }
    return returnMatrix;
  },
  dotProcuct: function(array1, array2) {
    if (array1.length != array2.length) {
      throw Error("Not same length.");
    }
    //Multiply each element of array2 by array1[i] and get their sum
    return array2.map((s, i) => array1[i] * s).reduce((prev, curr) => prev + curr);
  },
  transpose: function(matrix) {
    if (matrix.length != 16) {
      throw Error("The matrix needs to be 4 * 4.");
    }
    console.log(matrix);
    var transposedMatrix = [];
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        transposedMatrix[x * 4 + y] = matrix[y * 4 + x];
      }
    }
    return transposedMatrix;
  },
  makeInverseCrap: function(m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0 = m22 * m33;
    var tmp_1 = m32 * m23;
    var tmp_2 = m12 * m33;
    var tmp_3 = m32 * m13;
    var tmp_4 = m12 * m23;
    var tmp_5 = m22 * m13;
    var tmp_6 = m02 * m33;
    var tmp_7 = m32 * m03;
    var tmp_8 = m02 * m23;
    var tmp_9 = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
        (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
        (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
        (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
        (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
        (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
        (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
        (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
        (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
        (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
        (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
        (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
        (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
    ];
  }
};

var celLineShader1;
var celLineShaderMatrixUniform1;
var celLineShaderNormalsLoc1;
var celLineShaderWidthUniform;

//Called by the body
function start() {
  initCanvas("glcanvas");

  //Init WebGL
  gl = initWebGL(glcanvas);

  if (gl) {
    vaoExt = gl.getExtension("OES_vertex_array_object");

    var vbo = model["vertices"];

    var celLineVertexShader = createShader(`
    attribute vec3 coordinates;
    attribute vec3 a_normal;
    uniform float u_width;
    uniform mat4 u_matrix; //The Matrix!
    
    void main(void){
      gl_Position = u_matrix * vec4(coordinates + normalize(a_normal) * u_width, 1);
      
    }`, gl.VERTEX_SHADER);

    var celLineFragmentShader = createShader(`
    precision mediump float;

    void main() {
      gl_FragColor = vec4(0,0,0, 1);  // black
    }`, gl.FRAGMENT_SHADER);

    celLineShader1 = createShaderProgram(celLineVertexShader, celLineFragmentShader);

    celLineShaderNormalsLoc1 = gl.getAttribLocation(celLineShader1, "a_normal");

    celLineShaderMatrixUniform1 = gl.getUniformLocation(celLineShader1, "u_matrix");
    celLineShaderWidthUniform = gl.getUniformLocation(celLineShader1, "u_width");


    // Create a buffer for normals.
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(celLineShaderNormalsLoc1);
    gl.vertexAttribPointer(celLineShaderNormalsLoc1, 3, gl.FLOAT, false, 0, 0);

    // Set normals.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model["normals"]), gl.STATIC_DRAW);

    var vertexShader = createShader(`
    attribute vec3 coordinates;
    attribute vec3 a_normal;
    uniform mat4 u_matrix; //The Matrix!
    
    attribute vec2 a_texcoord;
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    
    void main(void){
      gl_Position = u_matrix * vec4(coordinates + a_normal*0.0001, 1);
      v_textureCoord = a_texcoord;
      v_normal = a_normal;
    }`, gl.VERTEX_SHADER);

    var fragmentShader = createShader(`
    precision mediump float;
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    uniform sampler2D u_texture;
    
    void main() {
        float light = dot(v_normal, normalize(vec3(0,-1,0)));
      if(light <= 1.0/16.0 * 2.0){
        light = 0.5;
      }else if(light <= 1.0/16.0 * 7.0){
        light = 0.4;
      }else{
        light = 0.3;
      }
      
      vec3 src = vec3(1,1,1);//vec3(texture2D(u_texture, v_textureCoord));
      if(light <= 0.5){
        gl_FragColor = vec4(src * 2.0 * light,1);
      }else{
        gl_FragColor = vec4((1.0 - 2.0 * (1.0 - light) * (1.0 - src.x)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.y)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.z)),1);
      }
      
    }`, gl.FRAGMENT_SHADER);

    // Put the vertex shader and fragment shader together into
    // a complete program
    var shaderProgram = createShaderProgram(vertexShader, fragmentShader);

    addObjectToDraw(shaderProgram, {"coordinates":vbo, "a_normal":model["normals"]}, "u_matrix", {
      name: "NarutoTex.png",
      loc: gl.getAttribLocation(shaderProgram, "a_texcoord"),
      vertices: model["uvs"]
    });



    //addTransparentObjectToDraw(waterShaderProgram, water, ["coordinates"], "u_matrix", "SharpMap.png");
    //loadTexture("https://i.imgur.com/PxWbS.gif");

    //loadTexture("waterAni.gif");
    //loadTexture("https://slm-assets2.secondlife.com/assets/5553970/lightbox/3974332-blue-seamless-water-ripple-texture.jpg?1336696546");
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
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  pos[0] += velocity[0];
  pos[1] += velocity[1];
  pos[2] += velocity[2];


  var camMat = MatrixMath.multiply(MatrixMath.rotationXMatrix(pitch), MatrixMath.rotationYMatrix(yaw));
  camMat = MatrixMath.multiply(camMat, MatrixMath.translationMatrix(-pos[0], -pos[1], -pos[2]));
  var viewMat = MatrixMath.makeInverseCrap(camMat);

  var matrix = MatrixMath.multiply(viewMat, MatrixMath.makePerspective(1, glcanvas.clientWidth / glcanvas.clientHeight, 0.5, 1000));
  gl.disable(gl.BLEND);

  gl.cullFace(gl.FRONT);
  gl.enable(gl.CULL_FACE);

  objectsToDraw.forEach((object) => {
    //What shader program
    gl.useProgram(celLineShader1);
    //Uniforms such as the matrix
    gl.uniformMatrix4fv(celLineShaderMatrixUniform1, false, matrix);
    gl.uniform1f(celLineShaderWidthUniform, 0.03);
    //Bind VAO
    vaoExt.bindVertexArrayOES(object.vao);
    //Draw the object
    gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    gl.uniform1f(celLineShaderWidthUniform, -0.03);
    //Draw the object
    gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    //vaoExt.bindVertexArrayOES(null);  
  });

  gl.disable(gl.CULL_FACE);

  //gl.enable(gl.CULL_FACE);
  objectsToDraw.forEach((object) => {
    //What shader program
    gl.useProgram(object.shaderProgram);
    //Uniforms such as the matrix
    gl.uniformMatrix4fv(object.uniforms, false, matrix);
    //Bind VAO
    //vaoExt.bindVertexArrayOES(object.vao);
    //Draw the object
    if (drawDragon)
      gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    //vaoExt.bindVertexArrayOES(null);  
  });


  //gl.disable(gl.CULL_FACE);
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  //gl.enable(gl.BLEND);
  /*transparentObjectsToDraw.forEach((object) => {
    //What shader program
    gl.useProgram(object.shaderProgram);
    //What vertices should get used by the GPU
    //gl.bindBuffer(gl.ARRAY_BUFFER, object.buffer);
    //Now, let's make our shader able to use the vertices
    //object.attributes.forEach((s) =>
    //setAttribute(s));
    //Uniforms such as the matrix
    gl.uniformMatrix4fv(object.uniforms, false, matrix);

    vaoExt.bindVertexArrayOES(object.vao);
    //Draw the object
    gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    //vaoExt.bindVertexArrayOES(null);  
  });*/
  window.requestAnimationFrame(redraw);
}

/**
 * Loads a texture from a URL
 */
function loadTexture(textureLocation) {
  // Create a texture.
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 255, 255]));
  // Asynchronously load an image
  var image = new Image();
  image.src = textureLocation;
  image.addEventListener('load', function() {
    // Now that the image has loaded make copy it to the texture.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (textureLocation[0] == "1") {
      // For Crying Out Loud Don't Let OpenGL Use Bi/Trilinear Filtering!
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_1D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }
    else {
      //Generate some mipmaps!
      gl.generateMipmap(gl.TEXTURE_2D);
    }



  });
  //setTimeout("", 10000);
  return texture;
}

function createTexture(textureLocation, textureCoordsAttribute, textureCoords = -1) {
  loadTexture(textureLocation);
  if (textureCoords != -1) {
    createVBO(textureCoords);
    setAttribute(textureCoordsAttribute, 2);
  }
}

/** 
 * Creates and uploads a VBO to the GPU
 */
function createVBO(vertices) {
  // Copy an array of data points forming a triangle to the
  // graphics hardware
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  //gl.bindBuffer(gl.ARRAY_BUFFER, null); // unbinding
  return buffer;
}
/**
 * Creates a buffer and attributes
 * 
 */
function createBufferAndAttribute(bufferData, attribute, type = gl.ARRAY_BUFFER, numComponents = 3) {

  if (typeof attributeName === 'string') {
    //TODO Do something about it!
  }

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData), gl.STATIC_DRAW);
}
/**
 * Creates a shader and returns it.
 * Tries to figure out the type if not specified.
 */
function createShader(shaderCode, shaderType = -1) {
  if (shaderType == -1) {
    //Vertex shader
    if (shaderCode.indexOf("gl_Position") >= 0) {
      shaderType = gl.VERTEX_SHADER;
    }
    else {
      shaderType = gl.FRAGMENT_SHADER;
    }
  }
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader));

  return shader;
}

function createShaderProgram(vertexShader, fragmentShader) {
  // Put the vertex shader and fragment shader together into
  // a complete program
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(shaderProgram));

  return shaderProgram;
}
/**
 * Sets the current attribute for a given shader
 */
function setAttribute(attribute, numComponents = 3) {
  gl.enableVertexAttribArray(attribute);
  //numComponents (x, y, z)
  var type = gl.FLOAT;
  var normalize = false; // leave the values as they are
  var offset = 0; // start at the beginning of the buffer
  var stride = 0; // how many bytes to move to the next vertex
  // 0 = use the correct stride for type and numComponents
  gl.vertexAttribPointer(attribute, numComponents, type, normalize, stride, offset);
  //console.trace();
  //return positionLocation; //Location of the stuff that is being fed to the shader
}
/**
 * Creates an object (VAO) to draw
 */
function createObjectToDraw(shaderProgram, attributes, uniformName, texture) {
  //Create VAO
  var vao = vaoExt.createVertexArrayOES();
  // Start setting up VAO  
  vaoExt.bindVertexArrayOES(vao);
  //Create a VBO
  if ("coordinates" in attributes) {
    createBufferAndAttribute(attributes["coordinates"], gl.getAttribLocation(shaderProgram, "coordinates"));
  }

  if ("a_normal" in attributes) {
    createBufferAndAttribute(attributes["a_normal"], gl.getAttribLocation(shaderProgram, "a_normal"));
  }
  //TODO support more attributes
  createTexture(texture["name"], texture["loc"], texture["vertices"]);
  
  vaoExt.bindVertexArrayOES(null);

  return {
    shaderProgram: shaderProgram,
    vao: vao,
    bufferLength: attributes["coordinates"].length,
    uniforms: gl.getUniformLocation(shaderProgram, uniformName)
  };
}

function addObjectToDraw(shaderProgram, attributes, uniformName, textureName) {
  objectsToDraw.push(
    createObjectToDraw(shaderProgram, attributes, uniformName, textureName));
}

function addTransparentObjectToDraw(shaderProgram, attributes, uniformName, textureName) {
  transparentObjectsToDraw.push(
    createObjectToDraw(shaderProgram, attributes, uniformName, textureName));
}
/**
 * OMG! C9 rocks!
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
  window.addEventListener("mousemove", mouseHandler);
  glcanvas.requestPointerLock = glcanvas.requestPointerLock ||
    glcanvas.mozRequestPointerLock ||
    glcanvas.webkitRequestPointerLock;
  window.addEventListener("click", () => {
    glcanvas.requestPointerLock();
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
      // Try to grab the standard context. If it fails, fallback to experimental.
      gl = canvas.getContext("webgl"
        /*, {
                premultipliedAlpha: false // Ask for non-premultiplied alpha
              }*/
      ) || canvas.getContext("experimental-webgl"
        /*, {
                premultipliedAlpha: false // Ask for non-premultiplied alpha
              }*/
      );
    }
    catch (e) {
      alert(e);
    }
    if (!gl) {
      alert("Your browser supports WebGL, but something screwed up.");
      gl = null;
    }
    console.log(gl);
  }
  else {
    alert("No WebGL?");
  }

  return gl;
}

function keyboardHandlerDown(keyboardEvent) {
  var yawRad = MatrixMath.degToRad(yaw);
  var pitchRad = MatrixMath.degToRad(pitch);
  switch (keyboardEvent.code) {
    case "ArrowUp":
      velocity[0] = Math.sin(yawRad) * Math.cos(pitchRad);
      velocity[1] = -Math.sin(pitchRad);
      velocity[2] = Math.cos(yawRad) * Math.cos(pitchRad);
      break;
    case "ArrowDown":
      velocity[0] = -Math.sin(yawRad) * Math.cos(pitchRad);
      velocity[1] = Math.sin(pitchRad);
      velocity[2] = -Math.cos(yawRad) * Math.cos(pitchRad);
      break;
    case "ArrowLeft":
      yaw++;
      break;
    case "ArrowRight":
      yaw--;
      break;
  }
}

function keyboardHandlerUp(keyboardEvent) {
  switch (keyboardEvent.code) {
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
  scale += scrollEvent.deltaY / 100000;
}

function mouseHandler(mouseEvent) {
  yaw -= mouseEvent.movementX / 10;
  pitch -= mouseEvent.movementY / 10;
}