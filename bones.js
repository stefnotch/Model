/*global mouse rotQuat fetch timeAvg globalTime*/
var glMatrix, quat2;
if (false) {
  glMatrix = require("./gl-matrix-min.js");
  quat2 = require("./glmatrix/quat2.js");
}

//Note: skeleton = boneTree

/**skeleton, skelAnim, OpenGL array {s:, a:, array:}*/
var boneObjects = [];

function createBoneObj(skeleton) {
  return {
    s: skeleton,
    a: [],
    /**
     * So that I don't have to loop over all of the animations every single time
     * First index that gets animated
     */
    aFrontIndex: 0,
    //TODO: I might add a backIndex. Or maybe not.

    array: new glMatrix.ARRAY_TYPE(skeleton.length * 8)
  };
}
//TODO: Maybe..
/*
var boneObj = {
  
};

var skeleton = {
  
};
*/

/*Stuff (Google Keep)
Stuff we need (for each animation):
-Loop (n-times)???
-engine be capable of ignoring animation channels for joints that cannot be found in the skeleton being animated
-Animation Retargeting
- http://portal.acm.org/cita-tion.cfm?id=1450621 and http://chrishecker.com/Real-time_Motion_Retarget-ing_to_Highly_Varied_User-Created_Morphologies
-Metachannels (call functions and whatnot)
-Animations: this one should be LERPed, this one should be prepended (additive blending)

Animations: Separate, so that multiple boneTrees can use the same animation

Bezier/other curve for interpolating (LERPing) between 2 animations (Bezier curve for the time)

Sub-skeletal Animation (Animating only a part of the skeleton)
*/

/**
 * An animation which actually gets executed
 */
var skeletonAnimation = {
  create: function(animation) {
    //Animations that happen at the same time..?
    return {
      /**
       * frames/millisecond
       */
      fpms: animation.defaultFPMS,
      /**When should the animation start*/
      startTime: globalTime,
      animation: animation,
      /**
       * blendWeights add up to 1 -> lerp
       * blendWeights over 1 -> subtract one and additive blending
       * blendWeights == -1 -> override
       */
      blendWeight: -1,
      /**I might remove this*/
      repeatNtimes: 1,
    };
  },
  /**
   * duration = fpms * animation.length
   */
  getDuration: function(whichAnimation) {
    return whichAnimation.fpms * whichAnimation.animation.frames.length;
  },
  /**
   * Duration in milliseconds
   */
  setDuration: function(whichAnimation, duration) {
    whichAnimation.fpms = duration / whichAnimation.animation.frames.length;
  },
  /**
   * localTime = globalTime - startTime
   */
  getLocalTime: function(whichAnimation) {
    return globalTime - whichAnimation.startTime;
  },
  createMeta: function(callFunction) {
    return {
      funtionToCall: callFunction,
      executed: false,
      startTime: globalTime
    };
  },
  addSkelAnim: function(skeletonAnimations, whichAnimation) {
    //Insert a frame sorted by the start time
  },
  //TODO: BAD! BAD! BROKEN!
  /**
   * Applies an animation step (The skeleton will get changed)
   * TODO: Change this: calculateSkeleton will have to be called after this 
   */
  step: function(boneObject) {
    var skelAnims = boneObject.a;
    var i = boneObject.aFrontIndex;
    //Skip all the animations which are over (increment i as long as the end time is over)
    //TODO: Skip the metachannels which already got executed
    //TODO: Metachannels in a different array?
    while (++i &&
      i < skelAnims.length &&
      skelAnims[i].startTime + this.getDuration(skelAnims[i]) < globalTime) {}
    //Set the bone index to the first animation which still has to get executed
    boneObject.aFrontIndex = i - 1;

    //Loop over all animations which will get executed.
    for (var i = boneObject.aFrontIndex; i < skelAnims.length &&
      //TODO: Stop when the start time is after the global time.
      skelAnims[i].startTime < globalTime; i++) {
      var currAnim = skelAnims[i];
      if (currAnim.executed == undefined) {
        this.execute(boneObject, currAnim);
      } else {
        //It is a metachannel
        if (!currAnim.executed) {
          currAnim.funtionToCall();
          currAnim.executed = true;
        }
      }
    }
  },
  /**
   * Is the animation currently getting executed
   */
  isExecuting: function(whichAnimation) {
    return globalTime >= whichAnimation.startTime && whichAnimation.startTime + this.getDuration(whichAnimation) <= globalTime;
  },
  /**
   * TODO: Change this: calculateSkeleton will have to be called after this 
   * An animation (not a meta animation!) will get executed
   */
  execute: function(boneObject, whichAnimation) {
    if (!this.isExecuting(whichAnimation)) return;
    var animation = whichAnimation.animation;
    /*localTime/duration -> normalized
    localTime/(fpms*frames) -> normalized
    localTime/(fpms*frames) * frames -> in the correct range
    localTime/fpms -> in the correct range*/
    //TODO: Negative frame index!
    var frameIndex = this.getLocalTime(whichAnimation) * whichAnimation.fpms;
    //TODO: <1, 1, >1
    if (whichAnimation.blendWeight == 1) {

    }
    //The 2 frames
    var prevFrameIndex = (frameIndex << 0); //<<0 = Math.floor() for positive numbers
    //TODO: After the animation is done, what should I do? This is not the correct behavior! (No loop around)
    var currFrameIndex = (prevFrameIndex + 1) % animation.frames.length; //Math.min(prevFrameIndex + 1, animation.frames.length - 1);

    var prevFrame = animation.frames[prevFrameIndex];
    var currFrame = animation.frames[currFrameIndex];
    //Interpolation factor (between 0 and 1)
    var interpolationFactor = frameIndex - prevFrameIndex;

    //For each bone index in the animation
    for (var i = 0; i < animation.usedBones.length; i++) {
      //Which bone the animation refers to
      var boneIndex = animation.usedBones[i];
      //And interpolate between the 2 bones
      quat2.lerp(boneObject.s[boneIndex].dq, prevFrame[i], currFrame[i], interpolationFactor);
      //quat2.copy(boneObject.s[boneIndex].dq, prevFrame[boneIndex]);
    }
  }
};
var skelAnim = skeletonAnimation;

