// noinspection ES6ConvertVarToLetConst,LanguageDetectionInspection,DuplicatedCode,OverlyComplexFunctionJS,SpellCheckingInspection,EqualityComparisonWithCoercionJS,JSDuplicatedDeclaration,PointlessArithmeticExpressionJS,FunctionTooLongJS,OverlyNestedFunctionJS
/* eslint-disable */

export type DDSFrame = { width: number; height: number; image: ArrayBuffer };

type DDSPixelFormat = {
  flags: number;
  fourCC: string;
  bitCount: number;
  RMask: number;
  GMask: number;
  BMask: number;
  AMask: number;
};

type DDSHeader = {
  flags: number;
  height: number;
  width: number;
  pitch: number;
  depth: number;
  mmcount: number;
  pixFormat: DDSPixelFormat;
  caps: number;
  caps2: number;
  caps3: number;
  caps4: number;
};

type BitPos = { boff: number };

export class DDSUtils {
  // ── DDS header flags ────────────────────────────────────────────────────────
  static DDSD_CAPS = 0x1; // always required
  static DDSD_HEIGHT = 0x2; // always required
  static DDSD_WIDTH = 0x4; // always required
  static DDSD_PIXELFORMAT = 0x1000; // always required
  static DDSD_MIPMAPCOUNT = 0x20000;
  static DDSD_LINEARSIZE = 0x80000;

  // ── DDS pixel format flags ──────────────────────────────────────────────────
  static DDPF_ALPHAPIXELS = 0x1;
  static DDPF_ALPHA = 0x2;
  static DDPF_FOURCC = 0x4;
  static DDPF_RGB = 0x40;
  static DDPF_LUMINANCE = 0x20000;

  // ── DDS caps flags ──────────────────────────────────────────────────────────
  static DDSCAPS_COMPLEX = 0x8;
  static DDSCAPS_MIPMAP = 0x400000;
  static DDSCAPS_TEXTURE = 0x1000;

  // Reusable scratch buffers — allocated once per instance to avoid per-call
  // heap pressure in tight decode/encode loops. WARNING: contents are not
  // cleared between calls; never hold a reference to these across method
  // invocations or assume they are zero-initialised on entry.
  _int8 = new Uint8Array(4);
  _int = new Uint32Array(this._int8.buffer); // shares memory with _int8 for LE uint32 reinterpretation
  _arr16 = new Uint8Array(16); // 4-color palette slot for readBCcolor (16 RGBA entries × 1 byte)

  // ── public API ──────────────────────────────────────────────────────────────

  decode(buff: ArrayBuffer | Uint8Array): DDSFrame[] {
    var data = new Uint8Array(buff),
      offset = 4;

    var head = this.readHeader(data, offset);
    offset += 124;
    var pf = head.pixFormat;
    if (pf.flags & DDSUtils.DDPF_FOURCC && pf.fourCC == 'DX10') {
      offset += 20;
    }

    var w = head.width,
      h = head.height,
      out: DDSFrame[] = [];
    var fmt = pf.fourCC;

    var mcnt = Math.max(1, head.mmcount);
    for (var it = 0; it < mcnt; it++) {
      var img = new Uint8Array(w * h * 4);
      if (fmt == 'DXT1') {
        offset = this.readBC1(data, offset, img, w, h);
      } else if (fmt == 'DXT3') {
        offset = this.readBC2(data, offset, img, w, h);
      } else if (fmt == 'DXT5') {
        offset = this.readBC3(data, offset, img, w, h);
      } else if (fmt == 'DX10') {
        throw new Error('Not supported: BC7 (DX10)');
      } else if (fmt == 'ATC ') {
        throw new Error('Not supported: ATC');
      } else if (fmt == 'ATCA') {
        throw new Error('Not supported: ATCA');
      } else if (fmt == 'ATCI') {
        throw new Error('Not supported: ATCI');
      } else if (pf.flags & DDSUtils.DDPF_ALPHAPIXELS && pf.flags & DDSUtils.DDPF_RGB) {
        throw new Error('Not supported: (complex-A)');
      } else if (
        pf.flags & DDSUtils.DDPF_ALPHA ||
        pf.flags & DDSUtils.DDPF_ALPHAPIXELS ||
        pf.flags & DDSUtils.DDPF_LUMINANCE
      ) {
        throw new Error('Not supported: (complex-B)');
      } else {
        throw new Error(
          `Unknown texture format — head flags: ${head.flags.toString(2)}, pixelFormat flags: ${pf.flags.toString(2)}`,
        );
      }

      out.push({ width: w, height: h, image: img.buffer });
      w = w >> 1;
      h = h >> 1;
    }

    return out;
  }

