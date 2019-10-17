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
