// noinspection ES6ConvertVarToLetConst,LanguageDetectionInspection,DuplicatedCode,OverlyComplexFunctionJS,SpellCheckingInspection,EqualityComparisonWithCoercionJS,JSDuplicatedDeclaration,PointlessArithmeticExpressionJS,FunctionTooLongJS
/** eslint-disable */

export class Utex {
  readBC1(data, offset, img, w, h) {
    var sqr = new Uint8Array(4 * 4 * 4);

    for (var y = 0; y < h; y += 4) {
      for (var x = 0; x < w; x += 4) {
        this.readBCcolor(data, offset, sqr);
        this.write4x4(img, w, h, x, y, sqr);
        offset += 8;
      }
    }

    return offset;
  }

  writeBC1(img, w, h, data, offset) {
    var sqr = new Uint8Array(16 * 4);
    for (var y = 0; y < h; y += 4) {
      for (var x = 0; x < w; x += 4) {
        this.read4x4(img, w, h, x, y, sqr);
        this.writeBCcolor(data, offset, sqr);
        offset += 8;
      }
    }

    return offset;
  }

  readBC2(data, offset, img, w, h) {
    var pos = { boff: offset * 8 };
    var sqr = new Uint8Array(4 * 4 * 4);

    for (var y = 0; y < h; y += 4) {
      for (var x = 0; x < w; x += 4) {
        this.readBCcolor(data, offset + 8, sqr);
        for (var i = 0; i < 64; i += 4) {
          var code = this.readBits(data, pos, 4);
          sqr[i + 3] = 255 * (code / 15);
        }

        this.write4x4(img, w, h, x, y, sqr);
        offset += 16;
        pos.boff += 64;
      }
    }

    return offset;
  }

  inter8(a, b) {
    var al = [a, b];

    if (a > b) {
      al.push(
        (6 / 7) * a + (1 / 7) * b, // bit code 010
        (5 / 7) * a + (2 / 7) * b, // bit code 011
        (4 / 7) * a + (3 / 7) * b, // bit code 100
        (3 / 7) * a + (4 / 7) * b, // bit code 101
        (2 / 7) * a + (5 / 7) * b, // bit code 110
        (1 / 7) * a + (6 / 7) * b,
      );
    } else {
      al.push(
        (4 / 5) * a + (1 / 5) * b, // bit code 010
        (3 / 5) * a + (2 / 5) * b, // bit code 011
        (2 / 5) * a + (3 / 5) * b, // bit code 100
        (1 / 5) * a + (4 / 5) * b, // bit code 101
        0, // bit code 110
        255,
      );
    }

    return al;
  }

  readBC3(data, offset, img, w, h) {
    var pos = { boff: offset * 8 };
    var sqr = new Uint8Array(4 * 4 * 4);

    for (var y = 0; y < h; y += 4) {
      for (var x = 0; x < w; x += 4) {
        this.readBCcolor(data, offset + 8, sqr);

        var al = this.inter8(data[offset], data[offset + 1]);
        pos.boff += 16;
        for (var i = 0; i < 64; i += 4) {
          var code = this.readBits(data, pos, 3);
          sqr[i + 3] = al[code];
        }

        pos.boff += 64;
        this.write4x4(img, w, h, x, y, sqr);
        offset += 16;
      }
    }

    return offset;
  }
  writeBC3(img, w, h, data, offset) {
    var sqr = new Uint8Array(16 * 4);
    for (var y = 0; y < h; y += 4) {
      for (var x = 0; x < w; x += 4) {
        this.read4x4(img, w, h, x, y, sqr);
        var min = sqr[3],
          max = sqr[3];
        for (var i = 7; i < 64; i += 4) {
          var a = sqr[i];
          if (a < min) {
            min = a;
          } else if (max < a) {
            max = a;
          }
        }

        data[offset] = max;
        data[offset + 1] = min;
        offset += 2;

        var al = this.inter8(max, min);
        var boff = (offset + 2) << 3;
        for (var i = 0; i < 64; i += 32) {
          var bits = 0,
            boff = 0;
          for (var j = 0; j < 32; j += 4) {
            var code = 0,
              cd = 500;
            var a = sqr[i + j + 3];
            for (var k = 0; k < 8; k++) {
              var dst = Math.abs(al[k] - a);
              if (dst < cd) {
                cd = dst;
                code = k;
              }
            }

            bits = bits | (code << boff);
            boff += 3;
          }

          data[offset] = bits;
          data[offset + 1] = bits >> 8;
          data[offset + 2] = bits >> 16;
          offset += 3;
        }

        this.writeBCcolor(data, offset, sqr);
        offset += 8;
      }
    }

    return offset;
  }

