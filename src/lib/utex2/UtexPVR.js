// noinspection ES6ConvertVarToLetConst,LanguageDetectionInspection,DuplicatedCode,OverlyComplexFunctionJS,SpellCheckingInspection,EqualityComparisonWithCoercionJS,JSDuplicatedDeclaration,PointlessArithmeticExpressionJS,FunctionTooLongJS
/** eslint-disable */

import { UtexUtils } from './UtexUtils.js';

export class UtexPVR {
  decode(buff) {
    /* c8 ignore start */
    throw new Error('Not implemented: UtexPVR.decode');
    var data = new Uint8Array(buff),
      offset = 0;
    var head = this.readHeader(data, offset);
    offset += 52;
    //var ooff = offset;
    //console.log(PUtils.readByteArray(data, offset, 10))
    offset += head.mdsize;

    console.log(head);

    var w = head.width,
      h = head.height;
    var img = new Uint8Array(h * w * 4);

    var pf = head.pf0;
    if (pf == 0) {
      for (var y = 0; y < h; y++)
        for (var x = 0; x < w; x++) {
          var i = y * w + x,
            qi = i << 2,
            bi = i << 1;

          //img[qi+0]=((data[offset+(bi>>3)]>>(bi&7))&3)*85;
          img[qi + 3] = 255;
        }
    } else console.log('Unknown pixel format: ' + pf);

    return [{ width: w, height: h, image: img.buffer }];
    /* c8 ignore stop */
  }

  readHeader(data, offset) {
    const utils = new UtexUtils();
    var hd = {},
      rUi = utils.readUintLE;
    hd.version = rUi(data, offset);
    offset += 4;
    hd.flags = rUi(data, offset);
    offset += 4;
    hd.pf0 = rUi(data, offset);
    offset += 4;
    hd.pf1 = rUi(data, offset);
    offset += 4;
    hd.cspace = rUi(data, offset);
    offset += 4;
    hd.ctype = rUi(data, offset);
    offset += 4;
    hd.height = rUi(data, offset);
    offset += 4;
    hd.width = rUi(data, offset);
    offset += 4;
    hd.sfnum = rUi(data, offset);
    offset += 4;
    hd.fcnum = rUi(data, offset);
    offset += 4;
    hd.mmcount = rUi(data, offset);
    offset += 4;
    hd.mdsize = rUi(data, offset);
    offset += 4;
    return hd;
  }
}
