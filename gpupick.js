//Handles the gpu picking
/*global gl vaoExt ShaderProg Mat4 displayText*/

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
        gl.drawArrays(gl.TRIANGLES, 0, object.bufferLength / 3);
    });

    //Read the pixel
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickerPixel);
    displayText.value = pickerPixel[0];
    //Unbind VAO
    vaoExt.bindVertexArrayOES(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Canvas again
}