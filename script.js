/*
git commit -am "your message goes here"
git push
*/
/*global model*/

//Uses http://threejs.org/editor/
/*TODO 
Get rid of old files
Triangles that make up the valleys are inside the model. (The ends of the spikes are inside the model)
Fix vallyes!

Move Shaders somewhere else
Only pass attributes to GPU once and use in both shaders (how to use multiple shaders)
Matrix inverse
http://stackoverflow.com/a/29514445/3492994
*/
var gl; //WebGL lives in here!
var vaoExt; //Vertex Array Objects extension
var glcanvas; //Our canvas
//Translation
var pos = [-0.9248072232763789, 9.924346853658541, -56.26606595458085],
  velocity = [0, 0, 0];
//-0.6695563612951321, -6.247855263929647, -32.9644536444527
//-13.74153029749956, 119.80755982476153, -184.15868065037967
//Rotation
//var rotation = [0, 0, 0];
var pitch = -278,
  yaw = -720; //15,5
//50, 0
var scale = 0.05;

var objectsToDraw = [];

var transparentObjectsToDraw = [];

var drawDragon = true;

var celLineShader1;
var celLineShaderMatrixUniform1;
var celLineShaderWidthUniform;


var texHAX = [];

var MatMath = {
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
  normalize: function(x, y, z) {
    var length = Math.sqrt(x * x + y * y + z * z);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
      return [x / length, y / length, z / length];
    }
    else {
      return [0, 0, 0];
    }
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


//Called by the body
function start() {
  initCanvas("glcanvas");

  //Init WebGL
  gl = initWebGL(glcanvas);

  if (gl) {
    //calculateExtendersAndLines();
    vaoExt = gl.getExtension("OES_vertex_array_object");

    var celLineVertexShader = createShader(`
    attribute vec3 a_coordinate;
    attribute vec3 a_normal;
    uniform float u_width;
    uniform mat4 u_matrix; //The Matrix!
    
    void main(void){
      gl_Position = u_matrix * vec4(a_coordinate + a_normal * u_width, 1);
      
    }`, gl.VERTEX_SHADER);

    var celLineFragmentShader = createShader(`
    precision mediump float;

    void main() {
      gl_FragColor = vec4(0,0,0, 1);  // black
    }`, gl.FRAGMENT_SHADER);

    celLineShader1 = createShaderProgram(celLineVertexShader, celLineFragmentShader);

    celLineShaderMatrixUniform1 = gl.getUniformLocation(celLineShader1, "u_matrix");
    celLineShaderWidthUniform = gl.getUniformLocation(celLineShader1, "u_width");


    var vertexShader = createShader(`
    attribute vec3 a_coordinate;
    attribute vec3 a_normal;
    attribute vec2 a_texcoord;
    attribute vec3 a_bary;
    uniform mat4 u_matrix; //The Matrix!
    
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    varying vec3 v_bary;
    
    void main(void){
      if(a_texcoord.x != -1.0){
        gl_Position = u_matrix * vec4(a_coordinate, 1);
      }else{
        gl_Position = vec4(-1000);
      }
      v_textureCoord = a_texcoord;
      v_normal = a_normal;
      v_bary = a_bary;
    }`, gl.VERTEX_SHADER);

    var fragmentShader = createShader(`
    precision mediump float;
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    varying vec3 v_bary;
    uniform sampler2D u_texture;
    
    void main() {
    if(any(lessThan(v_bary, vec3(0.02)))){
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }else{
        float light = dot(v_normal, normalize(vec3(-1,0,0)));
        if(light <= 1.0/16.0 * 2.0){
          light = 0.5;
        }else if(light <= 1.0/16.0 * 7.0){
          light = 0.4;
        }else{
          light = 0.3;
        }
  
        vec3 src = vec3(texture2D(u_texture, v_textureCoord));//vec3(1,1,1);
        if(light <= 0.5){
          gl_FragColor = vec4(src * 2.0 * light,1);
        }else{
          gl_FragColor = vec4((1.0 - 2.0 * (1.0 - light) * (1.0 - src.x)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.y)),(1.0 - 2.0 * (1.0 - light) * (1.0 - src.z)),1);
        }
      }
    }`, gl.FRAGMENT_SHADER);

    // Put the vertex shader and fragment shader together into
    // a complete program
    var shaderProgram = createShaderProgram(vertexShader, fragmentShader);
  
    for(var i = 0; i < model.length; i++){
      addObjectToDraw(shaderProgram, model[i], "u_matrix", {
      name: model[i][0],
    });
    }
    

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


  var camMat = MatMath.multiply(MatMath.rotationXMatrix(pitch), MatMath.rotationYMatrix(yaw));
  camMat = MatMath.multiply(camMat, MatMath.translationMatrix(-pos[0], -pos[1], -pos[2]));
  var viewMat = MatMath.makeInverseCrap(camMat);

  var matrix = MatMath.multiply(viewMat, MatMath.makePerspective(1, glcanvas.clientWidth / glcanvas.clientHeight, 0.5, 1000));
  gl.disable(gl.BLEND);

  gl.cullFace(gl.FRONT);
  gl.enable(gl.CULL_FACE);

  //Check what is faster: moving this into the other loop or leaving it this way
  objectsToDraw.forEach((object) => {
    //What shader program
    gl.useProgram(celLineShader1);
    //Uniforms such as the matrix
    gl.uniformMatrix4fv(celLineShaderMatrixUniform1, false, matrix);
    gl.uniform1f(celLineShaderWidthUniform, 0.1);
    //Bind VAO
    vaoExt.bindVertexArrayOES(object.vao);
    //Draw the object
    gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    //vaoExt.bindVertexArrayOES(null);  
  });

  gl.disable(gl.CULL_FACE);

  var c = 0;
  //gl.enable(gl.CULL_FACE);
  objectsToDraw.forEach((object) => {
    //What shader program
    gl.useProgram(object.shaderProgram);
    gl.bindTexture(gl.TEXTURE_2D, texHAX[c]);
    //Uniforms such as the matrix
    gl.uniformMatrix4fv(object.uniforms, false, matrix);
    //Bind VAO
    vaoExt.bindVertexArrayOES(object.vao);

    //Draw the object
    if (drawDragon)
      gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    c++;
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
    //Generate some mipmaps!
    gl.generateMipmap(gl.TEXTURE_2D);
  });
  return texture;
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
function createBufferAndAttribute(bufferData, attribute, type = gl.ARRAY_BUFFER, numComponents = 3, stride = 0, offset = 0) {

  if (typeof attributeName === 'string') {
    //TODO Do something about it!
  }

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, stride, offset);

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
function setAttribute(attribute, numComponents = 3, type = gl.FLOAT, normalize = false) {
  gl.enableVertexAttribArray(attribute);
  //numComponents: (x, y, z)
  //normalize: leave the values as they are
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
function createObjectToDraw(shaderProgram, object, uniformName, texture) {
  //Create VAO
  var vao = vaoExt.createVertexArrayOES();
  // Start setting up VAO  
  vaoExt.bindVertexArrayOES(vao);
  //Create a VBO
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  //CO, UV, NORMALS
  var coAtt = gl.getAttribLocation(shaderProgram, "a_coordinate");
  gl.enableVertexAttribArray(coAtt);
  /*attribute, number of elements per vertex, type, normalize, stride (for packed vertices: 3*4), 
  offset (must be a multiple of the type)*/
  //Stride: 3*vertex, 2*uv, 3*normal,3*bary
  gl.vertexAttribPointer(coAtt, 3, gl.FLOAT, false, 11 * 4, 4);

  texHAX.push(loadTexture("Model/" + texture["name"]));

  var uvAtt = gl.getAttribLocation(shaderProgram, "a_texcoord");
  gl.enableVertexAttribArray(uvAtt);
  gl.vertexAttribPointer(uvAtt, 2, gl.FLOAT, true, 11 * 4, 4 + 3 * 4);

  var noAtt = gl.getAttribLocation(shaderProgram, "a_normal");
  gl.enableVertexAttribArray(noAtt);
  gl.vertexAttribPointer(noAtt, 3, gl.FLOAT, true, 11 * 4, 4 + 3 * 4 + 2 * 4);

  var baryAtt = gl.getAttribLocation(shaderProgram, "a_bary");
  gl.enableVertexAttribArray(baryAtt);
  gl.vertexAttribPointer(baryAtt, 3, gl.FLOAT, true, 11 * 4, 4 + 3 * 4 + 2 * 4 + 3 * 4);
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object), gl.STATIC_DRAW);

  //TODO support more attributes

  //if (textureCoords != -1) {
  //  createVBO(textureCoords);
  //  setAttribute(textureCoordsAttribute, 2);
  //}
  //createTexture(texture["name"], gl.getAttribLocation(shaderProgram, texture["loc"]), texture["vertices"]);

  vaoExt.bindVertexArrayOES(null);

  return {
    shaderProgram: shaderProgram,
    vao: vao,
    bufferLength: (object.length - (2 * (object.length / 11)) - (3 * (object.length / 11)) - (3*(object.length/11)) ), //Subtract the UVs, subtract the vertex normals
    uniforms: gl.getUniformLocation(shaderProgram, uniformName)
  };
}

function addObjectToDraw(shaderProgram, object, uniformName, texture) {
  objectsToDraw.push(
    createObjectToDraw(shaderProgram, object, uniformName, texture));
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
  var yawRad = MatMath.degToRad(yaw);
  var pitchRad = MatMath.degToRad(pitch);
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

//Oh, great </sarcasm> I have to fix this...
function calculateExtendersAndLines() {
  const off = 0.05;
  const threshold = 0.7;
  var faceNormals = [];
  var lines = [];
  if (model["lines"] == undefined) {
    //Face normals
    //Loop over all triangles
    for (var tri = 0; tri < model["vertices"].length; tri += 9) {
      /*
      The cross product of two sides of the triangle equals the surface normal. 
      So, if V = P2 - P1 and W = P3 - P1, and N is the surface normal, then:
      Nx=(Vy*Wz)−(Vz*Wy)
      Ny=(Vz*Wx)−(Vx*Wz)
      Nz=(Vx*Wy)−(Vy*Wx)
*/
      var Vx = model["vertices"][tri + 3] - model["vertices"][tri];
      var Vy = model["vertices"][tri + 4] - model["vertices"][tri + 1];
      var Vz = model["vertices"][tri + 5] - model["vertices"][tri + 2];

      var Wx = model["vertices"][tri + 6] - model["vertices"][tri];
      var Wy = model["vertices"][tri + 7] - model["vertices"][tri + 1];
      var Wz = model["vertices"][tri + 8] - model["vertices"][tri + 2];

      //Face Normals
      var Nx = (Vy * Wz) - (Vz * Wy);
      var Ny = (Vz * Wx) - (Vx * Wz);
      var Nz = (Vx * Wy) - (Vy * Wx);
      //Normals
      faceNormals.push(MatMath.normalize(Nx, Ny, Nz));

      //MatMath.dotProcuct()
    }

    //Flipped triangles
    for (var tri = 0; tri < model["vertices"].length; tri += 9) {
      var adjTriangles = 0;
      for (var triOther = tri + 9; triOther < model["vertices"].length; triOther += 9) {
        var touching = false;
        //For each vertex in that triangle
        otherVert:
          for (var vert = 0; vert < 9; vert += 3) {
            for (var vertOther = 0; vertOther < 6; vertOther += 3) {
              //Check if they are the same point
              if (model.vertices[tri + vert] == model.vertices[triOther + vertOther] &&
                model.vertices[tri + vert + 1] == model.vertices[triOther + vertOther + 1] &&
                model.vertices[tri + vert + 2] == model.vertices[triOther + vertOther + 2]) {
                //One point matches
                //Check if another point matches and make 2 triangles opposite winding orders!
                if ((model.vertices[tri + (vert + 3) % 9] == model.vertices[triOther + (vertOther + 3) % 9] &&
                    model.vertices[tri + (vert + 1 + 3) % 9] == model.vertices[triOther + (vertOther + 1 + 3) % 9] &&
                    model.vertices[tri + (vert + 2 + 3) % 9] == model.vertices[triOther + (vertOther + 2 + 3) % 9]) ||

                  (model.vertices[tri + (vert + 3) % 9] == model.vertices[triOther + (vertOther + 6) % 9] &&
                    model.vertices[tri + (vert + 1 + 3) % 9] == model.vertices[triOther + (vertOther + 1 + 6) % 9] &&
                    model.vertices[tri + (vert + 2 + 3) % 9] == model.vertices[triOther + (vertOther + 2 + 6) % 9])) {
                  if (Math.abs(MatMath.dotProcuct(faceNormals[tri / 9], faceNormals[triOther / 9])) < threshold) {

                    //Subtract face normals, make them larger!
                    //Extenders merge
                    /*backfacingTriangles.push(model.vertices[tri + vert] - faceNormals[tri / 9][0] * off,
                      model.vertices[tri + vert + 1] - faceNormals[tri / 9][1] * off,
                      model.vertices[tri + vert + 2] - faceNormals[tri / 9][2] * off);
                    backfacingTriangles.push(model.vertices[tri + (vert + 6) % 9] - faceNormals[tri / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 6) % 9] - faceNormals[tri / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 6) % 9] - faceNormals[tri / 9][2] * off);
                    backfacingTriangles.push(model.vertices[tri + (vert + 3) % 9] - faceNormals[tri / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 3) % 9] - faceNormals[tri / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 3) % 9] - faceNormals[tri / 9][2] * off);
*/


                    lines.push(model.vertices[tri + vert] + faceNormals[triOther / 9][0] * off,
                      model.vertices[tri + vert + 1] + faceNormals[triOther / 9][1] * off,
                      model.vertices[tri + vert + 2] + faceNormals[triOther / 9][2] * off);
                    lines.push(model.vertices[tri + (vert + 3) % 9] + faceNormals[tri / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 3) % 9] + faceNormals[tri / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 3) % 9] + faceNormals[tri / 9][2] * off);
                    lines.push(model.vertices[tri + (vert + 3) % 9] + faceNormals[triOther / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 3) % 9] + faceNormals[triOther / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 3) % 9] + faceNormals[triOther / 9][2] * off);

                    lines.push(model.vertices[tri + (vert + 3) % 9] + faceNormals[tri / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 3) % 9] + faceNormals[tri / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 3) % 9] + faceNormals[tri / 9][2] * off);
                    lines.push(model.vertices[tri + vert] + faceNormals[triOther / 9][0] * off,
                      model.vertices[tri + vert + 1] + faceNormals[triOther / 9][1] * off,
                      model.vertices[tri + vert + 2] + faceNormals[triOther / 9][2] * off);
                    lines.push(model.vertices[tri + vert] + faceNormals[tri / 9][0] * off,
                      model.vertices[tri + vert + 1] + faceNormals[tri / 9][1] * off,
                      model.vertices[tri + vert + 2] + faceNormals[tri / 9][2] * off);

                    touching = true;
                  }
                  break otherVert;
                }
                if ((model.vertices[tri + (vert + 6) % 9] == model.vertices[triOther + (vertOther + 3) % 9] &&
                    model.vertices[tri + (vert + 1 + 6) % 9] == model.vertices[triOther + (vertOther + 1 + 3) % 9] &&
                    model.vertices[tri + (vert + 2 + 6) % 9] == model.vertices[triOther + (vertOther + 2 + 3) % 9]) ||

                  (model.vertices[tri + (vert + 6) % 9] == model.vertices[triOther + (vertOther + 6) % 9] &&
                    model.vertices[tri + (vert + 1 + 6) % 9] == model.vertices[triOther + (vertOther + 1 + 6) % 9] &&
                    model.vertices[tri + (vert + 2 + 6) % 9] == model.vertices[triOther + (vertOther + 2 + 6) % 9])) {

                  if (Math.abs(MatMath.dotProcuct(faceNormals[tri / 9], faceNormals[triOther / 9])) < threshold) {
                    /*backfacingTriangles.push(model.vertices[triOther + vert] - faceNormals[triOther / 9][0] * off,
                      model.vertices[triOther + vert + 1] - faceNormals[triOther / 9][1] * off,
                      model.vertices[triOther + vert + 2] - faceNormals[triOther / 9][2] * off);
                    backfacingTriangles.push(model.vertices[triOther + (vert + 6) % 9] - faceNormals[triOther / 9][0] * off,
                      model.vertices[triOther + (vert + 1 + 6) % 9] - faceNormals[triOther / 9][1] * off,
                      model.vertices[triOther + (vert + 2 + 6) % 9] - faceNormals[triOther / 9][2] * off);
                    backfacingTriangles.push(model.vertices[triOther + (vert + 3) % 9] - faceNormals[triOther / 9][0] * off,
                      model.vertices[triOther + (vert + 1 + 3) % 9] - faceNormals[triOther / 9][1] * off,
                      model.vertices[triOther + (vert + 2 + 3) % 9] - faceNormals[triOther / 9][2] * off);
*/

                    //Line triangle one
                    lines.push(model.vertices[tri + vert] + faceNormals[tri / 9][0] * off,
                      model.vertices[tri + vert + 1] + faceNormals[tri / 9][1] * off,
                      model.vertices[tri + vert + 2] + faceNormals[tri / 9][2] * off);

                    lines.push(model.vertices[tri + (vert + 6) % 9] + faceNormals[triOther / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 6) % 9] + faceNormals[triOther / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 6) % 9] + faceNormals[triOther / 9][2] * off);

                    lines.push(model.vertices[tri + (vert + 6) % 9] + faceNormals[tri / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 6) % 9] + faceNormals[tri / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 6) % 9] + faceNormals[tri / 9][2] * off);



                    //Line triangle two
                    lines.push(model.vertices[tri + (vert + 6) % 9] + faceNormals[triOther / 9][0] * off,
                      model.vertices[tri + (vert + 1 + 6) % 9] + faceNormals[triOther / 9][1] * off,
                      model.vertices[tri + (vert + 2 + 6) % 9] + faceNormals[triOther / 9][2] * off);

                    lines.push(model.vertices[tri + vert] + faceNormals[tri / 9][0] * off,
                      model.vertices[tri + vert + 1] + faceNormals[tri / 9][1] * off,
                      model.vertices[tri + vert + 2] + faceNormals[tri / 9][2] * off);

                    lines.push(model.vertices[tri + vert] + faceNormals[triOther / 9][0] * off,
                      model.vertices[tri + vert + 1] + faceNormals[triOther / 9][1] * off,
                      model.vertices[tri + vert + 2] + faceNormals[triOther / 9][2] * off);


                    touching = true;
                  }

                }
                break otherVert;
              }
            }
          }
        if (touching) {
          adjTriangles++;
          if (adjTriangles == 3) {
            break;
          }
        }
      }

    }
    model["vertices"].push.apply(model.vertices, lines);
    model["normals"].push.apply(model.normals, new Array(lines.length).fill(0));
    model["uvs"].push.apply(model.uvs, new Array(lines.length).fill(-1));
  }
}
//Crap, same vertex, different vertex normal
/*
for (var ver = 0; ver < model.vertices.length; ver += 3) {
  for (var ver1 = 0; ver1 < model.vertices.length; ver1 += 3) {
    if (model.vertices[ver] == model.vertices[ver1] && model.vertices[ver + 1] == model.vertices[ver1 + 1] && model.vertices[ver + 2] == model.vertices[ver1 + 2]) {
      console.log("Ver" + ver);
      if (model.normals[ver] != model.normals[ver1] || model.normals[ver + 1] != model.normals[ver1 + 1] || model.normals[ver + 2] != model.normals[ver1 + 2]) {
        console.log(model.vertices[ver] + "=" + model.vertices[ver1] + ':' + model.vertices[ver + 1] + "=" + model.vertices[ver1 + 1] + ':' + model.vertices[ver + 2] + "=" + model.vertices[ver1 + 2]);
        console.log(model.normals[ver] + "!=" + model.normals[ver1] + ':' + model.normals[ver + 1] + "!=" + model.normals[ver1 + 1] + ':' + model.normals[ver + 2] + "!=" + model.normals[ver1 + 2]);
        ver = Infinity;
      }
    }
  }
}
*/