  _arr16 = new Uint8Array(16);
  readBCcolor(data, offset, sqr) {
    var c0 = (data[offset + 1] << 8) | data[offset];
    var c1 = (data[offset + 3] << 8) | data[offset + 2];

    var c0b = (c0 & 31) * (255 / 31),
      c0g = ((c0 >>> 5) & 63) * (255 / 63),
      c0r = (c0 >> 11) * (255 / 31);
    var c1b = (c1 & 31) * (255 / 31),
      c1g = ((c1 >>> 5) & 63) * (255 / 63),
      c1r = (c1 >> 11) * (255 / 31);

    var clr = this._arr16;
    clr[0] = ~~c0r;
    clr[1] = ~~c0g;
    clr[2] = ~~c0b;
    clr[3] = 255;
    clr[4] = ~~c1r;
    clr[5] = ~~c1g;
    clr[6] = ~~c1b;
    clr[7] = 255;
    if (c1 < c0) {
      var fr = 2 / 3,
        ifr = 1 - fr;
      clr[8] = ~~(fr * c0r + ifr * c1r);
      clr[9] = ~~(fr * c0g + ifr * c1g);
      clr[10] = ~~(fr * c0b + ifr * c1b);
      clr[11] = 255;
      fr = 1 / 3;
      ifr = 1 - fr;
      clr[12] = ~~(fr * c0r + ifr * c1r);
      clr[13] = ~~(fr * c0g + ifr * c1g);
      clr[14] = ~~(fr * c0b + ifr * c1b);
      clr[15] = 255;
    } else {
      var fr = 1 / 2,
        ifr = 1 - fr;
      clr[8] = ~~(fr * c0r + ifr * c1r);
      clr[9] = ~~(fr * c0g + ifr * c1g);
      clr[10] = ~~(fr * c0b + ifr * c1b);
      clr[11] = 255;
      clr[12] = 0;
      clr[13] = 0;
      clr[14] = 0;
      clr[15] = 0;
    }

    this.toSquare(data, sqr, clr, offset);
  }
  writeBCcolor(data, offset, sqr) {
    var dist = this.colorDist;
    var ends = this.mostDistant(sqr);

    var c0r = sqr[ends >> 8],
      c0g = sqr[(ends >> 8) + 1],
      c0b = sqr[(ends >> 8) + 2];
    var c1r = sqr[ends & 255],
      c1g = sqr[(ends & 255) + 1],
      c1b = sqr[(ends & 255) + 2];

    var c0 = ((c0r >> 3) << 11) | ((c0g >> 2) << 5) | (c0b >> 3);
    var c1 = ((c1r >> 3) << 11) | ((c1g >> 2) << 5) | (c1b >> 3);
    if (c0 < c1) {
      var t = c0;
      c0 = c1;
      c1 = t;
    }

    var c0b = Math.floor((c0 & 31) * (255 / 31)),
      c0g = Math.floor(((c0 >>> 5) & 63) * (255 / 63)),
      c0r = Math.floor((c0 >> 11) * (255 / 31));
    var c1b = Math.floor((c1 & 31) * (255 / 31)),
      c1g = Math.floor(((c1 >>> 5) & 63) * (255 / 63)),
      c1r = Math.floor((c1 >> 11) * (255 / 31));

    data[offset + 0] = c0 & 255;
    data[offset + 1] = c0 >> 8;
    data[offset + 2] = c1 & 255;
    data[offset + 3] = c1 >> 8;

    var fr = 2 / 3,
      ifr = 1 - fr;
    var c2r = Math.floor(fr * c0r + ifr * c1r),
      c2g = Math.floor(fr * c0g + ifr * c1g),
      c2b = Math.floor(fr * c0b + ifr * c1b);
    fr = 1 / 3;
    ifr = 1 - fr;
    var c3r = Math.floor(fr * c0r + ifr * c1r),
      c3g = Math.floor(fr * c0g + ifr * c1g),
      c3b = Math.floor(fr * c0b + ifr * c1b);

    var boff = offset * 8 + 32;
    for (var i = 0; i < 64; i += 4) {
      var r = sqr[i],
        g = sqr[i + 1],
        b = sqr[i + 2];

      var ds0 = dist(r, g, b, c0r, c0g, c0b);
      var ds1 = dist(r, g, b, c1r, c1g, c1b);
      var ds2 = dist(r, g, b, c2r, c2g, c2b);
      var ds3 = dist(r, g, b, c3r, c3g, c3b);
      var dsm = Math.min(ds0, Math.min(ds1, Math.min(ds2, ds3)));

      var code = 0;
      if (dsm == ds1) {
        code = 1;
      } else if (dsm == ds2) {
        code = 2;
      } else if (dsm == ds3) {
        code = 3;
      }

      data[boff >> 3] |= code << (boff & 7);
      boff += 2;
    }
  }

  toSquare(data, sqr, clr, offset) {
    var boff = (offset + 4) << 3;
    for (var i = 0; i < 64; i += 4) {
      var code = (data[boff >> 3] >> (boff & 7)) & 3;
      boff += 2;
      code = code << 2;
      sqr[i] = clr[code];
      sqr[i + 1] = clr[code + 1];
      sqr[i + 2] = clr[code + 2];
      sqr[i + 3] = clr[code + 3];
    }
  }