  encode(img: ArrayBuffer | Uint8Array, w: number, h: number, forceAlpha = true): ArrayBuffer {
    var imageAsByteArray = new Uint8Array(img);
    var aAnd = 255;
    for (var i = 3; i < imageAsByteArray.length; i += 4) {
      aAnd &= imageAsByteArray[i];
    }

    var gotAlpha = forceAlpha || aAnd < 250;

    var data = new Uint8Array(124 + w * h * 2),
      offset = 0;
    this.writeASCII(data, offset, 'DDS ');
    offset += 4;
    this.writeHeader(data, w, h, gotAlpha, offset);
    offset += 124;

    var mcnt = 0;
    while (w * h != 0) {
      if (gotAlpha) {
        offset = this.writeBC3(imageAsByteArray, w, h, data, offset);
      } else {
        offset = this.writeBC1(imageAsByteArray, w, h, data, offset);
      }

      imageAsByteArray = this.mipmapB(imageAsByteArray, w, h);
      w = w >> 1;
      h = h >> 1;
      mcnt++;
    }

    data[28] = mcnt;

    return data.buffer.slice(0, offset);
  }

  // ── DDS header I/O ──────────────────────────────────────────────────────────

  readHeader(data: Uint8Array, offset: number): DDSHeader {
    var hd = {} as DDSHeader;
    offset += 4; // size = 124
    hd.flags = this.readUintLE(data, offset);
    offset += 4;
    hd.height = this.readUintLE(data, offset);
    offset += 4;
    hd.width = this.readUintLE(data, offset);
    offset += 4;
    hd.pitch = this.readUintLE(data, offset);
    offset += 4;
    hd.depth = this.readUintLE(data, offset);
    offset += 4;
    hd.mmcount = this.readUintLE(data, offset);
    offset += 4;
    offset += 11 * 4; // reserved, zeros
    hd.pixFormat = this.readPixFormat(data, offset);
    offset += 32;
    hd.caps = this.readUintLE(data, offset);
    offset += 4;
    hd.caps2 = this.readUintLE(data, offset);
    offset += 4;
    hd.caps3 = this.readUintLE(data, offset);
    offset += 4;
    hd.caps4 = this.readUintLE(data, offset);

    return hd;
  }

  writeHeader(data: Uint8Array, w: number, h: number, gotAlpha: boolean, offset: number): void {
    var flgs = DDSUtils.DDSD_CAPS | DDSUtils.DDSD_HEIGHT | DDSUtils.DDSD_WIDTH | DDSUtils.DDSD_PIXELFORMAT;
    flgs |= DDSUtils.DDSD_MIPMAPCOUNT | DDSUtils.DDSD_LINEARSIZE;

    var caps = DDSUtils.DDSCAPS_COMPLEX | DDSUtils.DDSCAPS_MIPMAP | DDSUtils.DDSCAPS_TEXTURE;
    var pitch = ((w * h) >> 1) * (gotAlpha ? 2 : 1),
      depth = gotAlpha ? 1 : 0;

    this.writeUintLE(data, offset, 124);
    offset += 4;
    this.writeUintLE(data, offset, flgs);
    offset += 4;
    this.writeUintLE(data, offset, h);
    offset += 4;
    this.writeUintLE(data, offset, w);
    offset += 4;
    this.writeUintLE(data, offset, pitch);
    offset += 4;
    this.writeUintLE(data, offset, depth);
    offset += 4;
    this.writeUintLE(data, offset, 10);
    offset += 4;
    offset += 11 * 4;
    this.writePixFormat(data, gotAlpha, offset);
    offset += 32;
    this.writeUintLE(data, offset, caps);
  }

  readPixFormat(data: Uint8Array, offset: number): DDSPixelFormat {
    var pf = {} as DDSPixelFormat;
    offset += 4; // size = 32
    pf.flags = this.readUintLE(data, offset);
    offset += 4;
    pf.fourCC = this.readASCII(data, offset, 4);
    offset += 4;
    pf.bitCount = this.readUintLE(data, offset);
    offset += 4;
    pf.RMask = this.readUintLE(data, offset);
    offset += 4;
    pf.GMask = this.readUintLE(data, offset);
    offset += 4;
    pf.BMask = this.readUintLE(data, offset);
    offset += 4;
    pf.AMask = this.readUintLE(data, offset);

    return pf;
  }

