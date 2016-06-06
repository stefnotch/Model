/*
git commit -am "your message goes here"
git push
*/
/*global model bones*/
//https://www.opengl.org/wiki/Performance
//http://webglfundamentals.org/webgl/lessons/webgl-2-textures.html
/*TODO
Create class for shader programs
Edit the texture at runtime (Color and edge detection)
Rotate the vertex normals (skelly animation)
Copy over the pos coordinates if the child doesn't have them!
Matrix multiplication library, they are doing everything that I can do, and better
bones
Rotating light source
hide object upon click
USE gl.readPixels and apply an edge detection shader to all textures prefixed with l_
Apply a sharpen shader to all textures prefixed with s_
Triangles that make up the valleys are inside the model. (The ends of the spikes are inside the model)
Don't switch shaders as often

Normalize -> 32 bits (float) to 8 bits (0,1 range)
Move Shaders somewhere else
Matrix inverse
*/
var gl; //WebGL lives in here!
var vaoExt; //Vertex Array Objects extension
var glcanvas; //Our canvas
//Translation
var pos = [30.335550830986044, -178.27499640254624, -75.95519232125257],
  velocity = [0, 0, 0],
  speed = 1;

//Rotation
var pitch = -364,
  yaw = -1085; //15,5
//50, 0
var lightRot = [1, -0.5, -0.3],
  lightPos = [1*10, -0.5*10, -0.3*10];

var objectsToDraw = [];

var transparentObjectsToDraw = [];

var drawDragon = true;

var celLineShader;
var celLineShaderMatrixUniform;
var celLineShaderWidthUniform;
var celLineShaderBoneUniform;

var Mat4 = {
  degToRad: function(angleInDeg) {
    return angleInDeg * Math.PI / 180;
  },
  rotX: function(angle) {
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
  rotY: function(angle) {
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
  rotZ: function(angle) {
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
  translation: function(tx, ty, tz) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  },
  scale: function(scale) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, scale
    ];
  },
  scaleDimensions: function(scaleX, scaleY, scaleZ) {
    return [
      scaleX, 0, 0, 0,
      0, scaleY, 0, 0,
      0, 0, scaleZ, 0,
      0, 0, 0, 1
    ];
  },
  perspective: function(fudgeFactor) {
    //z to w
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, fudgeFactor,
      0, 0, 0, 1,
    ];
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
    } else {
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
    setUpBones();
    vaoExt = gl.getExtension("OES_vertex_array_object");
    //Standard derivatives
    gl.getExtension("OES_standard_derivatives");
    var celLineVertexShader = createShader(`
    attribute vec3 a_coordinate;
    attribute float a_bone;
    attribute vec3 a_normal;
    
    
    uniform float u_width;
    uniform mat4 u_matrix; //The Matrix!
    uniform mat4 u_bones[32]; //32 bones can be moved
    
    void main(void){
      gl_Position = u_matrix * u_bones[int(a_bone)] * vec4(a_coordinate + a_normal * u_width, 1);

    }`, gl.VERTEX_SHADER);

    var celLineFragmentShader = createShader(`
    precision mediump float;

    void main() {
      gl_FragColor = vec4(0,0,0, 1);  // black
    }`, gl.FRAGMENT_SHADER);

    celLineShader = createShaderProgram(celLineVertexShader, celLineFragmentShader);

    celLineShaderMatrixUniform = gl.getUniformLocation(celLineShader, "u_matrix");
    celLineShaderWidthUniform = gl.getUniformLocation(celLineShader, "u_width");
    celLineShaderBoneUniform = gl.getUniformLocation(celLineShader, "u_bones");

    var vertexShader = createShader(`
    attribute vec3 a_coordinate;
    attribute float a_bone;
    attribute vec3 a_normal;
    attribute vec2 a_texcoord;
    attribute vec3 a_bary;
    uniform mat4 u_matrix; //The Matrix!
    uniform mat4 u_bones[32]; //32 bones can be moved
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    varying vec3 v_bary;

    void main(void){
      vec4 vertPos = u_bones[int(a_bone)] * vec4(a_coordinate, 1);
      gl_Position = u_matrix * vertPos;
      
      v_textureCoord = a_texcoord;
      v_normal = vec3(u_bones[int(a_bone)] * vec4(a_normal , 1.0)); //Just rotation and translation
      v_bary = a_bary;
    }`, gl.VERTEX_SHADER);


    //Anime has exactly 2 different shadings, light OR dark
    var fragmentShader = createShader(`
    #extension GL_OES_standard_derivatives : enable
    precision mediump float;
    varying vec2 v_textureCoord;
    varying vec3 v_normal;
    varying vec3 v_bary;
    uniform vec3 u_light;
    uniform sampler2D u_texture;

    void main() {
    if(any(lessThan(v_bary, vec3(0.06)))){
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
    }`, gl.FRAGMENT_SHADER);

    // Put the vertex shader and fragment shader together into
    // a complete program
    var shaderProgram = createShaderProgram(vertexShader, fragmentShader);
    for (var i = 0; i < model.length; i++) {
      addObjectToDraw(shaderProgram, model[i], ["u_matrix", "u_light", "u_bones"], {
        locations: [model[i][0]],
        uniforms: ["u_texture"]
      });
    }
    //Get rid of model, make it easier for the garbage collector
    //model = null;

    //addTransparentObjectToDraw(waterShaderProgram, water, ["coordinates"], "u_matrix", "SharpMap.png");
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
  modelMat = Mat4.multiply(modelMat, Mat4.translation(-pos[0], -pos[1], -pos[2]));
  var viewMat = Mat4.makeInverseCrap(modelMat);


  //Projection matrix => Mat4.makePerspective
  var matrix = Mat4.multiply(viewMat, Mat4.makePerspective(1, glcanvas.clientWidth / glcanvas.clientHeight, 0.5, 1000));
  var boneMat = calculateBones();
  //
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);

  gl.cullFace(gl.FRONT);
  gl.enable(gl.CULL_FACE);

  //Check what is faster: moving this into the other loop or leaving it this way
  objectsToDraw.forEach((object) => {
    //What shader program
    gl.useProgram(celLineShader);
    //Uniforms such as the matrix
    gl.uniformMatrix4fv(celLineShaderMatrixUniform, false, matrix);
    gl.uniformMatrix4fv(celLineShaderBoneUniform, false, boneMat);
    gl.uniform1f(celLineShaderWidthUniform, 0.1);
    //Bind VAO
    vaoExt.bindVertexArrayOES(object.vao);
    //Draw the outlines
    gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    //vaoExt.bindVertexArrayOES(null);
  });

  gl.cullFace(gl.BACK);

  objectsToDraw.forEach((object) => {
    //What shader program
    gl.useProgram(object.shaderProgram);
    for (var i = 0; i < object.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.uniform1i(object.textureUniforms[i], i);
      gl.bindTexture(gl.TEXTURE_2D, object.textures[i]);
    }

    //Uniforms such as the matrix
    gl.uniformMatrix4fv(object.uniforms["u_matrix"], false, matrix);
    gl.uniform3fv(object.uniforms["u_light"], lightRot);
    gl.uniformMatrix4fv(object.uniforms["u_bones"], false, boneMat);
    //Bind VAO
    vaoExt.bindVertexArrayOES(object.vao);

    //Draw the object
    if (drawDragon)
      gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
  });


  gl.disable(gl.CULL_FACE);
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

