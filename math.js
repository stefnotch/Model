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
var Quat = {
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
    add: function(q1, q2) {
        return [q1[0] + q2[0], q1[1] + q2[1], q1[2] + q2[2], q1[3] + q2[3]];
    },
    conjugate: function(q) {
        return [q[0], -q[1], -q[2], -q[3]];
    },
    dot: function(q1, q2) {
        return q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    },
    fromAxisAngle: function(axis, angle) {
        return [
            Math.cos(angle / 2),
            axis[0] * Math.sin(angle / 2),
            axis[1] * Math.sin(angle / 2),
            axis[2] * Math.sin(angle / 2)
        ];
    },
    length: function(q) {
        return Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    },
    lengthSqrt: function(q) {
        return q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    },
    needsNormalisation: function(q) {
        var length = Quat.lengthSqrt(q);
        return length < 0.999 || length > 1.001;
    },
    normalize: function(q) {
        var length = Quat.length(q);
        // make sure we don't divide by 0, the result is undefined
        if (length > 0.00001) {
            return [q[0] / length,
                q[1] / length,
                q[2] / length,
                q[3] / length
            ];
        } else {
            return [0, 0, 0, 1];
        }
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
            (w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2), (w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2), (w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2), (w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2)
        ];
    },
    multiplyScalar: function(q, scalar) {
        return [
            q[0] * scalar, q[1] * scalar, q[2] * scalar, q[3] * scalar
        ];
    },
    toMat4: function(q) {
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
    }
};
//http://wscg.zcu.cz/wscg2012/short/A29-full.pdf
//https://github.com/markaren/DualQuaternion/tree/master/src/main/java/info/laht/dualquat

function DualQuat(real, dual) {
    this.real = real === undefined ? [0, 0, 0, 1] : real;
    this.dual = dual === undefined ? [0, 0, 0, 0] : dual;
}

DualQuat.prototype.conjugate = function() {
    this.real = Quat.conjugate(this.real);
    this.dual = Quat.conjugate(this.dual);
    return this;
};

DualQuat.prototype.copy = function() {
    return new DualQuat(this.real.slice(), this.dual.slice());
};

DualQuat.prototype.getTranslation = function() {
    var t = Quat.multiply(
        Quat.multiplyScalar(this.dual, 2),
        Quat.conjugate(this.real)
    );
    return [t[1], t[2], t[3]];
};
/** input: unit quaternion 'q0', translation vector 't' 
 * output: unit dual quaternion 'dq'
 */
DualQuat.prototype.fromQuatTrans = function(q0, t) {
    if (Quat.needsNormalisation(q0)) q0 = Quat.normalize(q0);
    // non-dual part (just copy q0):
    this.real = q0.slice();
    // dual part:
    this.dual = Quat.multiplyScalar(
        Quat.multiply([0, t[0], t[1], t[2]], this.real),
        0.5);
    return this;
};

DualQuat.prototype.dot = function(dq) {
    return Quat.dot(this.real, dq.real);
};

DualQuat.prototype.normalize = function() {
    var magnitude = Quat.length(this.real);
    if (magnitude < 0.999 || magnitude > 1.001) {
        this.multiplyScalar(1.0 / magnitude);
    }
};

DualQuat.prototype.multiplyScalar = function(scalar) {
    this.real = Quat.multiplyScalar(this.real, scalar);
    this.dual = Quat.multiplyScalar(this.dual, scalar);
    return this;
};

DualQuat.prototype.add = function(dq) {
    this.real = Quat.add(this.real, dq.real);
    this.dual = Quat.add(this.dual, dq.dual);
    return this;
};

DualQuat.prototype.multiply = function(dq) {
    var real = this.real.slice();
    this.real = Quat.multiply(dq.real, this.real);
    this.dual = Quat.add(
        Quat.multiply(dq.dual, real),
        Quat.multiply(dq.real, this.dual));
    return this;
};
DualQuat.prototype.toFAKEMat4 = function() {
    return [
        this.real[0],this.real[1],this.real[2],this.real[3],
        this.dual[0],this.dual[1],this.dual[2],this.dual[3],
        0,0,1,0,
        0,0,0, 1
    ];
}

DualQuat.prototype.toArray = function() {
    return [
        this.real[0],this.real[1],this.real[2],this.real[3],
        this.dual[0],this.dual[1],this.dual[2],this.dual[3],
    ];
}

DualQuat.prototype.toMat4 = function() {
    var W = this.real[0],
        X = this.real[1],
        Y = this.real[2],
        Z = this.real[3];
    var xx = X * X;
    var yy = Y * Y;
    var zz = Z * Z;

    var xy = X * Y;
    var zw = Z * W;
    var zx = Z * X;
    var yw = Y * W;
    var yz = Y * Z;
    var xw = X * W;
    var translation = this.getTranslation();
    return [
        1.0 - (2.0 * (yy + zz)), 2.0 * (xy + zw), 2.0 * (zx - yw), 0,
        2.0 * (xy - zw), 1.0 - (2.0 * (zz + xx)), 2.0 * (yz + xw), 0,
        2.0 * (zx + yw), 2.0 * (yz - xw), 1.0 - (2.0 * (yy + xx)), 0,
        translation[0], translation[1], translation[2], 1
    ];/*
    var w = this.real[0],
        x = this.real[1],
        y = this.real[2],
        z = this.real[3];

    var matrix = Mat4.identity();
    var x2 = x + x,
        y2 = y + y,
        z2 = z + z;
    var xx = x * x2,
        xy = x * y2,
        xz = x * z2;
    var yy = y * y2,
        yz = y * z2,
        zz = z * z2;
    var wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    matrix[0] = 1 - (yy + zz);
    matrix[4] = xy - wz;
    matrix[8] = xz + wy;

    matrix[1] = xy + wz;
    matrix[5] = 1 - (xx + zz);
    matrix[9] = yz - wx;

    matrix[2] = xz - wy;
    matrix[6] = yz + wx;
    matrix[10] = 1 - (xx + yy);

    // last column
    matrix[3] = 0;
    matrix[7] = 0;
    matrix[11] = 0;
    var translation = this.getTranslation();

    // bottom row
    matrix[12] = translation[0];
    matrix[13] = translation[1];
    matrix[14] = translation[2];
    matrix[15] = 1;
    return matrix;*/
};

DualQuat.prototype.setRotationUnoptimized = function(q) {
    var pos = this.getTranslation();
    this.real = [q[0], q[1], q[2], q[3]];
    this.dual = [0, 0, 0, 0];
    this.dual = Quat.multiplyScalar(
        Quat.multiply([0, pos[0], pos[1], pos[2]], this.real),
        0.5);
    
    return this;
};

/*
    public DualQuaternion setRotation(Quaternion q) {

        Vector3d position = getPosition();
        makeRotationFromQuaternion(q);
        return setPosition(position);

}*/