  writePixFormat(data: Uint8Array, gotAlpha: boolean, offset: number): void {
    var flgs = DDSUtils.DDPF_FOURCC;

    this.writeUintLE(data, offset, 32);
    offset += 4;
    this.writeUintLE(data, offset, flgs);
    offset += 4;
    this.writeASCII(data, offset, gotAlpha ? 'DXT5' : 'DXT1');
  }

  // ── BC codec ────────────────────────────────────────────────────────────────

  readBC1(data: Uint8Array, offset: number, img: Uint8Array, w: number, h: number): number {
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

  writeBC1(img: Uint8Array, w: number, h: number, data: Uint8Array, offset: number): number {
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

  readBC2(data: Uint8Array, offset: number, img: Uint8Array, w: number, h: number): number {
    var pos: BitPos = { boff: offset * 8 };
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

  inter8(a: number, b: number): number[] {
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

  readBC3(data: Uint8Array, offset: number, img: Uint8Array, w: number, h: number): number {
    var pos: BitPos = { boff: offset * 8 };
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

  writeBC3(img: Uint8Array, w: number, h: number, data: Uint8Array, offset: number): number {
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

  readBCcolor(data: Uint8Array, offset: number, sqr: Uint8Array): void {
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

  writeBCcolor(data: Uint8Array, offset: number, sqr: Uint8Array): void {
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

      var ds0 = this.colorDist(r, g, b, c0r, c0g, c0b);
      var ds1 = this.colorDist(r, g, b, c1r, c1g, c1b);
      var ds2 = this.colorDist(r, g, b, c2r, c2g, c2b);
      var ds3 = this.colorDist(r, g, b, c3r, c3g, c3b);
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

  toSquare(data: Uint8Array, sqr: Uint8Array, clr: Uint8Array, offset: number): void {
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

  read4x4(a: Uint8Array, w: number, h: number, sx: number, sy: number, b: Uint8Array): void {
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

  write4x4(a: Uint8Array, w: number, h: number, sx: number, sy: number, b: Uint8Array): void {
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

  rotate(sqr: Uint8Array, rot: number): void {
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

  readBits(data: Uint8Array, pos: BitPos, k: number): number {
    var out = 0,
      ok = k;
    while (k != 0) {
      out = out | (this.readBit(data, pos) << (ok - k));
      k--;
    }

    return out;
  }

  readBit(data: Uint8Array, pos: BitPos): number {
    var boff = pos.boff;
    pos.boff++;

    return (data[boff >> 3] >> (boff & 7)) & 1;
  }

  mipmapB(buff: Uint8Array, w: number, h: number): Uint8Array<ArrayBuffer> {
    var nw = w >> 1,
      nh = h >> 1;
    var nbuf = new Uint8Array(nw * nh * 4);
    for (var y = 0; y < nh; y++) {
      for (var x = 0; x < nw; x++) {
        var ti = (y * nw + x) << 2,
          si = ((y << 1) * w + (x << 1)) << 2;
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

  colorDist(r: number, g: number, b: number, r0: number, g0: number, b0: number): number {
    return (r - r0) * (r - r0) + (g - g0) * (g - g0) + (b - b0) * (b - b0);
  }

  mostDistant(sqr: Uint8Array): number {
    var ends = 0,
      dd = 0;
    for (var i = 0; i < 64; i += 4) {
      var r = sqr[i],
        g = sqr[i + 1],
        b = sqr[i + 2];
      for (var j = i + 4; j < 64; j += 4) {
        var dst = this.colorDist(r, g, b, sqr[j], sqr[j + 1], sqr[j + 2]);
        if (dst > dd) {
          dd = dst;
          ends = (i << 8) | j;
        }
      }
    }

    return ends;
  }

  // ── I/O helpers ─────────────────────────────────────────────────────────────

  readUintLE(buff: Uint8Array, p: number): number {
    this._int8[0] = buff[p + 0];
    this._int8[1] = buff[p + 1];
    this._int8[2] = buff[p + 2];
    this._int8[3] = buff[p + 3];

    return this._int[0];
  }

  writeUintLE(buff: Uint8Array, p: number, n: number): void {
    this._int[0] = n;
    buff[p + 0] = this._int8[0];
    buff[p + 1] = this._int8[1];
    buff[p + 2] = this._int8[2];
    buff[p + 3] = this._int8[3];
  }

  readASCII(buff: Uint8Array, p: number, l: number): string {
    let s = '';
    for (let i = 0; i < l; i++) {
      s += String.fromCharCode(buff[p + i]);
    }

    return s;
  }

  writeASCII(buff: Uint8Array, p: number, s: string): void {
    for (let i = 0; i < s.length; i++) {
      buff[p + i] = s.charCodeAt(i);
    }
  }
}