var animation = {
  create: function() {
    return {
      usedBones: [],
      /**
       * The individual frames:
       * [
       *  [dq1, dq2, ..],
       *  [dq1, dq2, ..]
       * ]
       */
      frames: [
        []
      ],
      defaultFPMS: 0.1 / 1000
    };
  },
  /**
   * Add a skeleton (It has to be set up already)
   * When the animation already has a skeleton, the behavior is undefined
   * TODO: Define the behavior to be something useful. (e.g. Merging animations)
   */
  addSkeleton: function(animation, skeleton) {
    skeleton.forEach((bone, i) => {
      animation.usedBones.push(i);
      animation.frames[0].push(quat2.clone(bone.dq));
    });
  },
  /**
   * animation: which animation should the bone get added to
   * bone: a quat2
   * boneIndex: the index of the bone in the hierarchy
   * returns: Index of the bone (in the frames) that got added
   */
  addBone: function(animation, bone, boneIndex) {
    var usedBoneIndex = indexOfSorted(animation.usedBones, boneIndex);
    //If the animation doesn't already have it
    if (usedBoneIndex < 0) {
      usedBoneIndex = -usedBoneIndex - 1;
      animation.usedBones.splice(usedBoneIndex, 0, boneIndex);
      var frames = animation.frames;
      for (var i = 0; i < frames.length; i++) {
        frames[i].splice(usedBoneIndex, 0, quat2.clone(bone));
      }
    }
    return usedBoneIndex;
  },
  copyFrame: function(frame) {
    var newFrame = new Array(frame.length);
    for (var i = 0; i < newFrame.length; i++) {
      newFrame[i] = quat2.clone(frame[i]);
    }
    return newFrame;
  },
  /**
   * Adds a frame to an animation
   * If the frame if left out, it duplicates the last frame
   * TODO: Number of bones check & merge?
   */
  addFrame: function(animation, frame) {
      if (frame == null || frame == undefined) animation.frames.push(this.copyFrame(animation.frames[animation.frames.length - 1]));
      else animation.frames.push(frame);
    }
    //TODO: Get bone by index
};

var anim = animation;

/**All ~sanely~ possible animations*/
var animations = {
  humanoid: {
    bindpose: anim.create()
  },
  cat: {

  }
};

function indexOfSorted(array, element) {
  //Binary search (low = start, high = end)
  var low = 0,
    high = array.length - 1;
  while (low <= high) {
    var middle = (low + high) >> 1;
    var middleValue = array[middle];
    if (element < middleValue) {
      high = middle - 1;
    } else if (element > middleValue) {
      low = middle + 1;
    } else {
      return middle;
    }
  }
  //Closest value + 1: e.g. [3,4,5,10] find 6 = -4
  //+ 1 so that I can check if the sign is negative
  return -(low + 1);
}

/**
 * Calculates the bones. (Every single tick. That's a bit expensive, but whatever.)
 */
