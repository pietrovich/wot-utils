/** eslint-disable */

export class UtexUtils {
  constructor() {
    this._int8 = new Uint8Array(4);
    this._int = new Uint32Array(this._int8.buffer);
  }

  readUintLE(buff, p) {
    this._int8[0] = buff[p + 0];
    this._int8[1] = buff[p + 1];
    this._int8[2] = buff[p + 2];
    this._int8[3] = buff[p + 3];

    return this._int[0];
  }

  writeUintLE(buff, p, n) {
    this._int[0] = n;
    buff[p + 0] = this._int8[0];
    buff[p + 1] = this._int8[1];
    buff[p + 2] = this._int8[2];
    buff[p + 3] = this._int8[3];
  }

  readASCII(buff, p, l)	// l : length in Characters (not Bytes)
  {
    let s = "";
    for (let i = 0; i < l; i++) {
      s += String.fromCharCode(buff[p + i]);
    }
    return s;
  }

  writeASCII(buff, p, s)	// l : length in Characters (not Bytes)
  {
    for (let i = 0; i < s.length; i++) {
      buff[p + i] = s.charCodeAt(i);
    }
  }
}
