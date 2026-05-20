import { describe, it, expect, beforeEach } from 'vitest';
import { DDSUtils } from '../../src/lib/utex2/DDSUtils.js';

describe('UtexUtils', () => {
  let utils;

  beforeEach(() => {
    utils = new DDSUtils();
  });

  describe('readUintLE', () => {
    it('reads zero', () => {
      const buf = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      expect(utils.readUintLE(buf, 0)).toBe(0);
    });

    it('reads a single-byte value', () => {
      const buf = new Uint8Array([0x2a, 0x00, 0x00, 0x00]);
      expect(utils.readUintLE(buf, 0)).toBe(42);
    });

    it('reads a two-byte little-endian value', () => {
      const buf = new Uint8Array([0x00, 0x01, 0x00, 0x00]);
      expect(utils.readUintLE(buf, 0)).toBe(256);
    });

    it('reads a full 32-bit little-endian value', () => {
      // 0x01020304 in little-endian: [0x04, 0x03, 0x02, 0x01]
      const buf = new Uint8Array([0x04, 0x03, 0x02, 0x01]);
      expect(utils.readUintLE(buf, 0)).toBe(0x01020304);
    });

    it('reads max uint32 value', () => {
      const buf = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
      expect(utils.readUintLE(buf, 0)).toBe(0xffffffff);
    });

    it('reads at a non-zero offset', () => {
      const buf = new Uint8Array([0x00, 0x00, 0x2a, 0x00, 0x00, 0x00]);
      expect(utils.readUintLE(buf, 2)).toBe(42);
    });

    it('reads sequential values at different offsets', () => {
      const buf = new Uint8Array([
        0x01, 0x00, 0x00, 0x00,
        0x02, 0x00, 0x00, 0x00,
      ]);
      expect(utils.readUintLE(buf, 0)).toBe(1);
      expect(utils.readUintLE(buf, 4)).toBe(2);
    });

    it('reads known DDS magic-area value', () => {
      // DDSD_CAPS | DDSD_HEIGHT | DDSD_WIDTH | DDSD_PIXELFORMAT = 0x1007
      const buf = new Uint8Array([0x07, 0x10, 0x00, 0x00]);
      expect(utils.readUintLE(buf, 0)).toBe(0x1007);
    });
  });

  describe('writeUintLE', () => {
    it('writes zero', () => {
      const buf = new Uint8Array(4);
      utils.writeUintLE(buf, 0, 0);
      expect(Array.from(buf)).toEqual([0x00, 0x00, 0x00, 0x00]);
    });

    it('writes a single-byte value', () => {
      const buf = new Uint8Array(4);
      utils.writeUintLE(buf, 0, 42);
      expect(Array.from(buf)).toEqual([0x2a, 0x00, 0x00, 0x00]);
    });

    it('writes a two-byte little-endian value', () => {
      const buf = new Uint8Array(4);
      utils.writeUintLE(buf, 0, 256);
      expect(Array.from(buf)).toEqual([0x00, 0x01, 0x00, 0x00]);
    });

    it('writes a full 32-bit little-endian value', () => {
      const buf = new Uint8Array(4);
      utils.writeUintLE(buf, 0, 0x01020304);
      expect(Array.from(buf)).toEqual([0x04, 0x03, 0x02, 0x01]);
    });

    it('writes max uint32 value', () => {
      const buf = new Uint8Array(4);
      utils.writeUintLE(buf, 0, 0xffffffff);
      expect(Array.from(buf)).toEqual([0xff, 0xff, 0xff, 0xff]);
    });

    it('writes at a non-zero offset without touching surrounding bytes', () => {
      const buf = new Uint8Array([0xAA, 0xAA, 0x00, 0x00, 0x00, 0x00, 0xBB, 0xBB]);
      utils.writeUintLE(buf, 2, 42);
      expect(buf[0]).toBe(0xAA);
      expect(buf[1]).toBe(0xAA);
      expect(buf[2]).toBe(0x2a);
      expect(buf[3]).toBe(0x00);
      expect(buf[4]).toBe(0x00);
      expect(buf[5]).toBe(0x00);
      expect(buf[6]).toBe(0xBB);
      expect(buf[7]).toBe(0xBB);
    });
  });

  describe('readUintLE / writeUintLE round-trip', () => {
    const cases = [0, 1, 42, 255, 256, 0x1007, 0x01020304, 0x7fffffff, 0xffffffff];

    for (const value of cases) {
      it(`round-trips ${value} (0x${value.toString(16)})`, () => {
        const buf = new Uint8Array(4);
        utils.writeUintLE(buf, 0, value);
        expect(utils.readUintLE(buf, 0)).toBe(value);
      });
    }
  });

  describe('readASCII', () => {
    it('reads a 4-char FourCC string', () => {
      const buf = new Uint8Array([0x44, 0x44, 0x53, 0x20]); // "DDS "
      expect(utils.readASCII(buf, 0, 4)).toBe('DDS ');
    });

    it('reads DXT1 fourCC', () => {
      const buf = new Uint8Array([0x44, 0x58, 0x54, 0x31]); // "DXT1"
      expect(utils.readASCII(buf, 0, 4)).toBe('DXT1');
    });

    it('reads DXT5 fourCC', () => {
      const buf = new Uint8Array([0x44, 0x58, 0x54, 0x35]); // "DXT5"
      expect(utils.readASCII(buf, 0, 4)).toBe('DXT5');
    });

    it('reads a single character', () => {
      const buf = new Uint8Array([0x41]); // "A"
      expect(utils.readASCII(buf, 0, 1)).toBe('A');
    });

    it('reads an empty string when length is 0', () => {
      const buf = new Uint8Array([0x41, 0x42]);
      expect(utils.readASCII(buf, 0, 0)).toBe('');
    });

    it('reads at a non-zero offset', () => {
      // [0x00, 0x00, "DXT5"]
      const buf = new Uint8Array([0x00, 0x00, 0x44, 0x58, 0x54, 0x35]);
      expect(utils.readASCII(buf, 2, 4)).toBe('DXT5');
    });
  });

  describe('writeASCII', () => {
    it('writes a 4-char FourCC string', () => {
      const buf = new Uint8Array(4);
      utils.writeASCII(buf, 0, 'DDS ');
      expect(Array.from(buf)).toEqual([0x44, 0x44, 0x53, 0x20]);
    });

    it('writes DXT1 fourCC', () => {
      const buf = new Uint8Array(4);
      utils.writeASCII(buf, 0, 'DXT1');
      expect(Array.from(buf)).toEqual([0x44, 0x58, 0x54, 0x31]);
    });

    it('writes at a non-zero offset without touching surrounding bytes', () => {
      const buf = new Uint8Array([0xAA, 0xAA, 0x00, 0x00, 0x00, 0x00, 0xBB, 0xBB]);
      utils.writeASCII(buf, 2, 'DXT');
      expect(buf[0]).toBe(0xAA);
      expect(buf[1]).toBe(0xAA);
      expect(buf[2]).toBe(0x44); // D
      expect(buf[3]).toBe(0x58); // X
      expect(buf[4]).toBe(0x54); // T
      expect(buf[6]).toBe(0xBB);
      expect(buf[7]).toBe(0xBB);
    });

    it('writes an empty string without touching the buffer', () => {
      const buf = new Uint8Array([0xAA, 0xBB]);
      utils.writeASCII(buf, 0, '');
      expect(Array.from(buf)).toEqual([0xAA, 0xBB]);
    });
  });

  describe('readASCII / writeASCII round-trip', () => {
    const cases = ['DDS ', 'DXT1', 'DXT3', 'DXT5', 'DX10', 'ATC '];

    for (const s of cases) {
      it(`round-trips "${s}"`, () => {
        const buf = new Uint8Array(s.length);
        utils.writeASCII(buf, 0, s);
        expect(utils.readASCII(buf, 0, s.length)).toBe(s);
      });
    }
  });
});