function calculateSkeleton(boneObject) {
  var skeleton = boneObject.s;
  var boneArray = boneObject.array;
  var skelAnimations = boneObject.a;
  var tempBone = quat2.create();
  for (var i = 0; i < skeleton.length; i++) {
    var currBone = skeleton[i];

    //Normalize the quaternions
    quat2.normalize(currBone.dq, currBone.dq);
    var localDualQuat = quat2.clone(currBone.dq);

    //Rotation
    if (i == mouse.selected) {
      quat2.rotateByQuatAppend(localDualQuat, localDualQuat, rotQuat);
      if (mouse.released) {
        var tempAnim = animations.humanoid.bindpose;
        //Add a new frame
        anim.addFrame(tempAnim);
        //Add the bone's bindpose
        var indexOfNewBone = anim.addBone(tempAnim, quat2.clone(currBone.dq), i);
        //Add the changed bone
        tempAnim.frames[tempAnim.frames.length - 1][indexOfNewBone] = quat2.clone(localDualQuat);
      }
    }

    //Root bone
    if (currBone.parent == -1) {
      currBone.dqWorld = localDualQuat;
    } else {
      if (skeleton[currBone.parent].dqWorld == undefined) {
        console.log("Somehow, the parent bone is messed up." + i + " parent: " + currBone.parent);
      }
      //Chain the bones together
      quat2.multiply(currBone.dqWorld, skeleton[currBone.parent].dqWorld, localDualQuat);
    }

    //Flatten it for OpenGL
    quat2.multiply(tempBone, currBone.dqWorld, currBone.dqInverseBindpose);
    //Now the bones are all equal to the root bone/identity (Because of the inverse bindpose)

    //To WXYZ
    boneArray[i * 8] = tempBone[0][3];
    boneArray[i * 8 + 1] = tempBone[0][0];
    boneArray[i * 8 + 2] = tempBone[0][1];
    boneArray[i * 8 + 3] = tempBone[0][2];
    boneArray[i * 8 + 4] = tempBone[1][3];
    boneArray[i * 8 + 4 + 1] = tempBone[1][0];
    boneArray[i * 8 + 4 + 2] = tempBone[1][1];
    boneArray[i * 8 + 4 + 3] = tempBone[1][2];
  }
}

/**
 * Returns the index of the bone
 */
function boneByName(skeleton, name) {
  //Loop over the other bones and find the parent
  for (var i = 0; i < skeleton.length; i++) {
    if (skeleton[i].name == name) {
      return i;
    }
  }
}

function loadModelBones(url) {
  //TODO: Show progress
  return fetch(url, {
    method: "get"
  }).then((response) => {
    if (response.status === 200) {
      return response.text().then((code) => {

        //TODO: REMOVE THIS:
        //TODO: Improve this syntax (No null check..)
        if (animations.humanoid == null) animations.humanoid = {};
        var animHuman = animations.humanoid;
        if (animHuman.bindpose == null) animHuman.bindpose = anim.create();

        //TODO: Use something different. This is horrible?
        //http://www.2ality.com/2014/01/eval.html
        //JSON.parse()
        //Or a compressed format?
        var skeleton = eval(code);
        setUpSkeleton(skeleton);

        var newBoneObj = createBoneObj(skeleton);
        //TODO: REMOVE THIS:
        newBoneObj.a = [
          skelAnim.create(animHuman.bindpose),
        ];
        boneObjects.push(newBoneObj);

      });
    } else {
      throw new Error("fetch failed" + response.status);
    }
  });
}

function setUpSkeleton(skeleton) {
  for (var i = 0; i < skeleton.length; i++) {
    if (skeleton[i].pos == undefined) {
      skeleton[i].pos = [0, 0, 0];
    }
    //Dual Quat
    skeleton[i].dq = quat2.create();
    skeleton[i].dqWorld = quat2.create();
    quat2.fromRotationTranslation(skeleton[i].dq, skeleton[i].qRot, skeleton[i].pos);
    //Inverse bindpose
    skeleton[i].dqInverseBindpose = quat2.create();
    quat2.fromRotationTranslation(skeleton[i].dqInverseBindpose, skeleton[i].offsetRot, skeleton[i].offsetPos);
    quat2.normalize(skeleton[i].dqInverseBindpose, skeleton[i].dqInverseBindpose);
    //If the bone's parent is given as a string
    if (typeof skeleton[i].parent == "string") {
      skeleton[i].parent = boneByName(skeleton[i].parent);
    }
    //If the parent comes after the child, something is wrong
    if (skeleton[i].parent >= i) {
      throw new Error("Bone parent after child!" + i);
    }
  }
}
