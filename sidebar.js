/*global sidebarStupidFirefox rigging*/
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
    }

}