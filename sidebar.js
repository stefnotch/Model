/*global sidebarStupidFirefox postProcessOutline*/
var rigging = false;
var dots = false;
var shadowOnlyDots = false;
var dotsFXAA = false;
var colorFXAA = true;
var rotAroundCam = true;
function initSidebar() {
    var options = sidebarStupidFirefox.getElementsByTagName("button");
    for (var i = 0; i < options.length; i++) {
        if (options[i].id == "toggle") {
            options[i].addEventListener("click", event => {
                if (event.target.parentNode.style.transform != "translateX(0%)") {
                    event.target.parentNode.style.transform = "translateX(0%)";
                    event.target.parentNode.style.webkitTransform = "translateX(0%)";
                } else {
                    event.target.parentNode.style.transform = "translateX(-100%)";
                    event.target.parentNode.style.webkitTransform = "translateX(-100%)";
                }
            });
        } else {
            options[i].addEventListener("click", optionClick);
        }
    }
}

function optionClick(event) {
    switch (this.innerHTML.toLowerCase()) {
        case "": //Special case
            //Harharhar, a nested switch statement!
            switch (this.className) {
                case "back":
                    break;
            }
            break;
        case "rig":
            rigging = !rigging;
            this.classList.toggle("enabled");
            break;
        case "dots":
            dots = !dots;
            this.classList.toggle("enabled");
            if (dots) {
                postProcessOutline.shader.fShaderHeader["DOTS"] = true;
                postProcessOutline.shader.fShaderHeader["SHADOW_ONLY_DOTS"] = false;
                postProcessOutline.shader.recompileF();
            } else {
                postProcessOutline.shader.fShaderHeader["DOTS"] = false;
                postProcessOutline.shader.recompileF();
            }
            break;
        case "dots2":
            shadowOnlyDots = !shadowOnlyDots;
            this.classList.toggle("enabled");
            if (shadowOnlyDots) {
                postProcessOutline.shader.fShaderHeader["SHADOW_ONLY_DOTS"] = true;
                postProcessOutline.shader.fShaderHeader["DOTS"] = true;
                postProcessOutline.shader.recompileF();
            } else {
                postProcessOutline.shader.fShaderHeader["SHADOW_ONLY_DOTS"] = false;
                postProcessOutline.shader.fShaderHeader["DOTS"] = false;
                postProcessOutline.shader.recompileF();
            }
            break;
        case "fxaa for dots":
            dotsFXAA = !dotsFXAA;
            this.classList.toggle("enabled");
            if (dotsFXAA) {
                postProcessOutline.shader.fShaderHeader["DOTSFXAA"] = true;
                postProcessOutline.shader.recompileF();
            } else {
                postProcessOutline.shader.fShaderHeader["DOTSFXAA"] = false;
                postProcessOutline.shader.recompileF();
            }
            break;
        case "fxaa for color":
            colorFXAA = !colorFXAA;
            this.classList.toggle("enabled");
            if (colorFXAA) {
                postProcessOutline.shader.fShaderHeader["COLORFXAA"] = true;
                postProcessOutline.shader.recompileF();
            } else {
                postProcessOutline.shader.fShaderHeader["COLORFXAA"] = false;
                postProcessOutline.shader.recompileF();
            }
            break;
        case "set light":
            
            var yawRad = glMatrix.toRadian(yaw);
            var pitchRad = glMatrix.toRadian(pitch);
            lightRot = [-Math.sin(yawRad) * Math.cos(pitchRad),
                Math.sin(pitchRad), -Math.cos(yawRad) * Math.cos(pitchRad)
            ];
            break;
        case "rotate around cam":
            this.classList.toggle("enabled");
            rotAroundCam = !rotAroundCam;
            break;
            
    }

}