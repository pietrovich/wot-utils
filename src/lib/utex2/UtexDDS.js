// noinspection ES6ConvertVarToLetConst,LanguageDetectionInspection,DuplicatedCode,OverlyComplexFunctionJS,SpellCheckingInspection,EqualityComparisonWithCoercionJS,JSDuplicatedDeclaration,PointlessArithmeticExpressionJS,FunctionTooLongJS
/** eslint-disable */
import * as C from './dd-constants.js';
import { Utex } from './Utex.js';
import { UtexUtils } from './UtexUtils.js';

export class UtexDDS {
  //
  // if(UTEX==null) UTEX = {};

  decode(buff) {
    const utex = new Utex();
    var data = new Uint8Array(buff),
      offset = 4;

    var head, pf;

    head = this.readHeader(data, offset);
    offset += 124;
    pf = head.pixFormat;
    if (pf.flags & C.DDPF_FOURCC && pf.fourCC == 'DX10') {
      offset += 20;
    }
    //console.log(head, pf);

    var w = head.width,
      h = head.height,
      out = [];
    var fmt = pf.fourCC;

    //var time = Date.now();
    var mcnt = Math.max(1, head.mmcount);
    for (var it = 0; it < mcnt; it++) {
      const size = w * h * 4;
      // console.log('Allocating ', size, 'buffer ...', w, h);
      var img = new Uint8Array(size);
      if (false) {
      } else if (fmt == 'DXT1') {
        offset = utex.readBC1(data, offset, img, w, h);
      } else if (fmt == 'DXT3') {
        offset = utex.readBC2(data, offset, img, w, h);
      } else if (fmt == 'DXT5') {
        offset = utex.readBC3(data, offset, img, w, h);
      } else if (fmt == 'DX10') {
        throw new Error('Not supported: BC7 (DX10)');
      } else if (fmt == 'ATC ') {
        throw new Error('Not supported: ATC');
      } else if (fmt == 'ATCA') {
        throw new Error('Not supported: ATCA');
      } else if (fmt == 'ATCI') {
        throw new Error('Not supported: ATCI');
      } else if (pf.flags & C.DDPF_ALPHAPIXELS && pf.flags & C.DDPF_RGB) {
        throw new Error('Not supported: (complex-A)');
      } else if (pf.flags & C.DDPF_ALPHA || pf.flags & C.DDPF_ALPHAPIXELS || pf.flags & C.DDPF_LUMINANCE) {
        throw new Error('Not supported: (complex-B)');
      } else {
        console.log(
          'unknown texture format, head flags: ',
          head.flags.toString(2),
          'pixelFormat flags: ',
          pf.flags.toString(2),
        );
        throw 'e';
      }

      out.push({ width: w, height: h, image: img.buffer });
      w = w >> 1;
      h = h >> 1;
    }

    //console.log(Date.now()-time);  throw "e";
    return out; //out.slice(0,1);
  }

  encode(img, w, h, forceAlpha = true) {
    const utex = new Utex();
    const utils = new UtexUtils();
    var imageAsByteArray = new Uint8Array(img);
    var aAnd = 255;
    for (var i = 3; i < imageAsByteArray.length; i += 4) {
      aAnd &= imageAsByteArray[i];
    }

    var gotAlpha = forceAlpha || aAnd < 250;

    var data = new Uint8Array(124 + w * h * 2),
      offset = 0;
    utils.writeASCII(data, offset, 'DDS ');
    offset += 4;
    this.writeHeader(data, w, h, gotAlpha, offset);
    offset += 124;

    var mcnt = 0;
    while (w * h != 0) {
      if (gotAlpha) {
        offset = utex.writeBC3(imageAsByteArray, w, h, data, offset);
      } else {
        offset = utex.writeBC1(imageAsByteArray, w, h, data, offset);
      }

      imageAsByteArray = utex.mipmapB(imageAsByteArray, w, h);
      w = w >> 1;
      h = h >> 1;
      mcnt++;
    }

    data[28] = mcnt;

    return data.buffer.slice(0, offset);
  }

  readHeader(data, offset) {
    const utils = new UtexUtils();
    var hd = {};
    offset += 4; // size = 124
    hd.flags = utils.readUintLE(data, offset);
    offset += 4;
    hd.height = utils.readUintLE(data, offset);
    offset += 4;
    hd.width = utils.readUintLE(data, offset);
    offset += 4;
    hd.pitch = utils.readUintLE(data, offset);
    offset += 4;
    hd.depth = utils.readUintLE(data, offset);
    offset += 4;
    hd.mmcount = utils.readUintLE(data, offset);
    offset += 4;
    offset += 11 * 4; // reserved, zeros
    hd.pixFormat = this.readPixFormat(data, offset);
    offset += 32;
    hd.caps = utils.readUintLE(data, offset);
    offset += 4;
    hd.caps2 = utils.readUintLE(data, offset);
    offset += 4;
    hd.caps3 = utils.readUintLE(data, offset);
    offset += 4;
    hd.caps4 = utils.readUintLE(data, offset);
    offset += 4;
    offset += 4; // reserved, zeros

    return hd;
  }

  writeHeader(data, w, h, gotAlpha, offset) {
    const utils = new UtexUtils();
    var flgs = C.DDSD_CAPS | C.DDSD_HEIGHT | C.DDSD_WIDTH | C.DDSD_PIXELFORMAT;
    flgs |= C.DDSD_MIPMAPCOUNT | C.DDSD_LINEARSIZE;

    var caps = C.DDSCAPS_COMPLEX | C.DDSCAPS_MIPMAP | C.DDSCAPS_TEXTURE;
    var pitch = ((w * h) >> 1) * (gotAlpha ? 2 : 1),
      depth = gotAlpha ? 1 : 0;

    utils.writeUintLE(data, offset, 124);
    offset += 4;
    utils.writeUintLE(data, offset, flgs);
    offset += 4; // flags
    utils.writeUintLE(data, offset, h);
    offset += 4;
    utils.writeUintLE(data, offset, w);
    offset += 4;
    utils.writeUintLE(data, offset, pitch);
    offset += 4;
    utils.writeUintLE(data, offset, depth);
    offset += 4;
    utils.writeUintLE(data, offset, 10);
    offset += 4;
    offset += 11 * 4;
    this.writePixFormat(data, gotAlpha, offset);
    offset += 32;
    utils.writeUintLE(data, offset, caps);
    offset += 4; // caps
    offset += 4 * 4;
  }

  readPixFormat(data, offset) {
    const utils = new UtexUtils();
    var pf = {};
    offset += 4; // size = 32
    pf.flags = utils.readUintLE(data, offset);
    offset += 4;
    pf.fourCC = utils.readASCII(data, offset, 4);
    offset += 4;
    pf.bitCount = utils.readUintLE(data, offset);
    offset += 4;
    pf.RMask = utils.readUintLE(data, offset);
    offset += 4;
    pf.GMask = utils.readUintLE(data, offset);
    offset += 4;
    pf.BMask = utils.readUintLE(data, offset);
    offset += 4;
    pf.AMask = utils.readUintLE(data, offset);
    offset += 4;

    return pf;
  }

  writePixFormat(data, gotAlpha, offset) {
    const utils = new UtexUtils();
    var flgs = C.DDPF_FOURCC;

    utils.writeUintLE(data, offset, 32);
    offset += 4;
    utils.writeUintLE(data, offset, flgs);
    offset += 4;
    utils.writeASCII(data, offset, gotAlpha ? 'DXT5' : 'DXT1');
    offset += 4;
    offset += 5 * 4;
  }
}
