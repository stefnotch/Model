/*global gl createShader shaderProgctor vaoExt*/
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, 2048*4,2048*4, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

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
        gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    });
    //Unbind VAO
    vaoExt.bindVertexArrayOES(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again
}