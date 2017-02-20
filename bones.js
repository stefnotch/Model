/*global mouse rotQuat fetch timeAvg globalTime*/
var glMatrix, quat2;
if (false) {
  glMatrix = require("./gl-matrix-min.js");
  quat2 = require("./glmatrix/quat2.js");
}
//TODO: http://giphy.com/gifs/pokemon-nintendo-C2lFQhb2oR0Sk
//Note: skeleton = boneTree

/**skeleton, skelAnim, OpenGL array {s:, a:, array:}*/
var boneObjects = [];

function createBoneObj(skeleton) {
  return {
    s: skeleton,
    anim: [],
    /**
     * So that I don't have to loop over all of the animationClips every single time
     * First index that gets animated
     */
    aFrontIndex: 0,
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
 * An animations consists of a bunch of animationClips (which contain animationSequences)
 */
var animation = {
  addClip: function(_animation, clip) {
    var clipIndex = indexOfSorted(_animation, clip, (a, b) => {
      return a.startTime - b.startTime;
    });
    if (clipIndex < 0) {
      clipIndex = -clipIndex - 1;
    }
    _animation.splice(clipIndex, 0, clip);
    //TODO: Insert a frame sorted by the start time
  },
  /**
   * Applies an animation step (The skeleton will get changed)
   * TODO: Change this: calculateSkeleton will have to be called after this 
   */
  step: function(boneObject) {
    var boneAnims = boneObject.anim;
    var i = boneObject.aFrontIndex;
    //Skip all the animations which are over (increment i as long as the end time is over)

    //TODO: Skip the metachannels which already got played
    //TODO: Metachannels in a different array?
    while (++i &&
      i < boneAnims.length &&
      boneAnims[i].startTime + animClip.getDuration(boneAnims[i]) < globalTime) {}
    //Set the bone index to the first animation which still has to get played
    boneObject.aFrontIndex = i - 1;

    //Loop over all animations which will get played.
    for (var i = boneObject.aFrontIndex; i < boneAnims.length && boneAnims[i].startTime < globalTime; i++) {
      var currAnim = boneAnims[i];
      if (currAnim.played == undefined) {
        animClip.step(currAnim, boneObject);
      } else {
        //It is a metachannel
        if (!currAnim.played) {
          currAnim.funtionToCall();
          currAnim.played = true;
        }
      }
    }
  },
};

var anim = animation;

/**
 * An animation which actually gets played
 */
var animationClip = {
  create: function(_animSeq) {
    return {
      /**
       * frames/millisecond
       */
      fpms: _animSeq.defaultFPMS,
      /**When should the animation start*/
      startTime: globalTime,
      animation: _animSeq,
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
   * duration = frames/fpms
   */
  getDuration: function(whichAnimation) {
    return whichAnimation.animation.frames.length / whichAnimation.fpms;
  },
  /**
   * Duration in milliseconds
   */
  setDuration: function(whichAnimation, duration) {
    whichAnimation.fpms = whichAnimation.animation.frames.length / duration;
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
      played: false,
      startTime: globalTime
    };
  },
  /**
   * Is the animation currently getting played
   */
  isPlaying: function(whichAnimation) {
    return whichAnimation.startTime <= globalTime &&
      globalTime <= whichAnimation.startTime + this.getDuration(whichAnimation);
  },
  /**
   * TODO: Change this: calculateSkeleton will have to be called after this 
   * An animation (not a meta animation!) will get played
   */
  step: function(clip, boneObject) {
    if (!this.isPlaying(clip)) return;
    var animation = clip.animation;
    var frameIndex = this.getLocalTime(clip) * clip.fpms;
    //The 2 frames
    var prevFrameIndex, currFrameIndex;
    //TODO: When we reached the last frame, what should I do? Loop around? Find the next animation?
    if (clip.fpms > 0) {
      prevFrameIndex = (frameIndex << 0); //<<0 = Math.floor() for positive numbers
      currFrameIndex = Math.min(prevFrameIndex + 1, animation.frames.length - 1); //Math.min(prevFrameIndex + 1, animation.frames.length - 1);
      //% animation.frames.length
    } else {
      frameIndex = animation.frames.length - frameIndex;
      prevFrameIndex = Math.ceil(frameIndex);
      currFrameIndex = Math.max(prevFrameIndex - 1, 0);
    }

    //TODO: <1, 1, >1
    if (clip.blendWeight == 1) {

    }

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
var animClip = animationClip;

//TODO: Change this name. I don't like it
/**
 * An animation sequence, the individual frames of an animation
 */
var animationSequence = {
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
      //fps -> fpms
      defaultFPMS: 0.1 / 1000
    };
  },
  /**
   * Add a skeleton (It has to be set up already)
   * When the animSeq already has a skeleton, the behavior is undefined
   * TODO: Define the behavior to be something useful. (e.g. Merging animSeqs)
   */
  addSkeleton: function(_animSeq, skeleton) {
    skeleton.forEach((bone, i) => {
      _animSeq.usedBones.push(i);
      _animSeq.frames[0].push(quat2.clone(bone.dq));
    });
  },
  /**
   * _animSeq: which animSeq should the bone get added to
   * bone: a quat2
   * boneIndex: the index of the bone in the hierarchy
   * returns: Index of the bone (in the frames) that got added
   */
  addBone: function(_animSeq, bone, boneIndex) {
    var bIndex = this.usedBoneIndex(_animSeq, boneIndex);
    //If the animSeq doesn't already have it
    if (bIndex < 0) {
      bIndex = -bIndex - 1;
      _animSeq.usedBones.splice(bIndex, 0, boneIndex);
      var frames = _animSeq.frames;
      for (var i = 0; i < frames.length; i++) {
        frames[i].splice(bIndex, 0, quat2.clone(bone));
      }
    }
    return bIndex;
  },
  copyFrame: function(frame) {
    var newFrame = new Array(frame.length);
    for (var i = 0; i < newFrame.length; i++) {
      newFrame[i] = quat2.clone(frame[i]);
    }
    return newFrame;
  },
  /**
   * Adds a frame to an animSeq
   * If the frame if left out, it duplicates the last frame
   * TODO: Number of bones check & merge?
   */
  addFrame: function(_animSeq, frame) {
    if (frame == null || frame == undefined) _animSeq.frames.push(this.copyFrame(_animSeq.frames[_animSeq.frames.length - 1]));
    else _animSeq.frames.push(frame);
  },
  usedBoneIndex: function(_animSeq, boneIndex) {
    return indexOfSorted(_animSeq.usedBones, boneIndex);
  }
};

var animSeq = animationSequence;

/**All ~sanely~ possible animations*/
var animationSequences = {
  humanoid: {
    bindpose: animSeq.create(),
  },
  cat: {

  }
};

/**
 * Binary search
 * If the compareFunction is null/undefined/left out, it will use <>=
 * The compareFunction(element, array[middle]) has to return: -1,0,1
 * returns: index or -closest index - 1
 */
function indexOfSorted(array, element, compareFunction) {
  //Binary search (low = start, high = end)
  var low = 0,
    high = array.length - 1;
  if (compareFunction == undefined || compareFunction == null) {
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
  } else {
    while (low <= high) {
      var middle = (low + high) >> 1;
      var compareRes = compareFunction(element, array[middle]);
      if (compareRes < 0) {
        high = middle - 1;
      } else if (compareRes > 0) {
        low = middle + 1;
      } else {
        return middle;
      }
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
        //TODO: Multiple animations at the same time:

        var tempAnimSeq = animationSequences.humanoid.bindpose;
        //TODO: Remove this
        //if (Math.random() < 0.5) {

        tempAnimSeq = animSeq.create();

        //Add a new frame
        animSeq.addFrame(tempAnimSeq);
        //Add the bone's bindpose
        var indexOfNewBone = animSeq.addBone(tempAnimSeq, quat2.clone(currBone.dq), i);
        //Add the changed bone
        tempAnimSeq.frames[tempAnimSeq.frames.length - 1][indexOfNewBone] = quat2.clone(localDualQuat);



        anim.addClip(boneObject.anim, animClip.create(tempAnimSeq));

        //}
        /*
        //Add a new frame
        animSeq.addFrame(tempAnimSeq);
        //Add the bone's bindpose
        var indexOfNewBone = animSeq.addBone(tempAnimSeq, quat2.clone(currBone.dq), i);
        //Add the changed bone
        tempAnimSeq.frames[tempAnimSeq.frames.length - 1][indexOfNewBone] = quat2.clone(localDualQuat);*/
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
        if (animationSequences.humanoid == null) animationSequences.humanoid = {};
        var animHuman = animationSequences.humanoid;
        if (animHuman.bindpose == null) animHuman.bindpose = animSeq.create();

        //TODO: Use something different. This is horrible?
        //http://www.2ality.com/2014/01/eval.html
        //JSON.parse()
        //Or a compressed format?
        var skeleton = eval(code);
        setUpSkeleton(skeleton);

        var newBoneObj = createBoneObj(skeleton);
        //TODO: REMOVE THIS:
        newBoneObj.anim = [
          animClip.create(animHuman.bindpose),
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
