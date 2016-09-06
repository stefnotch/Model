/*global sidebarStupidFirefox postProcess*/
var rigging = false;
var dots = false;
var shadowOnlyDots = false;

function initSidebar() {
    var options = sidebarStupidFirefox.getElementsByTagName("button");
    for (var i = 0; i < options.length; i++) {
        if (options[i].className == "icon") {
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
            if(dots){
                postProcess.shader.setFSource("#define DOTS");
            } else {
                postProcess.shader.setFSource("");
            }
            break;
        case "dots2":
            shadowOnlyDots = !shadowOnlyDots;
            this.classList.toggle("enabled");
            if(shadowOnlyDots){
                postProcess.shader.setFSource("#define SHADOW_ONLY_DOTS\n#define DOTS"); //TODO Make this better
            } else {
                postProcess.shader.setFSource("");
            }
            break;
            
        case "set light":
             var yawRad = Mat4.degToRad(yaw);
            var pitchRad = Mat4.degToRad(pitch);
            lightRot = [
                -Math.sin(yawRad) * Math.cos(pitchRad), 
                Math.sin(pitchRad), 
                -Math.cos(yawRad) * Math.cos(pitchRad)
                ];
            break;

    }

}