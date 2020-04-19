(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.IMService = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* Copyright 2010 Membase, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var bigInt = require("big-integer");

/*jshint node:true*/


/**
 * Convert a 16-bit quantity (short integer) from host byte order to network byte order (Little-Endian to Big-Endian).
 *
 * @param {Array|Buffer} b Array of octets or a nodejs Buffer
 * @param {number} i Zero-based index at which to write into b
 * @param {number} v Value to convert
 */
exports.htons = function(b, i, v) {
	b[i] = (0xff & (v >> 8));
	b[i + 1] = (0xff & (v));
};


/**
 * Convert a 16-bit quantity (short integer) from network byte order to host byte order (Big-Endian to Little-Endian).
 *
 * @param {Array|Buffer} b Array of octets or a nodejs Buffer to read value from
 * @param {number} i Zero-based index at which to read from b
 * @returns {number}
 */
exports.ntohs = function(b, i) {
	return ((0xff & b[i]) << 8) | 
	       ((0xff & b[i + 1]));
};


/**
 * Convert a 16-bit quantity (short integer) from network byte order to host byte order (Big-Endian to Little-Endian).
 *
 * @param {string} s String to read value from
 * @param {number} i Zero-based index at which to read from s
 * @returns {number}
 */
exports.ntohsStr = function(s, i) {
	return ((0xff & s.charCodeAt(i)) << 8) |
	       ((0xff & s.charCodeAt(i + 1)));
};


/**
 * Convert a 32-bit quantity (long integer) from host byte order to network byte order (Little-Endian to Big-Endian).
 *
 * @param {Array|Buffer} b Array of octets or a nodejs Buffer
 * @param {number} i Zero-based index at which to write into b
 * @param {number} v Value to convert
 */
exports.htonl = function(b, i, v) {
	b[i] = (0xff & (v >> 24));
	b[i + 1] = (0xff & (v >> 16));
	b[i + 2] = (0xff & (v >> 8));
	b[i + 3] = (0xff & (v));
};


/**
 * Convert a 32-bit quantity (long integer) from network byte order to host byte order (Big-Endian to Little-Endian).
 *
 * @param {Array|Buffer} b Array of octets or a nodejs Buffer to read value from
 * @param {number} i Zero-based index at which to read from b
 * @returns {number}
 */
exports.ntohl = function(b, i) {
	return ((0xff & b[i]) << 24) |
	       ((0xff & b[i + 1]) << 16) |
	       ((0xff & b[i + 2]) << 8) |
	       ((0xff & b[i + 3]));
};


/**
 * Convert a 32-bit quantity (long integer) from network byte order to host byte order (Big-Endian to Little-Endian).
 *
 * @param {string} s String to read value from
 * @param {number} i Zero-based index at which to read from s
 * @returns {number}
 */
exports.ntohlStr = function(s, i) {
	return ((0xff & s.charCodeAt(i)) << 24) |
	       ((0xff & s.charCodeAt(i + 1)) << 16) |
	       ((0xff & s.charCodeAt(i + 2)) << 8) |
	       ((0xff & s.charCodeAt(i + 3)));
};

//max int64 2^53
exports.hton64 = function(b, i, v) {
    var h32;
    var l32;
    if (typeof(v) == 'string') {
        var largeNumber = bigInt(v);
        l32 = largeNumber.and(0xffffffff);
        h32 = largeNumber.shiftRight(32);
    } else {
        h32 = Math.floor(v/4294967296);
        l32 = v - h32*4294967296;
    }
    
    b[i] = 0xff & (h32 >> 24);
    b[i+1] = 0xff & (h32 >> 16);
    b[i+2] = 0xff & (h32 >> 8);
    b[i+3] = 0xff & h32;
    b[i+4] = 0xff & (l32 >> 24);
    b[i+5] = 0xff & (l32 >> 16);
    b[i+6] = 0xff & (l32 >> 8);
    b[i+7] = 0xff & l32;
}



exports.ntoh64 = function(b, i) {
    var MAX_INT = 9007199254740992;

    var low32 = ((0xff & b[i+4]) * (1<< 24)) + (((0xff & b[i+5]) << 16)|
                                                ((0xff & b[i+6]) << 8) |
                                                ((0xff & b[i+7])));
    var high32 =  ((0xff & b[i]) << 24) |
                  ((0xff & b[i+1]) << 16)|
                  ((0xff & b[i+2]) << 8)|
                  (0xff & b[i+3]);
                  
    var high = bigInt(high32);


    var v = high.shiftLeft(32).add(low32);
    
    if (v.gt(-MAX_INT) && v.lesser(MAX_INT)) {
        return v.toJSNumber();
    }

    return v.toString();
}

},{"big-integer":3}],2:[function(require,module,exports){
// This is free and unencumbered software released into the public domain.

// Marshals a string to an Uint8Array.
exports.encodeUTF8 = function(s) {
    var i = 0, bytes = new Uint8Array(s.length * 4);
    for (var ci = 0; ci != s.length; ci++) {
	var c = s.charCodeAt(ci);
	if (c < 128) {
	    bytes[i++] = c;
	    continue;
	}
	if (c < 2048) {
	    bytes[i++] = c >> 6 | 192;
	} else {
	    if (c > 0xd7ff && c < 0xdc00) {
		if (++ci >= s.length)
		    throw new Error('UTF-8 encode: incomplete surrogate pair');
		var c2 = s.charCodeAt(ci);
		if (c2 < 0xdc00 || c2 > 0xdfff)
		    throw new Error('UTF-8 encode: second surrogate character 0x' + c2.toString(16) + ' at index ' + ci + ' out of range');
		c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
		bytes[i++] = c >> 18 | 240;
		bytes[i++] = c >> 12 & 63 | 128;
	    } else bytes[i++] = c >> 12 | 224;
	    bytes[i++] = c >> 6 & 63 | 128;
	}
	bytes[i++] = c & 63 | 128;
    }
    return bytes.subarray(0, i);
}

// Unmarshals a string from an Uint8Array.
exports.decodeUTF8 = function(bytes) {
    var i = 0, s = '';
    while (i < bytes.length) {
	var c = bytes[i++];
	if (c > 127) {
	    if (c > 191 && c < 224) {
		if (i >= bytes.length)
		    throw new Error('UTF-8 decode: incomplete 2-byte sequence');
		c = (c & 31) << 6 | bytes[i++] & 63;
	    } else if (c > 223 && c < 240) {
		if (i + 1 >= bytes.length)
		    throw new Error('UTF-8 decode: incomplete 3-byte sequence');
		c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
	    } else if (c > 239 && c < 248) {
		if (i + 2 >= bytes.length)
		    throw new Error('UTF-8 decode: incomplete 4-byte sequence');
		c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
	    } else throw new Error('UTF-8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1));
	}
	if (c <= 0xffff) s += String.fromCharCode(c);
	else if (c <= 0x10ffff) {
	    c -= 0x10000;
	    s += String.fromCharCode(c >> 10 | 0xd800)
	    s += String.fromCharCode(c & 0x3FF | 0xdc00)
	} else throw new Error('UTF-8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach');
    }
    return s;
}

},{}],3:[function(require,module,exports){
var bigInt = (function (undefined) {
    "use strict";

    var BASE = 1e7,
        LOG_BASE = 7,
        MAX_INT = 9007199254740992,
        MAX_INT_ARR = smallToArray(MAX_INT),
        DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

    var supportsNativeBigInt = typeof BigInt === "function";

    function Integer(v, radix, alphabet, caseSensitive) {
        if (typeof v === "undefined") return Integer[0];
        if (typeof radix !== "undefined") return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
        return parseValue(v);
    }

    function BigInteger(value, sign) {
        this.value = value;
        this.sign = sign;
        this.isSmall = false;
    }
    BigInteger.prototype = Object.create(Integer.prototype);

    function SmallInteger(value) {
        this.value = value;
        this.sign = value < 0;
        this.isSmall = true;
    }
    SmallInteger.prototype = Object.create(Integer.prototype);

    function NativeBigInt(value) {
        this.value = value;
    }
    NativeBigInt.prototype = Object.create(Integer.prototype);

    function isPrecise(n) {
        return -MAX_INT < n && n < MAX_INT;
    }

    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
        if (n < 1e7)
            return [n];
        if (n < 1e14)
            return [n % 1e7, Math.floor(n / 1e7)];
        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
    }

    function arrayToSmall(arr) { // If BASE changes this function may need to change
        trim(arr);
        var length = arr.length;
        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
            switch (length) {
                case 0: return 0;
                case 1: return arr[0];
                case 2: return arr[0] + arr[1] * BASE;
                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
            }
        }
        return arr;
    }

    function trim(v) {
        var i = v.length;
        while (v[--i] === 0);
        v.length = i + 1;
    }

    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
        var x = new Array(length);
        var i = -1;
        while (++i < length) {
            x[i] = 0;
        }
        return x;
    }

    function truncate(n) {
        if (n > 0) return Math.floor(n);
        return Math.ceil(n);
    }

    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
        var l_a = a.length,
            l_b = b.length,
            r = new Array(l_a),
            carry = 0,
            base = BASE,
            sum, i;
        for (i = 0; i < l_b; i++) {
            sum = a[i] + b[i] + carry;
            carry = sum >= base ? 1 : 0;
            r[i] = sum - carry * base;
        }
        while (i < l_a) {
            sum = a[i] + carry;
            carry = sum === base ? 1 : 0;
            r[i++] = sum - carry * base;
        }
        if (carry > 0) r.push(carry);
        return r;
    }

    function addAny(a, b) {
        if (a.length >= b.length) return add(a, b);
        return add(b, a);
    }

    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
        var l = a.length,
            r = new Array(l),
            base = BASE,
            sum, i;
        for (i = 0; i < l; i++) {
            sum = a[i] - base + carry;
            carry = Math.floor(sum / base);
            r[i] = sum - carry * base;
            carry += 1;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    BigInteger.prototype.add = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.subtract(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall) {
            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
        }
        return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;

    SmallInteger.prototype.add = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.subtract(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            if (isPrecise(a + b)) return new SmallInteger(a + b);
            b = smallToArray(Math.abs(b));
        }
        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;

    NativeBigInt.prototype.add = function (v) {
        return new NativeBigInt(this.value + parseValue(v).value);
    }
    NativeBigInt.prototype.plus = NativeBigInt.prototype.add;

    function subtract(a, b) { // assumes a and b are arrays with a >= b
        var a_l = a.length,
            b_l = b.length,
            r = new Array(a_l),
            borrow = 0,
            base = BASE,
            i, difference;
        for (i = 0; i < b_l; i++) {
            difference = a[i] - borrow - b[i];
            if (difference < 0) {
                difference += base;
                borrow = 1;
            } else borrow = 0;
            r[i] = difference;
        }
        for (i = b_l; i < a_l; i++) {
            difference = a[i] - borrow;
            if (difference < 0) difference += base;
            else {
                r[i++] = difference;
                break;
            }
            r[i] = difference;
        }
        for (; i < a_l; i++) {
            r[i] = a[i];
        }
        trim(r);
        return r;
    }

    function subtractAny(a, b, sign) {
        var value;
        if (compareAbs(a, b) >= 0) {
            value = subtract(a, b);
        } else {
            value = subtract(b, a);
            sign = !sign;
        }
        value = arrayToSmall(value);
        if (typeof value === "number") {
            if (sign) value = -value;
            return new SmallInteger(value);
        }
        return new BigInteger(value, sign);
    }

    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
        var l = a.length,
            r = new Array(l),
            carry = -b,
            base = BASE,
            i, difference;
        for (i = 0; i < l; i++) {
            difference = a[i] + carry;
            carry = Math.floor(difference / base);
            difference %= base;
            r[i] = difference < 0 ? difference + base : difference;
        }
        r = arrayToSmall(r);
        if (typeof r === "number") {
            if (sign) r = -r;
            return new SmallInteger(r);
        } return new BigInteger(r, sign);
    }

    BigInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.add(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall)
            return subtractSmall(a, Math.abs(b), this.sign);
        return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;

    SmallInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.add(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            return new SmallInteger(a - b);
        }
        return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

    NativeBigInt.prototype.subtract = function (v) {
        return new NativeBigInt(this.value - parseValue(v).value);
    }
    NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;

    BigInteger.prototype.negate = function () {
        return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function () {
        var sign = this.sign;
        var small = new SmallInteger(-this.value);
        small.sign = !sign;
        return small;
    };
    NativeBigInt.prototype.negate = function () {
        return new NativeBigInt(-this.value);
    }

    BigInteger.prototype.abs = function () {
        return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function () {
        return new SmallInteger(Math.abs(this.value));
    };
    NativeBigInt.prototype.abs = function () {
        return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
    }


    function multiplyLong(a, b) {
        var a_l = a.length,
            b_l = b.length,
            l = a_l + b_l,
            r = createArray(l),
            base = BASE,
            product, carry, i, a_i, b_j;
        for (i = 0; i < a_l; ++i) {
            a_i = a[i];
            for (var j = 0; j < b_l; ++j) {
                b_j = b[j];
                product = a_i * b_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
        var l = a.length,
            r = new Array(l),
            base = BASE,
            carry = 0,
            product, i;
        for (i = 0; i < l; i++) {
            product = a[i] * b + carry;
            carry = Math.floor(product / base);
            r[i] = product - carry * base;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    function shiftLeft(x, n) {
        var r = [];
        while (n-- > 0) r.push(0);
        return r.concat(x);
    }

    function multiplyKaratsuba(x, y) {
        var n = Math.max(x.length, y.length);

        if (n <= 30) return multiplyLong(x, y);
        n = Math.ceil(n / 2);

        var b = x.slice(n),
            a = x.slice(0, n),
            d = y.slice(n),
            c = y.slice(0, n);

        var ac = multiplyKaratsuba(a, c),
            bd = multiplyKaratsuba(b, d),
            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

        var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
        trim(product);
        return product;
    }

    // The following function is derived from a surface fit of a graph plotting the performance difference
    // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
    function useKaratsuba(l1, l2) {
        return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
    }

    BigInteger.prototype.multiply = function (v) {
        var n = parseValue(v),
            a = this.value, b = n.value,
            sign = this.sign !== n.sign,
            abs;
        if (n.isSmall) {
            if (b === 0) return Integer[0];
            if (b === 1) return this;
            if (b === -1) return this.negate();
            abs = Math.abs(b);
            if (abs < BASE) {
                return new BigInteger(multiplySmall(a, abs), sign);
            }
            b = smallToArray(abs);
        }
        if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
            return new BigInteger(multiplyKaratsuba(a, b), sign);
        return new BigInteger(multiplyLong(a, b), sign);
    };

    BigInteger.prototype.times = BigInteger.prototype.multiply;

    function multiplySmallAndArray(a, b, sign) { // a >= 0
        if (a < BASE) {
            return new BigInteger(multiplySmall(b, a), sign);
        }
        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype._multiplyBySmall = function (a) {
        if (isPrecise(a.value * this.value)) {
            return new SmallInteger(a.value * this.value);
        }
        return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype._multiplyBySmall = function (a) {
        if (a.value === 0) return Integer[0];
        if (a.value === 1) return this;
        if (a.value === -1) return this.negate();
        return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function (v) {
        return parseValue(v)._multiplyBySmall(this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

    NativeBigInt.prototype.multiply = function (v) {
        return new NativeBigInt(this.value * parseValue(v).value);
    }
    NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;

    function square(a) {
        //console.assert(2 * BASE * BASE < MAX_INT);
        var l = a.length,
            r = createArray(l + l),
            base = BASE,
            product, carry, i, a_i, a_j;
        for (i = 0; i < l; i++) {
            a_i = a[i];
            carry = 0 - a_i * a_i;
            for (var j = i; j < l; j++) {
                a_j = a[j];
                product = 2 * (a_i * a_j) + r[i + j] + carry;
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
            }
            r[i + l] = carry;
        }
        trim(r);
        return r;
    }

    BigInteger.prototype.square = function () {
        return new BigInteger(square(this.value), false);
    };

    SmallInteger.prototype.square = function () {
        var value = this.value * this.value;
        if (isPrecise(value)) return new SmallInteger(value);
        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };

    NativeBigInt.prototype.square = function (v) {
        return new NativeBigInt(this.value * this.value);
    }

    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
        var a_l = a.length,
            b_l = b.length,
            base = BASE,
            result = createArray(b.length),
            divisorMostSignificantDigit = b[b_l - 1],
            // normalization
            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
            remainder = multiplySmall(a, lambda),
            divisor = multiplySmall(b, lambda),
            quotientDigit, shift, carry, borrow, i, l, q;
        if (remainder.length <= a_l) remainder.push(0);
        divisor.push(0);
        divisorMostSignificantDigit = divisor[b_l - 1];
        for (shift = a_l - b_l; shift >= 0; shift--) {
            quotientDigit = base - 1;
            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
                quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
            }
            // quotientDigit <= base - 1
            carry = 0;
            borrow = 0;
            l = divisor.length;
            for (i = 0; i < l; i++) {
                carry += quotientDigit * divisor[i];
                q = Math.floor(carry / base);
                borrow += remainder[shift + i] - (carry - q * base);
                carry = q;
                if (borrow < 0) {
                    remainder[shift + i] = borrow + base;
                    borrow = -1;
                } else {
                    remainder[shift + i] = borrow;
                    borrow = 0;
                }
            }
            while (borrow !== 0) {
                quotientDigit -= 1;
                carry = 0;
                for (i = 0; i < l; i++) {
                    carry += remainder[shift + i] - base + divisor[i];
                    if (carry < 0) {
                        remainder[shift + i] = carry + base;
                        carry = 0;
                    } else {
                        remainder[shift + i] = carry;
                        carry = 1;
                    }
                }
                borrow += carry;
            }
            result[shift] = quotientDigit;
        }
        // denormalization
        remainder = divModSmall(remainder, lambda)[0];
        return [arrayToSmall(result), arrayToSmall(remainder)];
    }

    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
        // Performs faster than divMod1 on larger input sizes.
        var a_l = a.length,
            b_l = b.length,
            result = [],
            part = [],
            base = BASE,
            guess, xlen, highx, highy, check;
        while (a_l) {
            part.unshift(a[--a_l]);
            trim(part);
            if (compareAbs(part, b) < 0) {
                result.push(0);
                continue;
            }
            xlen = part.length;
            highx = part[xlen - 1] * base + part[xlen - 2];
            highy = b[b_l - 1] * base + b[b_l - 2];
            if (xlen > b_l) {
                highx = (highx + 1) * base;
            }
            guess = Math.ceil(highx / highy);
            do {
                check = multiplySmall(b, guess);
                if (compareAbs(check, part) <= 0) break;
                guess--;
            } while (guess);
            result.push(guess);
            part = subtract(part, check);
        }
        result.reverse();
        return [arrayToSmall(result), arrayToSmall(part)];
    }

    function divModSmall(value, lambda) {
        var length = value.length,
            quotient = createArray(length),
            base = BASE,
            i, q, remainder, divisor;
        remainder = 0;
        for (i = length - 1; i >= 0; --i) {
            divisor = remainder * base + value[i];
            q = truncate(divisor / lambda);
            remainder = divisor - q * lambda;
            quotient[i] = q | 0;
        }
        return [quotient, remainder | 0];
    }

    function divModAny(self, v) {
        var value, n = parseValue(v);
        if (supportsNativeBigInt) {
            return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
        }
        var a = self.value, b = n.value;
        var quotient;
        if (b === 0) throw new Error("Cannot divide by zero");
        if (self.isSmall) {
            if (n.isSmall) {
                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
            }
            return [Integer[0], self];
        }
        if (n.isSmall) {
            if (b === 1) return [self, Integer[0]];
            if (b == -1) return [self.negate(), Integer[0]];
            var abs = Math.abs(b);
            if (abs < BASE) {
                value = divModSmall(a, abs);
                quotient = arrayToSmall(value[0]);
                var remainder = value[1];
                if (self.sign) remainder = -remainder;
                if (typeof quotient === "number") {
                    if (self.sign !== n.sign) quotient = -quotient;
                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
                }
                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
            }
            b = smallToArray(abs);
        }
        var comparison = compareAbs(a, b);
        if (comparison === -1) return [Integer[0], self];
        if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

        // divMod1 is faster on smaller input sizes
        if (a.length + b.length <= 200)
            value = divMod1(a, b);
        else value = divMod2(a, b);

        quotient = value[0];
        var qSign = self.sign !== n.sign,
            mod = value[1],
            mSign = self.sign;
        if (typeof quotient === "number") {
            if (qSign) quotient = -quotient;
            quotient = new SmallInteger(quotient);
        } else quotient = new BigInteger(quotient, qSign);
        if (typeof mod === "number") {
            if (mSign) mod = -mod;
            mod = new SmallInteger(mod);
        } else mod = new BigInteger(mod, mSign);
        return [quotient, mod];
    }

    BigInteger.prototype.divmod = function (v) {
        var result = divModAny(this, v);
        return {
            quotient: result[0],
            remainder: result[1]
        };
    };
    NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;


    BigInteger.prototype.divide = function (v) {
        return divModAny(this, v)[0];
    };
    NativeBigInt.prototype.over = NativeBigInt.prototype.divide = function (v) {
        return new NativeBigInt(this.value / parseValue(v).value);
    };
    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

    BigInteger.prototype.mod = function (v) {
        return divModAny(this, v)[1];
    };
    NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = function (v) {
        return new NativeBigInt(this.value % parseValue(v).value);
    };
    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

    BigInteger.prototype.pow = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value,
            value, x, y;
        if (b === 0) return Integer[1];
        if (a === 0) return Integer[0];
        if (a === 1) return Integer[1];
        if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.sign) {
            return Integer[0];
        }
        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
        if (this.isSmall) {
            if (isPrecise(value = Math.pow(a, b)))
                return new SmallInteger(truncate(value));
        }
        x = this;
        y = Integer[1];
        while (true) {
            if (b & 1 === 1) {
                y = y.times(x);
                --b;
            }
            if (b === 0) break;
            b /= 2;
            x = x.square();
        }
        return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;

    NativeBigInt.prototype.pow = function (v) {
        var n = parseValue(v);
        var a = this.value, b = n.value;
        var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2);
        if (b === _0) return Integer[1];
        if (a === _0) return Integer[0];
        if (a === _1) return Integer[1];
        if (a === BigInt(-1)) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.isNegative()) return new NativeBigInt(_0);
        var x = this;
        var y = Integer[1];
        while (true) {
            if ((b & _1) === _1) {
                y = y.times(x);
                --b;
            }
            if (b === _0) break;
            b /= _2;
            x = x.square();
        }
        return y;
    }

    BigInteger.prototype.modPow = function (exp, mod) {
        exp = parseValue(exp);
        mod = parseValue(mod);
        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
        var r = Integer[1],
            base = this.mod(mod);
        while (exp.isPositive()) {
            if (base.isZero()) return Integer[0];
            if (exp.isOdd()) r = r.multiply(base).mod(mod);
            exp = exp.divide(2);
            base = base.square().mod(mod);
        }
        return r;
    };
    NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

    function compareAbs(a, b) {
        if (a.length !== b.length) {
            return a.length > b.length ? 1 : -1;
        }
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    BigInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) return 1;
        return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = Math.abs(this.value),
            b = n.value;
        if (n.isSmall) {
            b = Math.abs(b);
            return a === b ? 0 : a > b ? 1 : -1;
        }
        return -1;
    };
    NativeBigInt.prototype.compareAbs = function (v) {
        var a = this.value;
        var b = parseValue(v).value;
        a = a >= 0 ? a : -a;
        b = b >= 0 ? b : -b;
        return a === b ? 0 : a > b ? 1 : -1;
    }

    BigInteger.prototype.compare = function (v) {
        // See discussion about comparison with Infinity:
        // https://github.com/peterolson/BigInteger.js/issues/61
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (this.sign !== n.sign) {
            return n.sign ? 1 : -1;
        }
        if (n.isSmall) {
            return this.sign ? -1 : 1;
        }
        return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

    SmallInteger.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) {
            return a == b ? 0 : a > b ? 1 : -1;
        }
        if (a < 0 !== n.sign) {
            return a < 0 ? -1 : 1;
        }
        return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

    NativeBigInt.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }
        var a = this.value;
        var b = parseValue(v).value;
        return a === b ? 0 : a > b ? 1 : -1;
    }
    NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;

    BigInteger.prototype.equals = function (v) {
        return this.compare(v) === 0;
    };
    NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

    BigInteger.prototype.notEquals = function (v) {
        return this.compare(v) !== 0;
    };
    NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

    BigInteger.prototype.greater = function (v) {
        return this.compare(v) > 0;
    };
    NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

    BigInteger.prototype.lesser = function (v) {
        return this.compare(v) < 0;
    };
    NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

    BigInteger.prototype.greaterOrEquals = function (v) {
        return this.compare(v) >= 0;
    };
    NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

    BigInteger.prototype.lesserOrEquals = function (v) {
        return this.compare(v) <= 0;
    };
    NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

    BigInteger.prototype.isEven = function () {
        return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function () {
        return (this.value & 1) === 0;
    };
    NativeBigInt.prototype.isEven = function () {
        return (this.value & BigInt(1)) === BigInt(0);
    }

    BigInteger.prototype.isOdd = function () {
        return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function () {
        return (this.value & 1) === 1;
    };
    NativeBigInt.prototype.isOdd = function () {
        return (this.value & BigInt(1)) === BigInt(1);
    }

    BigInteger.prototype.isPositive = function () {
        return !this.sign;
    };
    SmallInteger.prototype.isPositive = function () {
        return this.value > 0;
    };
    NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;

    BigInteger.prototype.isNegative = function () {
        return this.sign;
    };
    SmallInteger.prototype.isNegative = function () {
        return this.value < 0;
    };
    NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;

    BigInteger.prototype.isUnit = function () {
        return false;
    };
    SmallInteger.prototype.isUnit = function () {
        return Math.abs(this.value) === 1;
    };
    NativeBigInt.prototype.isUnit = function () {
        return this.abs().value === BigInt(1);
    }

    BigInteger.prototype.isZero = function () {
        return false;
    };
    SmallInteger.prototype.isZero = function () {
        return this.value === 0;
    };
    NativeBigInt.prototype.isZero = function () {
        return this.value === BigInt(0);
    }

    BigInteger.prototype.isDivisibleBy = function (v) {
        var n = parseValue(v);
        if (n.isZero()) return false;
        if (n.isUnit()) return true;
        if (n.compareAbs(2) === 0) return this.isEven();
        return this.mod(n).isZero();
    };
    NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

    function isBasicPrime(v) {
        var n = v.abs();
        if (n.isUnit()) return false;
        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
        if (n.lesser(49)) return true;
        // we don't know if it's prime: let the other functions figure it out
    }

    function millerRabinTest(n, a) {
        var nPrev = n.prev(),
            b = nPrev,
            r = 0,
            d, t, i, x;
        while (b.isEven()) b = b.divide(2), r++;
        next: for (i = 0; i < a.length; i++) {
            if (n.lesser(a[i])) continue;
            x = bigInt(a[i]).modPow(b, n);
            if (x.isUnit() || x.equals(nPrev)) continue;
            for (d = r - 1; d != 0; d--) {
                x = x.square().mod(n);
                if (x.isUnit()) return false;
                if (x.equals(nPrev)) continue next;
            }
            return false;
        }
        return true;
    }

    // Set "strict" to true to force GRH-supported lower bound of 2*log(N)^2
    BigInteger.prototype.isPrime = function (strict) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var bits = n.bitLength();
        if (bits <= 64)
            return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
        var logN = Math.log(2) * bits.toJSNumber();
        var t = Math.ceil((strict === true) ? (2 * Math.pow(logN, 2)) : logN);
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt(i + 2));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

    BigInteger.prototype.isProbablePrime = function (iterations) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var t = iterations === undefined ? 5 : iterations;
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt.randBetween(2, n.minus(2)));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

    BigInteger.prototype.modInv = function (n) {
        var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
        while (!newR.isZero()) {
            q = r.divide(newR);
            lastT = t;
            lastR = r;
            t = newT;
            r = newR;
            newT = lastT.subtract(q.multiply(newT));
            newR = lastR.subtract(q.multiply(newR));
        }
        if (!r.isUnit()) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
        if (t.compare(0) === -1) {
            t = t.add(n);
        }
        if (this.isNegative()) {
            return t.negate();
        }
        return t;
    };

    NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

    BigInteger.prototype.next = function () {
        var value = this.value;
        if (this.sign) {
            return subtractSmall(value, 1, this.sign);
        }
        return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function () {
        var value = this.value;
        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
        return new BigInteger(MAX_INT_ARR, false);
    };
    NativeBigInt.prototype.next = function () {
        return new NativeBigInt(this.value + BigInt(1));
    }

    BigInteger.prototype.prev = function () {
        var value = this.value;
        if (this.sign) {
            return new BigInteger(addSmall(value, 1), true);
        }
        return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function () {
        var value = this.value;
        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
        return new BigInteger(MAX_INT_ARR, true);
    };
    NativeBigInt.prototype.prev = function () {
        return new NativeBigInt(this.value - BigInt(1));
    }

    var powersOfTwo = [1];
    while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

    function shift_isSmall(n) {
        return Math.abs(n) <= BASE;
    }

    BigInteger.prototype.shiftLeft = function (v) {
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftRight(-n);
        var result = this;
        if (result.isZero()) return result;
        while (n >= powers2Length) {
            result = result.multiply(highestPower2);
            n -= powers2Length - 1;
        }
        return result.multiply(powersOfTwo[n]);
    };
    NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

    BigInteger.prototype.shiftRight = function (v) {
        var remQuo;
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftLeft(-n);
        var result = this;
        while (n >= powers2Length) {
            if (result.isZero() || (result.isNegative() && result.isUnit())) return result;
            remQuo = divModAny(result, highestPower2);
            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
            n -= powers2Length - 1;
        }
        remQuo = divModAny(result, powersOfTwo[n]);
        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

    function bitwise(x, y, fn) {
        y = parseValue(y);
        var xSign = x.isNegative(), ySign = y.isNegative();
        var xRem = xSign ? x.not() : x,
            yRem = ySign ? y.not() : y;
        var xDigit = 0, yDigit = 0;
        var xDivMod = null, yDivMod = null;
        var result = [];
        while (!xRem.isZero() || !yRem.isZero()) {
            xDivMod = divModAny(xRem, highestPower2);
            xDigit = xDivMod[1].toJSNumber();
            if (xSign) {
                xDigit = highestPower2 - 1 - xDigit; // two's complement for negative numbers
            }

            yDivMod = divModAny(yRem, highestPower2);
            yDigit = yDivMod[1].toJSNumber();
            if (ySign) {
                yDigit = highestPower2 - 1 - yDigit; // two's complement for negative numbers
            }

            xRem = xDivMod[0];
            yRem = yDivMod[0];
            result.push(fn(xDigit, yDigit));
        }
        var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
        for (var i = result.length - 1; i >= 0; i -= 1) {
            sum = sum.multiply(highestPower2).add(bigInt(result[i]));
        }
        return sum;
    }

    BigInteger.prototype.not = function () {
        return this.negate().prev();
    };
    NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;

    BigInteger.prototype.and = function (n) {
        return bitwise(this, n, function (a, b) { return a & b; });
    };
    NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;

    BigInteger.prototype.or = function (n) {
        return bitwise(this, n, function (a, b) { return a | b; });
    };
    NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;

    BigInteger.prototype.xor = function (n) {
        return bitwise(this, n, function (a, b) { return a ^ b; });
    };
    NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;

    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) { // get lowestOneBit (rough)
        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
        var v = n.value,
            x = typeof v === "number" ? v | LOBMASK_I :
                typeof v === "bigint" ? v | BigInt(LOBMASK_I) :
                    v[0] + v[1] * BASE | LOBMASK_BI;
        return x & -x;
    }

    function integerLogarithm(value, base) {
        if (base.compareTo(value) <= 0) {
            var tmp = integerLogarithm(value, base.square(base));
            var p = tmp.p;
            var e = tmp.e;
            var t = p.multiply(base);
            return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p: p, e: e * 2 };
        }
        return { p: bigInt(1), e: 0 };
    }

    BigInteger.prototype.bitLength = function () {
        var n = this;
        if (n.compareTo(bigInt(0)) < 0) {
            n = n.negate().subtract(bigInt(1));
        }
        if (n.compareTo(bigInt(0)) === 0) {
            return bigInt(0);
        }
        return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
    }
    NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;

    function max(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.greater(b) ? a : b;
    }
    function min(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        if (a.equals(b)) return a;
        if (a.isZero()) return b;
        if (b.isZero()) return a;
        var c = Integer[1], d, t;
        while (a.isEven() && b.isEven()) {
            d = min(roughLOB(a), roughLOB(b));
            a = a.divide(d);
            b = b.divide(d);
            c = c.multiply(d);
        }
        while (a.isEven()) {
            a = a.divide(roughLOB(a));
        }
        do {
            while (b.isEven()) {
                b = b.divide(roughLOB(b));
            }
            if (a.greater(b)) {
                t = b; b = a; a = t;
            }
            b = b.subtract(a);
        } while (!b.isZero());
        return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        var low = min(a, b), high = max(a, b);
        var range = high.subtract(low).add(1);
        if (range.isSmall) return low.add(Math.floor(Math.random() * range));
        var digits = toBase(range, BASE).value;
        var result = [], restricted = true;
        for (var i = 0; i < digits.length; i++) {
            var top = restricted ? digits[i] : BASE;
            var digit = truncate(Math.random() * top);
            result.push(digit);
            if (digit < top) restricted = false;
        }
        return low.add(Integer.fromArray(result, BASE, false));
    }

    var parseBase = function (text, base, alphabet, caseSensitive) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        text = String(text);
        if (!caseSensitive) {
            text = text.toLowerCase();
            alphabet = alphabet.toLowerCase();
        }
        var length = text.length;
        var i;
        var absBase = Math.abs(base);
        var alphabetValues = {};
        for (i = 0; i < alphabet.length; i++) {
            alphabetValues[alphabet[i]] = i;
        }
        for (i = 0; i < length; i++) {
            var c = text[i];
            if (c === "-") continue;
            if (c in alphabetValues) {
                if (alphabetValues[c] >= absBase) {
                    if (c === "1" && absBase === 1) continue;
                    throw new Error(c + " is not a valid digit in base " + base + ".");
                }
            }
        }
        base = parseValue(base);
        var digits = [];
        var isNegative = text[0] === "-";
        for (i = isNegative ? 1 : 0; i < text.length; i++) {
            var c = text[i];
            if (c in alphabetValues) digits.push(parseValue(alphabetValues[c]));
            else if (c === "<") {
                var start = i;
                do { i++; } while (text[i] !== ">" && i < text.length);
                digits.push(parseValue(text.slice(start + 1, i)));
            }
            else throw new Error(c + " is not a valid character");
        }
        return parseBaseFromArray(digits, base, isNegative);
    };

    function parseBaseFromArray(digits, base, isNegative) {
        var val = Integer[0], pow = Integer[1], i;
        for (i = digits.length - 1; i >= 0; i--) {
            val = val.add(digits[i].times(pow));
            pow = pow.times(base);
        }
        return isNegative ? val.negate() : val;
    }

    function stringify(digit, alphabet) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        if (digit < alphabet.length) {
            return alphabet[digit];
        }
        return "<" + digit + ">";
    }

    function toBase(n, base) {
        base = bigInt(base);
        if (base.isZero()) {
            if (n.isZero()) return { value: [0], isNegative: false };
            throw new Error("Cannot convert nonzero numbers to base 0.");
        }
        if (base.equals(-1)) {
            if (n.isZero()) return { value: [0], isNegative: false };
            if (n.isNegative())
                return {
                    value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber()))
                        .map(Array.prototype.valueOf, [1, 0])
                    ),
                    isNegative: false
                };

            var arr = Array.apply(null, Array(n.toJSNumber() - 1))
                .map(Array.prototype.valueOf, [0, 1]);
            arr.unshift([1]);
            return {
                value: [].concat.apply([], arr),
                isNegative: false
            };
        }

        var neg = false;
        if (n.isNegative() && base.isPositive()) {
            neg = true;
            n = n.abs();
        }
        if (base.isUnit()) {
            if (n.isZero()) return { value: [0], isNegative: false };

            return {
                value: Array.apply(null, Array(n.toJSNumber()))
                    .map(Number.prototype.valueOf, 1),
                isNegative: neg
            };
        }
        var out = [];
        var left = n, divmod;
        while (left.isNegative() || left.compareAbs(base) >= 0) {
            divmod = left.divmod(base);
            left = divmod.quotient;
            var digit = divmod.remainder;
            if (digit.isNegative()) {
                digit = base.minus(digit).abs();
                left = left.next();
            }
            out.push(digit.toJSNumber());
        }
        out.push(left.toJSNumber());
        return { value: out.reverse(), isNegative: neg };
    }

    function toBaseString(n, base, alphabet) {
        var arr = toBase(n, base);
        return (arr.isNegative ? "-" : "") + arr.value.map(function (x) {
            return stringify(x, alphabet);
        }).join('');
    }

    BigInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    SmallInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    NativeBigInt.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    BigInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined) radix = 10;
        if (radix !== 10) return toBaseString(this, radix, alphabet);
        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
        while (--l >= 0) {
            digit = String(v[l]);
            str += zeros.slice(digit.length) + digit;
        }
        var sign = this.sign ? "-" : "";
        return sign + str;
    };

    SmallInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined) radix = 10;
        if (radix != 10) return toBaseString(this, radix, alphabet);
        return String(this.value);
    };

    NativeBigInt.prototype.toString = SmallInteger.prototype.toString;

    NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function () { return this.toString(); }

    BigInteger.prototype.valueOf = function () {
        return parseInt(this.toString(), 10);
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

    SmallInteger.prototype.valueOf = function () {
        return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
    NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function () {
        return parseInt(this.toString(), 10);
    }

    function parseStringValue(v) {
        if (isPrecise(+v)) {
            var x = +v;
            if (x === truncate(x))
                return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
            throw new Error("Invalid integer: " + v);
        }
        var sign = v[0] === "-";
        if (sign) v = v.slice(1);
        var split = v.split(/e/i);
        if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
        if (split.length === 2) {
            var exp = split[1];
            if (exp[0] === "+") exp = exp.slice(1);
            exp = +exp;
            if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
            var text = split[0];
            var decimalPlace = text.indexOf(".");
            if (decimalPlace >= 0) {
                exp -= text.length - decimalPlace - 1;
                text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
            }
            if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
            text += (new Array(exp + 1)).join("0");
            v = text;
        }
        var isValid = /^([0-9][0-9]*)$/.test(v);
        if (!isValid) throw new Error("Invalid integer: " + v);
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(sign ? "-" + v : v));
        }
        var r = [], max = v.length, l = LOG_BASE, min = max - l;
        while (max > 0) {
            r.push(+v.slice(min, max));
            min -= l;
            if (min < 0) min = 0;
            max -= l;
        }
        trim(r);
        return new BigInteger(r, sign);
    }

    function parseNumberValue(v) {
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(v));
        }
        if (isPrecise(v)) {
            if (v !== truncate(v)) throw new Error(v + " is not an integer.");
            return new SmallInteger(v);
        }
        return parseStringValue(v.toString());
    }

    function parseValue(v) {
        if (typeof v === "number") {
            return parseNumberValue(v);
        }
        if (typeof v === "string") {
            return parseStringValue(v);
        }
        if (typeof v === "bigint") {
            return new NativeBigInt(v);
        }
        return v;
    }
    // Pre-define numbers in range [-999,999]
    for (var i = 0; i < 1000; i++) {
        Integer[i] = parseValue(i);
        if (i > 0) Integer[-i] = parseValue(-i);
    }
    // Backwards compatibility
    Integer.one = Integer[1];
    Integer.zero = Integer[0];
    Integer.minusOne = Integer[-1];
    Integer.max = max;
    Integer.min = min;
    Integer.gcd = gcd;
    Integer.lcm = lcm;
    Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt; };
    Integer.randBetween = randBetween;

    Integer.fromArray = function (digits, base, isNegative) {
        return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
    };

    return Integer;
})();

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    module.exports = bigInt;
}

