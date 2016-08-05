//Handles the gpu picking
/*global gl vaoExt ShaderProg Mat4 normalsVShader normalsFShader*/

//You need a renderbuffer for the depth texture/test
//glReadPixels 
//http://stackoverflow.com/questions/27800690/gpu-mouse-picking-opengl-webgl
//http://www.hindawi.com/journals/ijcgt/2009/730894/
//http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter06.html
//http://www.hindawi.com/journals/ijcgt/2009/730894/
//http://coffeesmudge.blogspot.co.at/2013/08/implementing-picking-in-webgl.html


var pickerFramebuffer, pickerShader, pickerTexture, pickerPixel;

function setUpPicker() {
    pickerPixel = new Uint8Array(4); //4->RGBA

    // Create the texture
    pickerTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, pickerTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    //Really small texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    //Framebuffer
    pickerFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickerFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickerTexture, 0);

    //Renderbuffer for the depth texture/test
    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 1, 1);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        alert("this combination of attachments does not work");
        return;
    }
    var shadowVertShader = `
    attribute vec3 a_coordinate;
    attribute float a_bone;
    attribute float a_boneWeight;
    attribute vec3 a_normal;
    
    uniform mat4 u_matrix; //The Matrix!
    uniform mat4 u_bones[113]; //128 bones can be moved
    
    varying float v_boneID;
    void main(void){
      gl_Position = u_matrix * u_bones[int(a_bone)]  * a_boneWeight * vec4(a_coordinate, 1);
      v_boneID = a_bone;
    }`;

    var shadowFragShader = `
    precision mediump float;
    varying float v_boneID;
    void main() {
      gl_FragColor = vec4(v_boneID/255.0, 0, 0, 1.0);
    }`;

    pickerShader = new ShaderProg(shadowVertShader, shadowFragShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again

}

//TODO fix/optimize the view matrix
function pickPixel(objectsToDraw, viewMatrix, boneMat) {

    gl.bindFramebuffer(gl.FRAMEBUFFER, pickerFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.cullFace(gl.BACK);
    gl.useProgram(pickerShader.prog);

    objectsToDraw.forEach((object) => {
        //Uniforms
        gl.uniformMatrix4fv(pickerShader.uniforms["u_bones[0]"], false, boneMat);
        gl.uniformMatrix4fv(pickerShader.uniforms["u_matrix"], false, viewMatrix);

        //Bind VAO
        vaoExt.bindVertexArrayOES(object.vao);
        //Draw the outlines
        gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength);
    });

    //Read the pixel
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickerPixel);
    //pickerPixel now contains the relevant pixel
    //Unbind VAO
    vaoExt.bindVertexArrayOES(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again
}

var normalsTex, normalsFramebuffer, normalsShader;

function setUpNormalsRenderer() {
    // Create the texture
    normalsTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, normalsTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    //Framebuffer
    normalsFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, normalsFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, normalsTex, 0);

    //Renderbuffer for the depth texture/test
    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        alert("this combination of attachments does not work");
        return;
    }

    normalsShader = new ShaderProg(normalsVShader, normalsFShader);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again
}

function renderNormals(objectsToDraw, viewMatrix, boneMat) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, normalsFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.cullFace(gl.BACK);
    gl.useProgram(normalsShader.prog);
    //Uniforms
    gl.uniform4fv(normalsShader.uniforms["u_bones[0]"], boneMat);
    gl.uniformMatrix4fv(normalsShader.uniforms["u_matrix"], false, viewMatrix);

    objectsToDraw.forEach((object) => {
        //Bind VAO
        vaoExt.bindVertexArrayOES(object.vao);
        //Draw
        gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength);
    });
    //Unbind VAO
    vaoExt.bindVertexArrayOES(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again
}

/*global createShader shaderProgctor vaoExt*/
var shadowFramebuffer, shadowShaderProgram, shadowLightUniform, shadowBoneUniform;
var depthTexture;