  read4x4(a, w, h, sx, sy, b) {
    // read from large
    for (var y = 0; y < 4; y++) {
      var si = ((sy + y) * w + sx) << 2,
        ti = y << 4;
      b[ti + 0] = a[si + 0];
      b[ti + 1] = a[si + 1];
      b[ti + 2] = a[si + 2];
      b[ti + 3] = a[si + 3];
      b[ti + 4] = a[si + 4];
      b[ti + 5] = a[si + 5];
      b[ti + 6] = a[si + 6];
      b[ti + 7] = a[si + 7];
      b[ti + 8] = a[si + 8];
      b[ti + 9] = a[si + 9];
      b[ti + 10] = a[si + 10];
      b[ti + 11] = a[si + 11];
      b[ti + 12] = a[si + 12];
      b[ti + 13] = a[si + 13];
      b[ti + 14] = a[si + 14];
      b[ti + 15] = a[si + 15];
    }
  }
  write4x4(a, w, h, sx, sy, b) {
    // write to large
    for (var y = 0; y < 4; y++) {
      var si = ((sy + y) * w + sx) << 2,
        ti = y << 4;
      a[si + 0] = b[ti + 0];
      a[si + 1] = b[ti + 1];
      a[si + 2] = b[ti + 2];
      a[si + 3] = b[ti + 3];
      a[si + 4] = b[ti + 4];
      a[si + 5] = b[ti + 5];
      a[si + 6] = b[ti + 6];
      a[si + 7] = b[ti + 7];
      a[si + 8] = b[ti + 8];
      a[si + 9] = b[ti + 9];
      a[si + 10] = b[ti + 10];
      a[si + 11] = b[ti + 11];
      a[si + 12] = b[ti + 12];
      a[si + 13] = b[ti + 13];
      a[si + 14] = b[ti + 14];
      a[si + 15] = b[ti + 15];
    }
  }

  rotate(sqr, rot) {
    if (rot == 0) {
      return;
    }

    for (var i = 0; i < 64; i += 4) {
      var r = sqr[i];
      var g = sqr[i + 1];
      var b = sqr[i + 2];
      var a = sqr[i + 3];

      if (rot == 1) {
        var t = a;
        a = r;
        r = t;
      }

      if (rot == 2) {
        var t = a;
        a = g;
        g = t;
      }

      if (rot == 3) {
        var t = a;
        a = b;
        b = t;
      }

      sqr[i] = r;
      sqr[i + 1] = g;
      sqr[i + 2] = b;
      sqr[i + 3] = a;
    }
  }

  readBits(data, pos, k) {
    var out = 0,
      ok = k;
    while (k != 0) {
      out = out | (this.readBit(data, pos) << (ok - k));
      k--;
    }

    return out;
  }

  readBit(data, pos) {
    var boff = pos.boff;
    pos.boff++;

    return (data[boff >> 3] >> (boff & 7)) & 1;
  }

  mipmapB(buff, w, h) {
    var nw = w >> 1,
      nh = h >> 1;
    var nbuf = new Uint8Array(nw * nh * 4);
    for (var y = 0; y < nh; y++) {
      for (var x = 0; x < nw; x++) {
        var ti = (y * nw + x) << 2,
          si = ((y << 1) * w + (x << 1)) << 2;
        //nbuf[ti  ] = buff[si  ];  nbuf[ti+1] = buff[si+1];  nbuf[ti+2] = buff[si+2];  nbuf[ti+3] = buff[si+3];
        //*
        var a0 = buff[si + 3],
          a1 = buff[si + 7];
        var r = buff[si] * a0 + buff[si + 4] * a1;
        var g = buff[si + 1] * a0 + buff[si + 5] * a1;
        var b = buff[si + 2] * a0 + buff[si + 6] * a1;

        si += w << 2;

        var a2 = buff[si + 3],
          a3 = buff[si + 7];
        r += buff[si] * a2 + buff[si + 4] * a3;
        g += buff[si + 1] * a2 + buff[si + 5] * a3;
        b += buff[si + 2] * a2 + buff[si + 6] * a3;

        var a = (a0 + a1 + a2 + a3 + 2) >> 2,
          ia = a == 0 ? 0 : 0.25 / a;
        nbuf[ti] = ~~(r * ia + 0.5);
        nbuf[ti + 1] = ~~(g * ia + 0.5);
        nbuf[ti + 2] = ~~(b * ia + 0.5);
        nbuf[ti + 3] = a;
      }
    }

    return nbuf;
  }

  colorDist(r, g, b, r0, g0, b0) {
    return (r - r0) * (r - r0) + (g - g0) * (g - g0) + (b - b0) * (b - b0);
  }

  mostDistant(sqr) {
    var dist = this.colorDist;
    var ends = 0,
      dd = 0;
    for (var i = 0; i < 64; i += 4) {
      var r = sqr[i],
        g = sqr[i + 1],
        b = sqr[i + 2];
      for (var j = i + 4; j < 64; j += 4) {
        var dst = dist(r, g, b, sqr[j], sqr[j + 1], sqr[j + 2]);
        if (dst > dd) {
          dd = dst;
          ends = (i << 8) | j;
        }
      }
    }

    return ends;
  }
}