function calculateBones() {
  //http://webglfundamentals.org/webgl/lessons/resources/person-diagram.html
  var boneMat = [];
  for (var i = 0; i < bones.length; i++) {
    //Rotation matrix
    var rotMat = Mat4.multiply(Mat4.multiply(
        Mat4.rotX(bones[i].rot[0]),
        Mat4.rotY(bones[i].rot[1])),
      Mat4.rotZ(bones[i].rot[2]));

    //The local matrix of the bone
    var localMat =
      Mat4.multiply(
        Mat4.multiply(
          Mat4.translation(-bones[i].pos[0], -bones[i].pos[1], -bones[i].pos[2]),
          rotMat),
        Mat4.translation(bones[i].pos[0], bones[i].pos[1], bones[i].pos[2]));

    //MatMath.translationMatrix(bones[i].pos[0], bones[i].pos[1], bones[i].pos[2])
    //Root bone
    if (bones[i].parent == -1) {
      bones[i].worldMat = localMat;
    } else {
      bones[i].worldMat = Mat4.multiply(bones[bones[i].parent].worldMat, localMat);
    }

    boneMat[bones[i].index] = bones[i].worldMat;
  }

  return [].concat.apply([], boneMat);
}

/**
 * Loads a texture from a URL
 */
function loadTextures(textureLocations) {
  var prefix = "Model/tex/"

  var returnTextures = [];
  for (var i = 0; i < textureLocations.length; i++) {
    if (typeof textureLocations[i] == "string") {
      // Create a texture.
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      var tex = textureLocations[i].split(";");
      //If it is a nonexistent texture
      if (textureLocations[i].indexOf("nonexistent.png") > -1) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
          new Uint8Array([+tex[1] * 255, +tex[2] * 255, +tex[3] * 255, 255]));
        return texture;
      } else {
        // Fill the texture with a 1x1 blue pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 255, 255]));
      }
      // Asynchronously load an image
      var image = new Image();
      image.src = prefix + tex[0];

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
      returnTextures.push(texture);
    } else {
      returnTextures.push(textureLocations[i]);
    }
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
    } else {
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
function createObjectToDraw(shaderProgram, object, uniformNames, textures) {
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
  //Stride: 3*vertex, 2*uv, 3*normal,3*bary,1*bone index
  gl.vertexAttribPointer(coAtt, 3, gl.FLOAT, false, 12 * 4, 4);

  var uvAtt = gl.getAttribLocation(shaderProgram, "a_texcoord");
  gl.enableVertexAttribArray(uvAtt);
  gl.vertexAttribPointer(uvAtt, 2, gl.FLOAT, true, 12 * 4, 4 + 3 * 4);

  var noAtt = gl.getAttribLocation(shaderProgram, "a_normal");
  gl.enableVertexAttribArray(noAtt);
  gl.vertexAttribPointer(noAtt, 3, gl.FLOAT, true, 12 * 4, 4 + 3 * 4 + 2 * 4);

  var baryAtt = gl.getAttribLocation(shaderProgram, "a_bary");
  gl.enableVertexAttribArray(baryAtt);
  gl.vertexAttribPointer(baryAtt, 3, gl.FLOAT, false, 12 * 4, 4 + 3 * 4 + 2 * 4 + 3 * 4);

  var boneAtt = gl.getAttribLocation(shaderProgram, "a_bone");
  gl.enableVertexAttribArray(boneAtt);
  gl.vertexAttribPointer(boneAtt, 1, gl.FLOAT, true, 12 * 4, 4 + 3 * 4 + 2 * 4 + 3 * 4 + 3 * 4);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object), gl.STATIC_DRAW);


  var uniforms = [];
  uniformNames.forEach(s => {
    uniforms[s] = gl.getUniformLocation(shaderProgram, s);
  });

  var textureUniforms = [];
  for (var i = 0; i < textures.uniforms.length; i++) {
    //Shader program texture index
    textureUniforms.push(gl.getUniformLocation(shaderProgram, textures.uniforms[i]), i);
  }

  vaoExt.bindVertexArrayOES(null);

  return {
    shaderProgram: shaderProgram,
    vao: vao,
    bufferLength: (object.length - (2 * (object.length / 12)) - (3 * (object.length / 12)) - (3 * (object.length / 12)) - (1 * (object.length / 12))), //Subtract the UVs, subtract the vertex normals
    uniforms: uniforms,
    textures: loadTextures(textures.locations),
    textureUniforms: textureUniforms
  };
}