function setUpShadowMap() {
    /*
   glGenTextures(1, &depth_tex);
 glBindTexture(GL_TEXTURE_2D, depth_tex);
 glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
 glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
 glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
 glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
 glTexParameteri(GL_TEXTURE_2D, GL_DEPTH_TEXTURE_MODE, GL_INTENSITY);
 glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_COMPARE_MODE, GL_COMPARE_R_TO_TEXTURE);
 glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_COMPARE_FUNC, GL_LEQUAL);
 //NULL means reserve texture memory, but texels are undefined
 //You can also try GL_DEPTH_COMPONENT16, GL_DEPTH_COMPONENT24 for the internal format.
 //If GL_DEPTH24_STENCIL8_EXT, go ahead and use it (GL_EXT_packed_depth_stencil)
 glTexImage2D(GL_TEXTURE_2D, 0, GL_DEPTH_COMPONENT32, 256, 256, 0, GL_DEPTH_COMPONENT, GL_UNSIGNED_INT, NULL);
 //-------------------------
 glGenFramebuffersEXT(1, &fb);
 glBindFramebufferEXT(GL_FRAMEBUFFER_EXT, fb);
 //Attach
 glFramebufferTexture2DEXT(GL_FRAMEBUFFER_EXT, GL_DEPTH_ATTACHMENT_EXT, GL_TEXTURE_2D, depth_tex, 0);
 //-------------------------
 //Does the GPU support current FBO configuration?
 //Before checking the configuration, you should call these 2 according to the spec.
 //At the very least, you need to call glDrawBuffer(GL_NONE)
 glDrawBuffer(GL_NONE);
 glReadBuffer(GL_NONE);
 GLenum status;
 status = glCheckFramebufferStatusEXT(GL_FRAMEBUFFER_EXT);
 switch(status)
 {
    case GL_FRAMEBUFFER_COMPLETE_EXT:
    cout<<"good";
 default:
    HANDLE_THE_ERROR;
 }
 //-------------------------
 //----and to render to it, don't forget to call
 //At the very least, you need to call glDrawBuffer(GL_NONE)
 glDrawBuffer(GL_NONE);
 glReadBuffer(GL_NONE);
 //-------------------------
 //If you want to render to the back buffer again, you must bind 0 AND THEN CALL glDrawBuffer(GL_BACK)
 //else GL_INVALID_OPERATION will be raised
  glBindFramebufferEXT(GL_FRAMEBUFFER_EXT, 0);
 glDrawBuffer(GL_BACK);
 glReadBuffer(GL_BACK);
  
  */
    var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
    if (!depthTextureExt) {
        alert("No depth textures supported.");
        return;
    }
    // Create the depth texture
    depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.DEPTH_TEXTURE_MODE, gl.INTENSITY);
    //gl.texParameteri(gl.TEXTURE_2D, GL_TEXTURE_COMPARE_MODE, GL_COMPARE_R_TO_TEXTURE);
    //gl.texParameteri(gl.TEXTURE_2D, GL_TEXTURE_COMPARE_FUNC, GL_LEQUAL);
    //Feel free to make the texture a power of 2
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, 2048 * 4, 2048 * 4, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

    shadowFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

    var shadowVertShader = createShader(`
    attribute vec3 a_coordinate;
    attribute float a_bone;
    attribute vec3 a_normal;
    
    uniform mat4 u_light;
    uniform mat4 u_bones[32]; //32 bones can be moved
    
    void main(void){
      gl_Position = u_light * u_bones[int(a_bone)] * vec4(a_coordinate, 1);
    }`, gl.VERTEX_SHADER);

    var shadowFragShader = createShader(`
    precision mediump float;
    void main() {
      gl_FragColor = vec4(0,0,0, 1);  //The GPU is going to ignore this
    }`, gl.FRAGMENT_SHADER);

    shadowShaderProgram = new shaderProgctor(shadowVertShader, shadowFragShader);
    shadowLightUniform = gl.getUniformLocation(shadowShaderProgram, "u_light");
    shadowBoneUniform = gl.getUniformLocation(shadowShaderProgram, "u_bones");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again

}


function renderShadows(lightMat, objectsToDraw, boneMat) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.cullFace(gl.FRONT);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(shadowShaderProgram.prog);

    objectsToDraw.forEach((object) => {
        //Uniforms
        gl.uniformMatrix4fv(shadowBoneUniform, false, boneMat);
        gl.uniformMatrix4fv(shadowLightUniform, false, lightMat);

        //Bind VAO
        vaoExt.bindVertexArrayOES(object.vao);
        //Draw the outlines
        gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength);
    });
    //Unbind VAO
    vaoExt.bindVertexArrayOES(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again
}