//amd check
if (typeof define === "function" && define.amd) {
    define("big-integer", [], function () {
        return bigInt;
    });
}

},{}],4:[function(require,module,exports){
(function (global){
var order = require('./byte_order');
var utf8 = require("./utf8");

var hton64 = order.hton64;
var ntoh64 = order.ntoh64;
var htonl = order.htonl;
var ntohl = order.ntohl;

module.exports = IMService;

function IMService() {
    this.host = "imnode2.gobelieve.io";
    if (global.location && 'https:' === location.protocol) {
        this.port = 14891;
    } else {
        this.port = 13891;
    }
    this.protocol = undefined;

    this.accessToken = "";
    this.syncKey = 0;
    this.groupSyncKeys = {};

    this.observer = null;
    this.voipObserver = null;

    this.socket = null;
    this.connectFailCount = 0;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.seq = 0;
    this.stopped = true;
    this.roomID = 0;
    //sending message
    this.messages = {};
    this.groupMessages = {};
    this.customerMessages = {};
    this.isSyncing = false;
    this.syncTimestamp = 0;
    this.pendingSyncKey = 0;

    this.pingTimer = null;
    this.pingTimestamp = 0;
    this.ping = this.ping.bind(this);
    this.device_id = IMService.guid();
}

IMService.HEADSIZE = 12;
IMService.VERSION = 1;

IMService.STATE_UNCONNECTED = 0;
IMService.STATE_CONNECTING = 1;
IMService.STATE_CONNECTED = 2;
IMService.STATE_CONNECTFAIL = 3;
IMService.STATE_AUTHENTICATION_FAIL = 4;

IMService.ACK_TIMEOUT = 5;//ack 超时5s,主动断开socket

IMService.MSG_AUTH_STATUS = 3;
IMService.MSG_IM = 4;
IMService.MSG_ACK = 5;
IMService.MSG_RST = 6;
IMService.MSG_GROUP_NOTIFICATION = 7;
IMService.MSG_GROUP_IM = 8;
IMService.MSG_PEER_ACK = 9;
IMService.MSG_PING = 13;
IMService.MSG_PONG = 14;
IMService.MSG_AUTH_TOKEN = 15;
IMService.MSG_RT = 17;
IMService.MSG_ENTER_ROOM = 18;
IMService.MSG_LEAVE_ROOM = 19;
IMService.MSG_ROOM_IM = 20;
IMService.MSG_SYSTEM = 21;

IMService.MSG_CUSTOMER = 24;
IMService.MSG_CUSTOMER_SUPPORT = 25;

IMService.MSG_SYNC = 26;
IMService.MSG_SYNC_BEGIN = 27;
IMService.MSG_SYNC_END = 28;
IMService.MSG_SYNC_NOTIFY = 29;
IMService.MSG_SYNC_GROUP = 30;
IMService.MSG_SYNC_GROUP_BEGIN = 31;
IMService.MSG_SYNC_GROUP_END = 32;
IMService.MSG_SYNC_GROUP_NOTIFY = 33;
IMService.MSG_SYNC_KEY = 34;
IMService.MSG_GROUP_SYNC_KEY = 35;

IMService.MSG_NOTIFICATION = 36;
IMService.MSG_METADATA = 37;


//消息标志
IMService.MESSAGE_FLAG_TEXT = 1;
IMService.MESSAGE_FLAG_UNPERSISTENT = 2;
IMService.MESSAGE_FLAG_SELF = 8;
IMService.MESSAGE_FLAG_PUSH = 16;
IMService.MESSAGE_FLAG_SUPER_GROUP = 32;

IMService.PLATFORM_ID = 3;
IMService.HEARTBEAT = 60*3;

IMService.prototype.start = function () {
    if (!this.stopped) {
        console.log("im service already be started");
        return;
    }
    console.log("start im service");
    this.stopped = false;
    this.connect()
    this.pingTimer = setInterval(this.ping, IMService.HEARTBEAT*1000);
};

IMService.prototype.stop = function () {
    if (this.stopped) {
        console.log("im service already be stopped");
        return;
    }
    console.log("stop im service");
    this.stopped = true;
    if (this.socket == null) {
        return;
    }
    console.log("close socket");
    this.socket.close();
    this.socket = null;
    clearInterval(this.pingTimer);
    this.pingTimer = null;
};

IMService.prototype.callStateObserver = function () {
    if (this.observer != null && "onConnectState" in this.observer) {
        this.observer.onConnectState(this.connectState)
    }
};

IMService.prototype.connect = function () {
    if (this.stopped) {
        console.log("im service stopped");
        return;
    }
    if (this.socket != null) {
        console.log("socket is't null")
        return;
    }

    this.connectState = IMService.STATE_CONNECTING;
    this.callStateObserver();

    var protocol;
    if (this.protocol) {
        protocol = this.protocol;
    } else {
        protocol = ('https:' === location.protocol) ? "wss://" : "ws://";
    }
    var url = protocol + this.host + ":" + this.port.toString() + "/ws" ;
    console.log("connect protocol:", protocol, " host:", this.host, " port:", this.port);
    
    var BrowserWebSocket = global.WebSocket || global.MozWebSocket;    
    this.socket = new BrowserWebSocket(url);
    this.socket.binaryType = 'arraybuffer';
    
    var self = this;
    this.socket.onopen = function(evt) {
        self.onOpen();
    }

    this.socket.onerror = function(event) {
        self.onError(event);        
    };    
};

IMService.prototype.ping = function () {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    console.log("ping...");
    this.sendPing()
    if (this.pingTimestamp == 0) {
        this.pingTimestamp = Math.floor(new Date().getTime()/1000);
    }

    var self = this;
    setTimeout(function() {
        var now = Math.floor(new Date().getTime()/1000);
        if (self.pingTimestamp > 0 && now - self.pingTimestamp >= 3) {
            console.log("ping timeout");
            if (self.connectState == IMService.STATE_CONNECTED) {
                //trigger close event                
                self.socket.close();
                self.socket = null;
            }
        }
    }, 3100);
}

IMService.prototype.onOpen = function () {
    console.log("socket opened");
    var self = this;
    this.socket.onmessage = function(message) {
        self.onMessage(message.data)
    };
    this.socket.onclose = function() {
        console.log("socket disconnect");
        self.onClose();
    };

    this.seq = 0;
    this.connectState = IMService.STATE_CONNECTED;
    this.metaMessage = undefined;
    
    this.sendAuth();
    if (this.roomID > 0) {
        this.sendEnterRoom(this.roomID);
    }
    this.sendSync(this.syncKey);
    this.isSyncing = true;
    var now = new Date().getTime() / 1000;    
    this.syncTimestamp = now;
    this.pendingSyncKey = 0;
    
    for (var groupID in this.groupSyncKeys) {
        var s = this.groupSyncKeys[groupID];
        this.sendGroupSync(groupID, s);
    }

    this.callStateObserver();    
};

IMService.prototype.handleACK = function(msg) {
    var ack = msg.ack;
    if (ack in this.messages) {
        var m = this.messages[ack];
        delete(m.__sendTimestamp__);
        if (this.observer != null && "handleMessageACK" in this.observer){
            this.observer.handleMessageACK(m);
        }
        delete this.messages[ack];
    }
    if (ack in this.customerMessages) {
        var m = this.customerMessages[ack];
        delete(m.__sendTimestamp__);
        if (this.observer != null && "handleCustomerMessageACK" in this.observer){
            this.observer.handleCustomerMessageACK(m);
        }
        delete this.customerMessages[ack];
    }

    var groupMessage;
    for (ack in this.groupMessages) {
        var m = this.groupMessages[ack];
        delete(m.__sendTimestamp__);
        if (this.observer != null && "handleGroupMessageACK" in this.observer){
            this.observer.handleGroupMessageACK(m);
        }
        groupMessage = m;
        delete this.groupMessages[ack];
    }


    var metaMessage = this.metaMessage;
    var metadata;
    this.metaMessage = undefined;

    if (metaMessage && metaMessage.seq + 1 == msg.seq) {
        metadata = metaMessage;

        if (metadata.prevSyncKey == 0 || metadata.syncKey == 0) {
            return;
        }

        var newSyncKey = metadata.syncKey;

        if (msg.flag & IMService.MESSAGE_FLAG_SUPER_GROUP) {
            if (!groupMessage) {
                return;
            }
            var groupID = groupMessage.receiver;
            var groupSyncKey = 0;
            if (groupID in this.groupSyncKeys) {
                groupSyncKey = this.groupSyncKeys[groupID];
            }

            if (metadata.prevSyncKey == groupSyncKey && newSyncKey != groupSyncKey) {
                this.groupSyncKeys[groupID] = newSyncKey;
                this.sendGroupSyncKey(groupID, newSyncKey);
                if (this.observer != null &&
                    "saveSuperGroupSyncKey" in this.observer) {
                    this.observer.saveSuperGroupSyncKey(groupID, newSyncKey);
                }
            }
        } else {
            if (this.syncKey == metadata.prevSyncKey && newSyncKey != this.syncKey) {
                this.syncKey = newSyncKey;
                this.sendSyncKey(this.syncKey);

                if (this.observer != null &&
                    "saveSyncKey" in this.observer){
                    this.observer.saveSyncKey(this.syncKey);
                }                
            }
        }
    }    
};

IMService.prototype.handleMessage = function(msg) {
    var seq = msg.seq;
    var cmd = msg.cmd;

    console.log("handle message:", msg);
    //处理服务器推到客户端的消息
    if (msg.flag & IMService.MESSAGE_FLAG_PUSH) {
        var metaMessage =  this.metaMessage;
        this.metaMessage = undefined;
        var metadata;
        if (metaMessage && metaMessage.seq + 1 == msg.seq) {
            metadata = metaMessage;
        } else {
            return;
        }

        if (metadata.prevSyncKey == 0 || metadata.syncKey == 0) {
            return;
        }
        
        //校验metadata中的synckey是否连续        
        if (msg.flag & IMService.MESSAGE_FLAG_SUPER_GROUP) {
            var groupID;
            if (cmd == IMService.MSG_GROUP_IM) {
                groupID = msg.receiver;
            } else {
                return;
            }
            
            var groupSyncKey = 0;
            if (groupID in this.groupSyncKeys) {
                groupSyncKey = this.groupSyncKeys[groupID];
            }

            if (metadata.prevSyncKey != groupSyncKey) {
                console.log("sync key is not sequence:", metadata.prevSyncKey, "----", groupSyncKey);
                return;
            }
        } else {
            if (metadata.prevSyncKey != this.syncKey) {
                console.log("sync key is not sequence:", metadata.prevSyncKey, "----", this.syncKey);
                return;
            }
        }
    }
    
    if (cmd == IMService.MSG_IM) {
          console.log("im message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handlePeerMessage" in this.observer) {
            this.observer.handlePeerMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_GROUP_IM) {
        console.log("im message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handleGroupMessage" in this.observer) {
            this.observer.handleGroupMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_GROUP_NOTIFICATION) {
        if (this.observer != null && "handleGroupNotification" in this.observer) {
            this.observer.handleGroupNotification(msg.content);
        }    
        this.sendACK(seq);
    } else if (cmd == IMService.MSG_CUSTOMER) {
        console.log("customer message customer appid:" + msg.customerAppID + 
                    " customer id:" + msg.customerID + " store id:" + msg.storeID + " seller id:" + 
                    msg.sellerID + "content:" + msg.content);

        if (this.observer != null && "handleCustomerMessage" in this.observer) {
            this.observer.handleCustomerMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_CUSTOMER_SUPPORT) {
       

        console.log("customer support message customer appid:" + msg.customerAppID + 
                    " customer id:" + msg.customerID + " store id:" + msg.storeID + 
                    " seller id:" + msg.sellerID + "content:" + msg.content);

        if (this.observer != null && "handleCustomerSupportMessage" in this.observer) {
            this.observer.handleCustomerSupportMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_RT) {
        console.log("rt message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handleRTMessage" in this.observer) {
            this.observer.handleRTMessage(msg);
        }
    } else if (cmd == IMService.MSG_ROOM_IM) {
  
        console.log("room message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handleRoomMessage" in this.observer) {
            this.observer.handleRoomMessage(msg);
        }
    } else if (cmd == IMService.MSG_AUTH_STATUS) {
        var status = msg.status;
        console.log("auth status:" + status);
        if (status != 0) {
            this.connectState = IMService.STATE_AUTHENTICATION_FAIL;
            this.callStateObserver();
        } else {
            this.connectFailCount = 0;
        }
    } else if (cmd == IMService.MSG_ACK) {
        this.handleACK(msg);
    } else if (cmd == IMService.MSG_SYNC_NOTIFY) {
        var newSyncKey = msg.syncKey
        console.log("sync notify:" + newSyncKey);

        var now = new Date().getTime() / 1000;
        var isSyncing = this.isSyncing && (now - this.syncTimestamp < 4);
        if (!isSyncing && this.syncKey < newSyncKey) {
            this.sendSync(this.syncKey);
            this.isSyncing = true;
            this.syncTimestamp = now;
            this.pendingSyncKey = 0;
        } else if (newSyncKey > this.pendingSyncKey) {
            this.pendingSyncKey = newSyncKey;
        }
    } else if (cmd == IMService.MSG_SYNC_BEGIN) {
        var newSyncKey = msg.syncKey;
        console.log("sync begin:" + newSyncKey);
        
    } else if (cmd == IMService.MSG_SYNC_END) {
        var newSyncKey = msg.syncKey;
        
        console.log("sync end:" + newSyncKey);
        if (newSyncKey != this.syncKey) {
            this.syncKey = newSyncKey;
            this.sendSyncKey(this.syncKey);

            if (this.observer != null &&
                "saveSyncKey" in this.observer){
                this.observer.saveSyncKey(this.syncKey);
            }
        }

        if (this.observer != null &&
            "handleSyncEnd" in this.observer) {
            this.observer.handleSyncEnd(this.syncKey);
        }

        var now = new Date().getTime() / 1000;
        this.isSyncing = false;
        if (this.pendingSyncKey > this.syncKey) {
            this.sendSync(this.syncKey);
            this.isSyncing = true;
            this.syncTimestamp = now;
            this.pendingSyncKey = 0;
        }
    } else if (cmd == IMService.MSG_SYNC_GROUP_NOTIFY) {
        var groupID = msg.groupID;
        var newSyncKey = msg.syncKey;
        console.log("sync group notify:" + groupID + 
                    " sync key: " + newSyncKey);
        
        var groupSyncKey = 0;
        if (groupID in this.groupSyncKeys) {
            groupSyncKey = this.groupSyncKeys[groupID];
        }
        if (newSyncKey > groupSyncKey) {
            this.sendGroupSync(groupID, this.groupSyncKeys[groupID]);
        }
    } else if (cmd == IMService.MSG_SYNC_GROUP_BEGIN) {
        var groupID = msg.groupID;
        var newSyncKey = msg.syncKey;
        console.log("sync group begin:" + groupID + 
                    " sync key: " + newSyncKey);
        
    } else if (cmd == IMService.MSG_SYNC_GROUP_END) {
        var groupID = msg.groupID;
        var newSyncKey = msg.syncKey;        
        console.log("sync group end:" + groupID + 
                    " sync key: " + newSyncKey);

        var groupSyncKey = 0;
        if (groupID in this.groupSyncKeys) {
            groupSyncKey = this.groupSyncKeys[groupID];
        }
        if (newSyncKey != groupSyncKey) {
            this.groupSyncKeys[groupID] = newSyncKey;
            this.sendGroupSyncKey(groupID, newSyncKey);
            if (this.observer != null &&
                "saveSuperGroupSyncKey" in this.observer) {
                this.observer.saveSuperGroupSyncKey(groupID, newSyncKey);
            }
        }
    } else if (cmd == IMService.MSG_SYSTEM) {
        var content = msg.content;
        if (this.observer != null &&
            "handleSystemMessage" in this.observer) {
            this.observer.handleSystemMessage(content);
        }
    } else if (cmd == IMService.MSG_NOTIFICATION) {
        var content = msg.content;
        if (this.observer != null &&
            "handleNotification" in this.observer) {
            this.observer.handleNotification(content);
        }
    } else if (cmd == IMService.MSG_METADATA) {
        this.metaMessage = msg;
    } else if (cmd == IMService.MSG_PONG) {
        console.log("pong");
        this.pingTimestamp = 0;
    } else {
        console.log("message command:" + cmd);
    }

    if (msg.flag & IMService.MESSAGE_FLAG_PUSH) {
        var newSyncKey = metadata.syncKey;
        if (msg.flag & IMService.MESSAGE_FLAG_SUPER_GROUP) {
            var groupID;
            if (cmd == IMService.MSG_GROUP_IM) {
                groupID = msg.receiver;
            } else {
                return;
            }

            this.groupSyncKeys[groupID] = newSyncKey;
            this.sendGroupSyncKey(groupID, newSyncKey);
            if (this.observer != null &&
                "saveSuperGroupSyncKey" in this.observer) {
                this.observer.saveSuperGroupSyncKey(groupID, newSyncKey);
            }
        } else {
            this.syncKey = newSyncKey;
            this.sendSyncKey(this.syncKey);

            if (this.observer != null &&
                "saveSyncKey" in this.observer){
                this.observer.saveSyncKey(this.syncKey);
            }            
        }
    }
};

IMService.prototype.onMessage = function (data) {
    var buf;
    if (global.ArrayBuffer && data instanceof ArrayBuffer) {
        buf = new Uint8Array(data);
    } else {
        console.log("invalid data type:" + typeof data);
        return;
    }

    var len = ntohl(buf, 0);
    var seq = ntohl(buf, 4);
    var cmd = buf[8];
    var flag = buf[10];
    var isSelf = !!(flag & IMService.MESSAGE_FLAG_SELF);
    
    if (len + IMService.HEADSIZE < buf.length) {
        console.log("invalid data length:" + buf.length + " " + len+IMService.HEADSIZE);
        return;
    }

    var pos = IMService.HEADSIZE;

    var msg = {}
    msg.seq = seq;
    msg.cmd = cmd;
    msg.flag = flag;
    if (cmd == IMService.MSG_IM) {
        msg.isSelf = isSelf;
        
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;
        
        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        //msgid
        pos += 4;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 24, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_GROUP_IM) {
        msg.isSelf = isSelf;
        
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;
        
        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        //msgid
        pos += 4;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 24, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_GROUP_NOTIFICATION) {
        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_CUSTOMER) {
        msg.isSelf = isSelf;
        
        msg.customerAppID = ntoh64(buf, pos);
        pos += 8;

        msg.customerID = ntoh64(buf, pos);
        pos += 8;

        msg.storeID = ntoh64(buf, pos);
        pos += 8;

        msg.sellerID = ntoh64(buf, pos);
        pos += 8;

        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        msg.content = utf8.decodeUTF8(buf.slice(IMService.HEADSIZE + 36, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_CUSTOMER_SUPPORT) {
        msg.isSelf = isSelf;        

        msg.customerAppID = ntoh64(buf, pos);
        pos += 8;

        msg.customerID = ntoh64(buf, pos);
        pos += 8;

        msg.storeID = ntoh64(buf, pos);
        pos += 8;

        msg.sellerID = ntoh64(buf, pos);
        pos += 8;

        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 36, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_RT) {
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 16, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_ROOM_IM) {
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 16, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_AUTH_STATUS) {
        msg.status = ntohl(buf, pos);
    } else if (cmd == IMService.MSG_ACK) {
        msg.ack = ntohl(buf, pos);
    } else if (cmd == IMService.MSG_SYNC_NOTIFY) {
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_BEGIN) {
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_END) {
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_GROUP_NOTIFY) {
        msg.groupID = ntoh64(buf, pos)
        pos += 8;
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_GROUP_BEGIN) {
        msg.groupID = ntoh64(buf, pos);
        pos += 8;
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_GROUP_END) {
        msg.groupID = ntoh64(buf, pos);
        pos += 8;
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYSTEM) {
        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_NOTIFICATION) {
        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_METADATA) {
        msg.syncKey = ntoh64(buf, pos)
        pos += 8;
        msg.prevSyncKey = ntoh64(buf, pos);
        pos += 8;
    } else {
        console.log("message command:" + cmd);
    }

    this.handleMessage(msg);
};

IMService.prototype.onError = function (err) {
    console.log("socket err:" + err);
    this.socket.close();
    this.socket = null;
    this.connectFailCount++;
    this.connectState = IMService.STATE_CONNECTFAIL;
    this.callStateObserver();

    var self = this;
    var f = function() {
        self.connect()
    };

    var timeout = this.connectFailCount*1000;
    if (this.connetFailCount > 60) {
        timeout = 60*1000;
    }
    setTimeout(f, timeout);
};

IMService.prototype.onClose = function() {
    console.log("on socket close");
    this.socket = null;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.callStateObserver();

    if (this.metaMessage) {
        console.log("socket closed, meta message:", this.metaMessage);
        this.metaMessage = undefined;
    }
    
    for (var seq in this.messages) {
        var msg = this.messages[seq];
        delete(msg.__sendTimestamp__);
        if (this.observer != null && "handleMessageFailure" in this.observer){
            this.observer.handleMessageFailure(msg);
        }
    }
    this.messages = {};

    for (var seq in this.groupMessages) {
        delete(msg.__sendTimestamp__);        
        var msg = this.groupMessages[seq];
        if (this.observer != null && "handleGroupMessageFailure" in this.observer){
            this.observer.handleGroupMessageFailure(msg);
        }
    }
    this.groupMessages = {};
    
    for (var seq in this.customerMessages) {
        var msg = this.customerMessages[seq];
        delete(msg.__sendTimestamp__);
        if (this.observer != null && "handleCustomerMessageFailure" in this.observer){
            this.observer.handleCustomerMessageFailure(msg);
        }
    }
    this.customerMessages = {};

    var self = this;
    var f = function() {
        self.connect();
    };
    
    var timeout = this.connectFailCount*1000;
    if (this.connetFailCount > 60) {
        timeout = 60*1000;
    } else if (this.connectFailCount == 0) {
        timeout = 400
    }
    setTimeout(f, timeout);
};

IMService.prototype.sendSync = function(syncKey) {
    var buf = new Uint8Array(8);
    hton64(buf, 0, syncKey);
    this.send(IMService.MSG_SYNC, buf);
}


IMService.prototype.sendSyncKey = function(syncKey) {
    var buf = new Uint8Array(8);
    hton64(buf, 0, syncKey);
    this.send(IMService.MSG_SYNC_KEY, buf);
}

IMService.prototype.sendGroupSync = function(groupID, syncKey) {
    var buf = new Uint8Array(16);
    hton64(buf, 0, groupID);
    hton64(buf, 8, syncKey);
    this.send(IMService.MSG_SYNC_GROUP, buf);
}


IMService.prototype.sendGroupSyncKey = function(groupID, syncKey) {
    var buf = new Uint8Array(16);
    hton64(buf, 0, groupID);
    hton64(buf, 8, syncKey);
    this.send(IMService.MSG_GROUP_SYNC_KEY, buf);
}

IMService.prototype.sendACK = function(ack) {
    var buf = new Uint8Array(4);
    htonl(buf, 0, ack);
    this.send(IMService.MSG_ACK, buf);
}

IMService.prototype.sendAuth = function() {
    var buf = new Uint8Array(1024);
    var pos = 0;
    var len = 0;

    buf[pos] = IMService.PLATFORM_ID;
    pos++;

    var accessToken = utf8.encodeUTF8(this.accessToken);
    len = accessToken.length;
    buf[pos] = len;
    pos++;
    buf.set(accessToken, pos);
    pos += len;

    var deviceId = utf8.encodeUTF8(this.device_id);
    len = deviceId.length;
    buf[pos] = len;
    pos++;
    buf.set(deviceId, pos);
    pos += len;

    var body = buf.subarray(0, pos);

    this.send(IMService.MSG_AUTH_TOKEN, body);
}

IMService.prototype.sendPing = function() {
    var body = new Uint8Array(0);
    this.send(IMService.MSG_PING, body);
}


//typeof body == uint8array
IMService.prototype.send = function (cmd, body, nonpersistent) {
    if (this.socket == null) {
        return false;
    }
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    
    this.seq++;

    var buf = new Uint8Array(IMService.HEADSIZE+body.length);

    var pos = 0;
    htonl(buf, pos, body.length);
    pos += 4;

    htonl(buf, pos, this.seq);
    pos += 4;
    
    buf[pos] = cmd;
    pos++;
    buf[pos] = IMService.VERSION;
    pos++;

    if (nonpersistent) {
        buf[pos] = IMService.MESSAGE_FLAG_UNPERSISTENT;
    } else {
        buf[pos] = 0;
    }
    pos++;

    buf[pos] = 0;
    pos++;

    buf.set(body, pos);
    pos += body.length;
    
    this.socket.send(buf.buffer);        
    return true
};



IMService.prototype.addSuperGroupSyncKey = function(groupID, syncKey) {
    this.groupSyncKeys[groupID] = syncKey;
};

IMService.prototype.removeSuperGroupSyncKey = function(groupID) {
    delete this.groupSyncKeys[groupID];  
};

IMService.prototype.clearSuperGroupSyncKey = function() {
    this.groupSyncKeys = {};
};

IMService.prototype.sendPeerMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var content = utf8.encodeUTF8(msg.content)
    var len = content.length;
    var buf = new Uint8Array(24+len);
    var pos = 0;
    var ts = msg.timestamp || 0;
    var msgId = msg.msgLocalID || 0;    

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;
    htonl(buf, pos, ts);
    pos += 4;
    htonl(buf, pos, msgId);
    pos += 4;

    buf.set(content, pos);
    pos += len;
    
    var r = this.send(IMService.MSG_IM, buf);
    if (!r) {
        return false;
    }

    var now = new Date().getTime() / 1000;
    msg.__sendTimestamp__ = now;
    this.messages[this.seq] = msg;
    
    var self = this;
    var t = IMService.ACK_TIMEOUT*1000+100;
    setTimeout(function() {
        self.checkAckTimeout();
    }, t);
    return true;
};


IMService.prototype.sendGroupMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var content = utf8.encodeUTF8(msg.content);
    var len = content.length;
    var buf = new Uint8Array(24+len);
    var pos = 0;
    var ts = msg.timestamp || 0;
    var msgId = msg.msgLocalID || 0;    

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;
    htonl(buf, pos, ts);
    pos += 4;
    htonl(buf, pos, msgId);
    pos += 4;

    len = buf.set(content, pos);
    pos += len;


    var r = this.send(IMService.MSG_GROUP_IM, buf);
    if (!r) {
        return false;
    }

    var now = new Date().getTime() / 1000;
    msg.__sendTimestamp__ = now;    
    this.groupMessages[this.seq] = msg;

    var self = this;
    var t = IMService.ACK_TIMEOUT*1000+100;
    setTimeout(function() {
        self.checkAckTimeout();
    }, t);
    
    return true;
};



IMService.prototype.sendRTMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    console.log("send rt message:" + msg.sender + " receiver:" + msg.receiver + "content:" + msg.content);
    var content = utf8.encodeUTF8(msg.content);
    var len = content.length;
    var buf = new Uint8Array(16+len);
    var pos = 0;

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;

    len = buf.set(content, pos);
    pos += len;

    var r = this.send(IMService.MSG_RT, buf);
    if (!r) {
        return false;
    }
    return true;
};

IMService.prototype.sendEnterRoom = function(roomID) {
    var buf = new Uint8Array(8);
    hton64(buf, 0, roomID);
    this.send(IMService.MSG_ENTER_ROOM, buf);
}

IMService.prototype.sendLeaveRoom = function(roomID) {
    var buf = new Uint8Array(8);
    hton64(buf, 0, roomID);
    this.send(IMService.MSG_LEAVE_ROOM, buf);
}

IMService.prototype.enterRoom = function(roomID) {
    if (roomID == 0) {
        return;
    }
    this.roomID = roomID;
    this.sendEnterRoom(this.roomID);
}

IMService.prototype.leaveRoom = function(roomID) {
    if (roomID != self.roomID || roomID == 0) {
        return;
    }

    this.sendLeaveRoom(this.roomID);
    this.roomID = 0;
}

IMService.prototype.sendRoomMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    var content = utf8.encodeUTF8(msg.content);
    var len = content.length;
    var buf = new Uint8Array(16+len);
    var pos = 0;

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;

    len = buf.set(content, pos);
    pos += len;

    var r = this.send(IMService.MSG_ROOM_IM, buf);
    if (!r) {
        return false;
    }
    return true;
}

IMService.prototype.writeCustomerMessage = function(msg) {
    var content = utf8.encodeUTF8(msg.content);    
    var len = content.length;
    var buf = new Uint8Array(36+len);
    var pos = 0;

    hton64(buf, pos, msg.customerAppID);
    pos += 8;
    hton64(buf, pos, msg.customerID);
    pos += 8;
    hton64(buf, pos, msg.storeID);
    pos += 8;
    hton64(buf, pos, msg.sellerID);
    pos += 8;
    var ts = msg.timestamp || 0;
    htonl(buf, pos, ts);
    pos += 4;
    buf.set(content, pos);
    pos += len;
    return buf
};

IMService.prototype.sendCustomerSupportMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var buf = this.writeCustomerMessage(msg);
    var r = this.send(IMService.MSG_CUSTOMER_SUPPORT, buf, msg.nonpersistent);
    if (!r) {
        return false;
    }

    var now = new Date().getTime() / 1000;
    msg.__sendTimestamp__ = now;    
    this.customerMessages[this.seq] = msg;

    var self = this;
    var t = IMService.ACK_TIMEOUT*1000+100;
    setTimeout(function() {
        self.checkAckTimeout();
    }, t);
    
    return true;
};

IMService.prototype.sendCustomerMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var buf = this.writeCustomerMessage(msg);
    var r = this.send(IMService.MSG_CUSTOMER, buf, msg.nonpersistent);
    if (!r) {
        return false;
    }
    
    var now = new Date().getTime() / 1000;
    msg.__sendTimestamp__ = now;    
    this.customerMessages[this.seq] = msg;
    
    var self = this;
    var t = IMService.ACK_TIMEOUT*1000+100;
    setTimeout(function() {
        self.checkAckTimeout();
    }, t);
    
    return true;
};

//检查是否有消息ack超时
IMService.prototype.checkAckTimeout = function() {
    var now = new Date().getTime() / 1000;
    var isTimeout = false;
    var ack;
    for (ack in this.messages) {
        var msg = this.messages[ack];
        if (now - msg.__sendTimestamp__ >= IMService.ACK_TIMEOUT) {
            isTimeout = true;
        }
    }
    for (ack in this.groupMessages) {
        var msg = this.groupMessages[ack];
        if (now - msg.__sendTimestamp__ >= IMService.ACK_TIMEOUT) {
            isTimeout = true;
        }
    }
    for (ack in this.customerMessages) {
        var msg = this.customerMessages[ack];
        if (now - msg.__sendTimestamp__ >= IMService.ACK_TIMEOUT) {
            isTimeout = true;
        }
    }

    if (isTimeout) {
        console.log("ack timeout, close socket");
        this.onClose();
    }
};


IMService.guid = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
                   .toString(16)
                   .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./byte_order":1,"./utf8":2}]},{},[4])(4)
});