function addObjectToDraw(shaderProgram, object, uniformNames, textures) {
  objectsToDraw.push(
    createObjectToDraw(shaderProgram, object, uniformNames, textures));
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
  window.addEventListener("click", mouseClickHandler);

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
    var copyParentPos = false;
    if (bones[i].rot == undefined) {
      bones[i].rot = [0, 0, 0];
    }
    if (bones[i].pos == undefined) {
      bones[i].pos = [0, 0, 0];
    } else if (bones[i].pos == "parent") {
      copyParentPos = true;
    }
    //If the bone's parent is given as a string
    if (typeof bones[i].parent == "string") {
      //Loop over the other bones and find the parent
      for (var j = 0; j < bones.length; j++) {
        if (bones[j].name == bones[i].parent) {
          bones[i].parent = j;
          if (copyParentPos) {
            bones[i].pos = bones[j].pos;
          }
          //If the parent comes after the child, something is wrong
          if (j >= i) {
            throw new Error("Bone parent after child!" + j);
          }
          break;
        }
      }
    }
  }
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
      velocity[0] = Math.sin(yawRad) * Math.cos(pitchRad);
      velocity[1] = -Math.sin(pitchRad);
      velocity[2] = Math.cos(yawRad) * Math.cos(pitchRad);
      break;
    case "KeyS":
    case "ArrowDown":
      velocity[0] = -Math.sin(yawRad) * Math.cos(pitchRad);
      velocity[1] = Math.sin(pitchRad);
      velocity[2] = -Math.cos(yawRad) * Math.cos(pitchRad);
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
  yaw -= mouseEvent.movementX / 10;
  pitch -= mouseEvent.movementY / 10;
}

function mouseClickHandler(mouseEvent) {
  //http://www.opengl-tutorial.org/miscellaneous/clicking-on-objects/picking-with-an-opengl-hack/
  //http://stackoverflow.com/questions/21841483/webgl-using-framebuffers-for-picking-multiple-objects
}