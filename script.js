/*
git commit -am "your message goes here"
git push
*/
/*global model bones setUpPicker pickPixel initSidebar animations*/
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

var Mat4 = {
  identity: function() {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
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
/**
 * WXYZ Quaternions
 */
var Quaternion = {
  //https://keithmaggio.wordpress.com/2011/02/15/math-magician-lerp-slerp-and-nlerp/
  //http://physicsforgames.blogspot.co.at/2010/02/quaternions.html
  //http://number-none.com/product/Understanding%20Slerp,%20Then%20Not%20Using%20It/
  //https://gist.github.com/zeux/bedeac66c22b802047b7
  /* Quaternion.fastSlerp = function(start, end, t, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(start)) {
            throw new DeveloperError('start is required.');
        }
        if (!defined(end)) {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        //>>includeEnd('debug');

        var x = Quaternion.dot(start, end);

        var sign;
        if (x >= 0) {
            sign = 1.0;
        } else {
            sign = -1.0;
            x = -x;
        }

        var xm1 = x - 1.0;
        var d = 1.0 - t;
        var sqrT = t * t;
        var sqrD = d * d;

        for (var i = 7; i >= 0; --i) {
            bT[i] = (u[i] * sqrT - v[i]) * xm1;
            bD[i] = (u[i] * sqrD - v[i]) * xm1;
        }

        var cT = sign * t * (
            1.0 + bT[0] * (1.0 + bT[1] * (1.0 + bT[2] * (1.0 + bT[3] * (
            1.0 + bT[4] * (1.0 + bT[5] * (1.0 + bT[6] * (1.0 + bT[7]))))))));
        var cD = d * (
            1.0 + bD[0] * (1.0 + bD[1] * (1.0 + bD[2] * (1.0 + bD[3] * (
            1.0 + bD[4] * (1.0 + bD[5] * (1.0 + bD[6] * (1.0 + bD[7]))))))));

        var temp = Quaternion.multiplyByScalar(start, cD, fastSlerpScratchQuaternion);
        Quaternion.multiplyByScalar(end, cT, result);
        return Quaternion.add(temp, result, result);
};*/
  nlerp1: function(q1, q2, blendFactor) {
    var w1 = q1[0],
      x1 = q1[1],
      y1 = q1[2],
      z1 = q1[3],
      w2 = q2[0],
      x2 = q2[1],
      y2 = q2[2],
      z2 = q2[3];
    var dot = w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2;
    var blendI = 1.0 - blendFactor;
    if (dot < 0) blendFactor = -blendFactor;

    return this.normalize([
      blendI * w1 + blendFactor * w2,
      blendI * x1 + blendFactor * x2,
      blendI * y1 + blendFactor * y2,
      blendI * z1 + blendFactor * z2
    ]);

  },
  nlerp2: function(q1, q2, blendFactor) {
    var w1 = q1[0],
      x1 = q1[1],
      y1 = q1[2],
      z1 = q1[3],
      w2 = q2[0],
      x2 = q2[1],
      y2 = q2[2],
      z2 = q2[3];
    var blendI = 1.0 - blendFactor;

    return this.normalize([
      blendI * w1 + blendFactor * w2,
      blendI * x1 + blendFactor * x2,
      blendI * y1 + blendFactor * y2,
      blendI * z1 + blendFactor * z2
    ]);
  },
  wxyzToMat4: function(w, x, y, z) {
    return [
      1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * w * z, 2 * x * z + 2 * w * y, 0,
      2 * x * y + 2 * w * z, 1 - 2 * x * x - 2 * z * z, 2 * y * z + 2 * w * x, 0,
      2 * x * z - 2 * w * y, 2 * y * z - 2 * w * x, 1 - 2 * x * x - 2 * y * y, 0,
      0, 0, 0, 1
    ];
  },
  toAssimpMat4: function(q) {
    var W = q[0],
      X = q[1],
      Y = q[2],
      Z = q[3];
    var xx = X * X;
    var yy = Y * Y;
    var zz = Z * Z;

    var xy = X * Y;
    var zw = Z * W;
    var zx = Z * X;
    var yw = Y * W;
    var yz = Y * Z;
    var xw = X * W;

    return [
      1.0 - (2.0 * (yy + zz)), //A1
      2.0 * (xy + zw), //B1
      2.0 * (zx - yw), //C1


      0,
      2.0 * (xy - zw), //A2
      1.0 - (2.0 * (zz + xx)), //B2
      2.0 * (yz + xw), //C2

      0,

      2.0 * (zx + yw), //A3
      2.0 * (yz - xw), //B3
      1.0 - (2.0 * (yy + xx)), //C3
      0,
      0, 0, 0, 1
    ];
  },

  toMat4: function(q) {
    var w = q[0],
      x = q[1],
      y = q[2],
      z = q[3];
    return [
      1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * w * z, 2 * x * z + 2 * w * y, 0,
      2 * x * y + 2 * w * z, 1 - 2 * x * x - 2 * z * z, 2 * y * z + 2 * w * x, 0,
      2 * x * z - 2 * w * y, 2 * y * z - 2 * w * x, 1 - 2 * x * x - 2 * y * y, 0,
      0, 0, 0, 1
    ];
  },
  multiply: function(q1, q2) {
    var w1 = q1[0],
      x1 = q1[1],
      y1 = q1[2],
      z1 = q1[3],
      w2 = q2[0],
      x2 = q2[1],
      y2 = q2[2],
      z2 = q2[3];
    return [
      (w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2),
      (w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2),
      (w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2),
      (w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2)
    ];
  },
  xyzAngleToQuaternion: function(axisX, axisY, axisZ, angle) {
    return [
      Math.cos(angle / 2),
      axisX * Math.sin(angle / 2),
      axisY * Math.sin(angle / 2),
      axisZ * Math.sin(angle / 2)
    ];
  },
  axisAngle: function(axis, angle) {
    return [
      Math.cos(angle / 2),
      axis[0] * Math.sin(angle / 2),
      axis[1] * Math.sin(angle / 2),
      axis[2] * Math.sin(angle / 2)
    ];
  },
  normalize: function(q) {
    var length = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
      return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
    } else {
      return [0, 0, 0, 1];
    }
  },
  needsNormalisation: function(q) {
    var number = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    return number < 0.99 || number > 1.01;
  }
};
//Called by the body
function start() {
  console.log = (s) => {
    alert(s.toString())
  };
  console.info = (s) => {
    alert(s.toString())
  };
  console.warn = (s) => {
    alert(s.toString())
  };

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

var currAnimation = "bindpose";

/**
 * Applies a step of an animation. Returns true, if it reached the end
 */
function animationStep(animationName) {
  var a = animations[animationName];
  //Special case
  if (a.frame == 0) {

  } else {
    //The 2 keyframes
    var keyframe1 = a.keyframes[a.frame << 0];
    var keyframe2 = a.keyframes[(a.frame << 0) + 1];

    var interpolationFactor = a.frame % 1; //Really cool
    //For each bone in the animation
    for (var i = 0; i < a.usedBones.length; i++) {
      var boneIndex = a.usedBones[i];
      bones[boneIndex].qRot = Quaternion.nlerp1(
        keyframe1[i], keyframe2[i], interpolationFactor);
    }
  }

  a.frame += 0.05;
  if (a.frame >= a.keyframes.length - 1) {
    a.frame = 0;
    return true;
  }
  return false;
}

function calculateBones() {
  var boneMat = [];
  animationStep(currAnimation);
  for (var i = 0; i < bones.length; i++) {

    //Normalize the quaternions
    if (Quaternion.needsNormalisation(bones[i].qRot)) bones[i].qRot = Quaternion.normalize(bones[i].qRot);
    var localMat = Mat4.multiply(
      Quaternion.toAssimpMat4(bones[i].qRot),
      Mat4.translation(bones[i].pos[0], bones[i].pos[1], bones[i].pos[2])
    );

    //Root bone
    if (bones[i].parent == -1) {
      bones[i].worldMat = localMat;
    } else {
      if (bones[bones[i].parent].worldMat == undefined) {
        console.log(i);
      }

      bones[i].worldMat = Mat4.multiply(localMat, bones[bones[i].parent].worldMat);
    }
    boneMat[i] = Mat4.multiply(bones[i].boneMat, bones[i].worldMat);
  }
  return [].concat.apply([], boneMat);
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
  animations.bindpose.frame = 0;
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