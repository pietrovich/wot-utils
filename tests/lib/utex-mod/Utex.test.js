import { describe, it, expect, beforeEach } from 'vitest';
import { DDSUtils } from '../../../src/lib/utex-mod/DDSUtils.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** 64-byte RGBA buffer for a 4×4 block, all pixels set to the same color. */
function solidBlock(r, g, b, a = 255) {
  const buf = new Uint8Array(64);
  for (let i = 0; i < 64; i += 4) {
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = a;
  }

  return buf;
}

/** Assert every pixel in a 4×4 RGBA output equals the expected values. */
function expectAllPixels(img, r, g, b, a = 255) {
  for (let i = 0; i < 64; i += 4) {
    expect(img[i], `pixel ${i / 4} R`).toBe(r);
    expect(img[i + 1], `pixel ${i / 4} G`).toBe(g);
    expect(img[i + 2], `pixel ${i / 4} B`).toBe(b);
    expect(img[i + 3], `pixel ${i / 4} A`).toBe(a);
  }
}

/** Assert every pixel is within `tol` of the expected values. */
function expectAllPixelsApprox(img, r, g, b, a = 255, tol = 8) {
  for (let i = 0; i < 64; i += 4) {
    expect(img[i], `pixel ${i / 4} R`).toBeGreaterThanOrEqual(r - tol);
    expect(img[i], `pixel ${i / 4} R`).toBeLessThanOrEqual(r + tol);
    expect(img[i + 1], `pixel ${i / 4} G`).toBeGreaterThanOrEqual(g - tol);
    expect(img[i + 1], `pixel ${i / 4} G`).toBeLessThanOrEqual(g + tol);
    expect(img[i + 2], `pixel ${i / 4} B`).toBeGreaterThanOrEqual(b - tol);
    expect(img[i + 2], `pixel ${i / 4} B`).toBeLessThanOrEqual(b + tol);
    expect(img[i + 3], `pixel ${i / 4} A`).toBeGreaterThanOrEqual(a - tol);
    expect(img[i + 3], `pixel ${i / 4} A`).toBeLessThanOrEqual(a + tol);
  }
}

// ─── BC1 block helpers ───────────────────────────────────────────────────────
//
// BC1 block layout (8 bytes):
//   bytes 0-1: c0 in RGB565 little-endian
//   bytes 2-3: c1 in RGB565 little-endian
//   bytes 4-7: 2-bit index per pixel (16 pixels × 2 bits = 32 bits)
//
// RGB565: bits [15:11]=R(5), [10:5]=G(6), [4:0]=B(5)

// Solid-color BC1 blocks (c0 = color, c1 = 0, all indices = 0 → every pixel = c0).
// c0 > c1 (0 < c0), so 4-color mode is active and index 0 always picks c0.
const BC1_RED = new Uint8Array([0x00, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // c0=0xF800
const BC1_GREEN = new Uint8Array([0xe0, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // c0=0x07E0
const BC1_BLUE = new Uint8Array([0x1f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // c0=0x001F
const BC1_WHITE = new Uint8Array([0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // c0=0xFFFF
const BC1_BLACK = new Uint8Array([0xff, 0xff, 0x00, 0x00, 0x55, 0x55, 0x55, 0x55]); // all indices=1 → c1=0

// ─── tests ──────────────────────────────────────────────────────────────────

describe('Utex', () => {
  let utex;
  beforeEach(() => {
    utex = new DDSUtils();
  });

  // ── inter8 ────────────────────────────────────────────────────────────────

  describe('inter8', () => {
    it('returns 8 values when a > b', () => {
      expect(utex.inter8(255, 0)).toHaveLength(8);
    });

    it('returns 8 values when a <= b', () => {
      expect(utex.inter8(0, 255)).toHaveLength(8);
    });

    it('a > b: first two values are a and b', () => {
      const al = utex.inter8(255, 0);
      expect(al[0]).toBe(255);
      expect(al[1]).toBe(0);
    });

    it('a > b: interpolates 6 values between endpoints', () => {
      const al = utex.inter8(255, 0);
      expect(al[2]).toBeCloseTo((6 / 7) * 255, 5);
      expect(al[3]).toBeCloseTo((5 / 7) * 255, 5);
      expect(al[4]).toBeCloseTo((4 / 7) * 255, 5);
      expect(al[5]).toBeCloseTo((3 / 7) * 255, 5);
      expect(al[6]).toBeCloseTo((2 / 7) * 255, 5);
      expect(al[7]).toBeCloseTo((1 / 7) * 255, 5);
    });

    it('a <= b: first two values are a and b', () => {
      const al = utex.inter8(0, 255);
      expect(al[0]).toBe(0);
      expect(al[1]).toBe(255);
    });

    it('a <= b: interpolates 4 values, then fixed 0 and 255', () => {
      const al = utex.inter8(0, 255);
      expect(al[2]).toBeCloseTo(51, 5); // 1/5 * 255
      expect(al[3]).toBeCloseTo(102, 5); // 2/5 * 255
      expect(al[4]).toBeCloseTo(153, 5); // 3/5 * 255
      expect(al[5]).toBeCloseTo(204, 5); // 4/5 * 255
      expect(al[6]).toBe(0);
      expect(al[7]).toBe(255);
    });

    it('a === b: treated as a <= b branch, al[6]=0 and al[7]=255', () => {
      const al = utex.inter8(128, 128);
      expect(al[0]).toBe(128);
      expect(al[1]).toBe(128);
      expect(al[6]).toBe(0);
      expect(al[7]).toBe(255);
    });

    it('both endpoints 0: all values 0 except the fixed 255 sentinel', () => {
      const al = utex.inter8(0, 0);
      expect(al.slice(0, 6).every((v) => v === 0)).toBe(true);
      expect(al[7]).toBe(255);
    });
  });

  // ── readBit / readBits ────────────────────────────────────────────────────

  describe('readBit', () => {
    it('reads 0 from a zero byte', () => {
      const data = new Uint8Array([0x00]);
      const pos = { boff: 0 };
      expect(utex.readBit(data, pos)).toBe(0);
    });

    it('reads 1 from a 0xFF byte', () => {
      const data = new Uint8Array([0xff]);
      const pos = { boff: 0 };
      expect(utex.readBit(data, pos)).toBe(1);
    });

    it('advances pos.boff by 1 each call', () => {
      const data = new Uint8Array([0xff]);
      const pos = { boff: 3 };
      utex.readBit(data, pos);
      expect(pos.boff).toBe(4);
    });

    it('reads individual bits of a known byte (0b10110100 = 0xB4)', () => {
      const data = new Uint8Array([0xb4]); // 1011 0100
      const expected = [0, 0, 1, 0, 1, 1, 0, 1]; // LSB first
      const pos = { boff: 0 };
      for (const bit of expected) {
        expect(utex.readBit(data, pos)).toBe(bit);
      }
    });

    it('reads across byte boundary', () => {
      // byte0=0x00, byte1=0xFF
      const data = new Uint8Array([0x00, 0xff]);
      const pos = { boff: 7 };
      expect(utex.readBit(data, pos)).toBe(0); // bit 7 of byte 0
      expect(utex.readBit(data, pos)).toBe(1); // bit 0 of byte 1
    });
  });

  describe('readBits', () => {
    it('reads 0 when all bits are 0', () => {
      const data = new Uint8Array([0x00]);
      expect(utex.readBits(data, { boff: 0 }, 3)).toBe(0);
    });

    it('reads max value (2^k-1) when all bits are 1', () => {
      const data = new Uint8Array([0xff]);
      expect(utex.readBits(data, { boff: 0 }, 4)).toBe(15);
      expect(utex.readBits(data, { boff: 0 }, 3)).toBe(7);
    });

    it('reads 1 bit correctly', () => {
      const data = new Uint8Array([0b00000001]);
      expect(utex.readBits(data, { boff: 0 }, 1)).toBe(1);
    });

    it('reads 3-bit values with known bit patterns', () => {
      // byte = 0b00000111 → bits 0,1,2 = 1,1,1 → readBits(3) = 7
      const data = new Uint8Array([0b00000111]);
      expect(utex.readBits(data, { boff: 0 }, 3)).toBe(7);
    });

    it('bits are read LSB-first (bit0 is weight-1)', () => {
      // byte = 0b00000100 → bits 0,1,2 = 0,0,1 → readBits(3) = 0|(0<<1)|(1<<2) = 4
      const data = new Uint8Array([0b00000100]);
      expect(utex.readBits(data, { boff: 0 }, 3)).toBe(4);
    });

    it('advances pos.boff by k', () => {
      const data = new Uint8Array([0xff]);
      const pos = { boff: 1 };
      utex.readBits(data, pos, 3);
      expect(pos.boff).toBe(4);
    });
  });

  // ── colorDist ─────────────────────────────────────────────────────────────

  describe('colorDist', () => {
    it('returns 0 for identical colors', () => {
      expect(utex.colorDist(128, 64, 32, 128, 64, 32)).toBe(0);
    });

    it('computes squared Euclidean distance along one channel', () => {
      expect(utex.colorDist(255, 0, 0, 0, 0, 0)).toBe(255 * 255);
    });

    it('computes squared Euclidean distance across all channels', () => {
      // dist = 3²+4²+0² = 9+16 = 25
      expect(utex.colorDist(3, 4, 0, 0, 0, 0)).toBe(25);
    });

    it('is symmetric', () => {
      const d1 = utex.colorDist(255, 0, 128, 0, 100, 50);
      const d2 = utex.colorDist(0, 100, 50, 255, 0, 128);
      expect(d1).toBe(d2);
    });
  });

  // ── mostDistant ───────────────────────────────────────────────────────────

  describe('mostDistant', () => {
    it('returns 0 for a uniform block (all distances are 0)', () => {
      const sqr = solidBlock(128, 64, 32);
      // all pairs have dist=0, dd never exceeds 0, ends stays 0
      expect(utex.mostDistant(sqr)).toBe(0);
    });

    it('identifies the pair of pixels furthest apart in RGB space', () => {
      // pixel 0 (offset 0) = red, pixel 1 (offset 4) = blue; all others = black
      const sqr = new Uint8Array(64);
      sqr[0] = 255; // pixel 0: red
      sqr[4 + 2] = 255; // pixel 1: blue
      // dist(red, blue) = 255²+255² = 130050 > any other pair
      const result = utex.mostDistant(sqr);
      expect(result >> 8).toBe(0); // first pixel offset
      expect(result & 255).toBe(4); // second pixel offset
    });

    it('packed result encodes (i<<8)|j where i < j', () => {
      const sqr = new Uint8Array(64);
      // pixel 3 (offset 12) = white, pixel 15 (offset 60) = black → dist = 255²*3
      sqr[12] = 255;
      sqr[13] = 255;
      sqr[14] = 255;
      sqr[15] = 255;
      const result = utex.mostDistant(sqr);
      const i = result >> 8;
      const j = result & 255;
      expect(i).toBeLessThan(j);
    });
  });

  // ── rotate ────────────────────────────────────────────────────────────────

  describe('rotate', () => {
    function makeColorBlock(r, g, b, a) {
      const sqr = new Uint8Array(64);
      for (let i = 0; i < 64; i += 4) {
        sqr[i] = r;
        sqr[i + 1] = g;
        sqr[i + 2] = b;
        sqr[i + 3] = a;
      }

      return sqr;
    }

    it('rot=0: no change', () => {
      const sqr = makeColorBlock(10, 20, 30, 40);
      utex.rotate(sqr, 0);
      expect(sqr[0]).toBe(10);
      expect(sqr[1]).toBe(20);
      expect(sqr[2]).toBe(30);
      expect(sqr[3]).toBe(40);
    });

    it('rot=1: swaps R and A', () => {
      const sqr = makeColorBlock(10, 20, 30, 40);
      utex.rotate(sqr, 1);
      expect(sqr[0]).toBe(40); // R ← A
      expect(sqr[1]).toBe(20); // G unchanged
      expect(sqr[2]).toBe(30); // B unchanged
      expect(sqr[3]).toBe(10); // A ← R
    });

    it('rot=2: swaps G and A', () => {
      const sqr = makeColorBlock(10, 20, 30, 40);
      utex.rotate(sqr, 2);
      expect(sqr[0]).toBe(10); // R unchanged
      expect(sqr[1]).toBe(40); // G ← A
      expect(sqr[2]).toBe(30); // B unchanged
      expect(sqr[3]).toBe(20); // A ← G
    });

    it('rot=3: swaps B and A', () => {
      const sqr = makeColorBlock(10, 20, 30, 40);
      utex.rotate(sqr, 3);
      expect(sqr[0]).toBe(10); // R unchanged
      expect(sqr[1]).toBe(20); // G unchanged
      expect(sqr[2]).toBe(40); // B ← A
      expect(sqr[3]).toBe(30); // A ← B
    });

    it('applies the swap to all 16 pixels in the block', () => {
      const sqr = makeColorBlock(1, 2, 3, 4);
      utex.rotate(sqr, 1);
      for (let i = 0; i < 64; i += 4) {
        expect(sqr[i]).toBe(4);
        expect(sqr[i + 3]).toBe(1);
      }
    });
  });

  // ── mipmapB ───────────────────────────────────────────────────────────────

  describe('mipmapB', () => {
    it('halves dimensions', () => {
      const buf = solidBlock(128, 64, 32).buffer;
      const result = utex.mipmapB(buf, 4, 4);
      expect(result.length).toBe(2 * 2 * 4);
    });

    it('2×2 all-opaque single color collapses to the same color', () => {
      // 2×2 all-red, fully opaque — mipmapB takes a Uint8Array, not ArrayBuffer
      const buf = new Uint8Array(2 * 2 * 4);
      for (let i = 0; i < buf.length; i += 4) {
        buf[i] = 255;
        buf[i + 3] = 255;
      }

      const result = utex.mipmapB(buf, 2, 2);
      expect(result[0]).toBe(255); // R
      expect(result[1]).toBe(0); // G
      expect(result[2]).toBe(0); // B
      expect(result[3]).toBe(255); // A
    });

    it('2×2 fully-transparent block stays black and transparent', () => {
      const buf = new Uint8Array(2 * 2 * 4); // all zeros (RGBA=0,0,0,0)
      const result = utex.mipmapB(buf, 2, 2);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
      expect(result[3]).toBe(0);
    });

    it('2×2 opaque block: averages colors correctly', () => {
      // 4 pixels: red, green, blue, yellow — all fully opaque
      const buf = new Uint8Array([
        255,
        0,
        0,
        255, // red
        0,
        255,
        0,
        255, // green
        0,
        0,
        255,
        255, // blue
        255,
        255,
        0,
        255, // yellow
      ]);
      const result = utex.mipmapB(buf, 2, 2);
      // R: (255*255 + 0*255 + 0*255 + 255*255) / (4*255) = 510/4 ≈ 127.5 → 128
      // G: (0*255 + 255*255 + 0*255 + 255*255) / (4*255) ≈ 128
      // B: (0 + 0 + 255*255 + 0) / (4*255) ≈ 63.75 → 64
      expect(result[0]).toBe(128);
      expect(result[1]).toBe(128);
      expect(result[2]).toBe(64);
      expect(result[3]).toBe(255);
    });
  });

  // ── read4x4 / write4x4 ───────────────────────────────────────────────────

  describe('read4x4 / write4x4 round-trip', () => {
    it('write then read returns identical pixels', () => {
      const large = new Uint8Array(8 * 8 * 4); // 8×8 image
      const src = solidBlock(100, 150, 200, 255);

      utex.write4x4(large, 8, 8, 0, 0, src); // write block at (0,0)

      const dst = new Uint8Array(64);
      utex.read4x4(large, 8, 8, 0, 0, dst); // read it back

      expect(Array.from(dst)).toEqual(Array.from(src));
    });

    it('write at non-zero origin does not touch other pixels', () => {
      const large = new Uint8Array(8 * 8 * 4);
      large.fill(0xab); // fill with sentinel
      const src = solidBlock(1, 2, 3, 4);

      utex.write4x4(large, 8, 8, 4, 4, src); // write at (4,4)

      // pixel (0,0) should still be sentinel
      expect(large[0]).toBe(0xab);
      // pixel (4,4) should be our color
      const offset = (4 * 8 + 4) * 4;
      expect(large[offset]).toBe(1);
      expect(large[offset + 1]).toBe(2);
    });
  });

  // ── readBC1 ───────────────────────────────────────────────────────────────

  describe('readBC1', () => {
    it('decodes solid red block', () => {
      const img = new Uint8Array(64);
      utex.readBC1(BC1_RED, 0, img, 4, 4);
      expectAllPixels(img, 255, 0, 0, 255);
    });

    it('decodes solid green block', () => {
      const img = new Uint8Array(64);
      utex.readBC1(BC1_GREEN, 0, img, 4, 4);
      expectAllPixels(img, 0, 255, 0, 255);
    });

    it('decodes solid blue block', () => {
      const img = new Uint8Array(64);
      utex.readBC1(BC1_BLUE, 0, img, 4, 4);
      expectAllPixels(img, 0, 0, 255, 255);
    });

    it('decodes solid white block', () => {
      const img = new Uint8Array(64);
      utex.readBC1(BC1_WHITE, 0, img, 4, 4);
      expectAllPixels(img, 255, 255, 255, 255);
    });

    it('decodes all-index-1 block (c1 = black)', () => {
      // BC1_BLACK: c0=white, c1=black, all indices=1 → every pixel = c1 = black
      const img = new Uint8Array(64);
      utex.readBC1(BC1_BLACK, 0, img, 4, 4);
      expectAllPixels(img, 0, 0, 0, 255);
    });

    it('returns updated offset (offset + blocks * 8)', () => {
      const img = new Uint8Array(64);
      const result = utex.readBC1(BC1_RED, 0, img, 4, 4);
      expect(result).toBe(8);
    });

    it('reads from a non-zero offset in the data buffer', () => {
      // prepend 8 zero bytes before the block
      const data = new Uint8Array(16);
      data.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      utex.readBC1(data, 8, img, 4, 4);
      expectAllPixels(img, 255, 0, 0, 255);
    });
  });

  // ── writeBC1 ─────────────────────────────────────────────────────────────

  describe('writeBC1', () => {
    it('produces 8 bytes for a 4×4 image', () => {
      const src = solidBlock(255, 0, 0);
      const out = new Uint8Array(8);
      const end = utex.writeBC1(src, 4, 4, out, 0);
      expect(end).toBe(8);
    });

    it('produces valid BC1 data (decodable back to original color)', () => {
      const src = solidBlock(255, 0, 0);
      const compressed = new Uint8Array(8);
      utex.writeBC1(src, 4, 4, compressed, 0);

      const decoded = new Uint8Array(64);
      utex.readBC1(compressed, 0, decoded, 4, 4);
      expectAllPixelsApprox(decoded, 255, 0, 0, 255, 0);
    });
  });

  // ── BC1 round-trip ────────────────────────────────────────────────────────

  describe('BC1 round-trip (write → read)', () => {
    function roundTrip(r, g, b) {
      const src = solidBlock(r, g, b);
      const compressed = new Uint8Array(8);
      utex.writeBC1(src, 4, 4, compressed, 0);
      const decoded = new Uint8Array(64);
      utex.readBC1(compressed, 0, decoded, 4, 4);

      return decoded;
    }

    it('red (255,0,0) survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(255, 0, 0), 255, 0, 0, 255, 0);
    });

    it('green (0,255,0) survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(0, 255, 0), 0, 255, 0, 255, 0);
    });

    it('blue (0,0,255) survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(0, 0, 255), 0, 0, 255, 255, 0);
    });

    it('white (255,255,255) survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(255, 255, 255), 255, 255, 255, 255, 0);
    });

    it('black (0,0,0) survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(0, 0, 0), 0, 0, 0, 255, 0);
    });
  });

  // ── readBC2 ───────────────────────────────────────────────────────────────

  describe('readBC2', () => {
    // BC2 block layout (16 bytes):
    //   bytes 0-7:  4-bit alpha per pixel (16 pixels, LSB-first per nibble)
    //   bytes 8-15: BC1 color block

    it('decodes fully opaque red block (all alpha nibbles = 0xF)', () => {
      const block = new Uint8Array(16);
      block.fill(0xff, 0, 8); // all alpha nibbles = 15 → alpha = 255*(15/15) = 255
      block.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      utex.readBC2(block, 0, img, 4, 4);
      expectAllPixels(img, 255, 0, 0, 255);
    });

    it('decodes fully transparent red block (all alpha nibbles = 0x0)', () => {
      const block = new Uint8Array(16);
      block.fill(0x00, 0, 8); // all alpha nibbles = 0 → alpha = 0
      block.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      utex.readBC2(block, 0, img, 4, 4);
      expectAllPixels(img, 255, 0, 0, 0);
    });

    it('returns updated offset (offset + 16)', () => {
      const block = new Uint8Array(16);
      block.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      expect(utex.readBC2(block, 0, img, 4, 4)).toBe(16);
    });
  });

  // ── readBC3 ───────────────────────────────────────────────────────────────

  describe('readBC3', () => {
    // BC3 block layout (16 bytes):
    //   byte  0:    alpha0
    //   byte  1:    alpha1
    //   bytes 2-7:  3-bit alpha indices (16 pixels)
    //   bytes 8-15: BC1 color block

    it('decodes fully opaque red block (alpha0=255, alpha1=0, all indices=0)', () => {
      // inter8(255,0) → al[0]=255; all indices=0 → every pixel alpha=255
      const block = new Uint8Array(16);
      block[0] = 0xff;
      block[1] = 0x00;
      // bytes 2-7: all zero (all indices = 0)
      block.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      utex.readBC3(block, 0, img, 4, 4);
      expectAllPixels(img, 255, 0, 0, 255);
    });

    it('decodes fully transparent red block (alpha0=0, alpha1=0, all indices=0)', () => {
      // inter8(0,0) → al[0]=0; all indices=0 → every pixel alpha=0
      const block = new Uint8Array(16);
      block[0] = 0x00;
      block[1] = 0x00;
      block.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      utex.readBC3(block, 0, img, 4, 4);
      expectAllPixels(img, 255, 0, 0, 0);
    });

    it('uses inter8 6-value path when alpha0 <= alpha1', () => {
      // alpha0=0, alpha1=255 → inter8(0,255): al[6]=0 (reserved), al[7]=255
      // all indices=0 → al[0]=0 → every pixel alpha=0
      const block = new Uint8Array(16);
      block[0] = 0x00;
      block[1] = 0xff;
      block.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      utex.readBC3(block, 0, img, 4, 4);
      expectAllPixels(img, 255, 0, 0, 0);
    });

    it('returns updated offset (offset + 16)', () => {
      const block = new Uint8Array(16);
      block.set(BC1_RED, 8);
      const img = new Uint8Array(64);
      expect(utex.readBC3(block, 0, img, 4, 4)).toBe(16);
    });
  });

  // ── writeBC3 ─────────────────────────────────────────────────────────────

  describe('writeBC3', () => {
    it('produces 16 bytes for a 4×4 image', () => {
      const src = solidBlock(255, 0, 0, 255);
      const out = new Uint8Array(16);
      const end = utex.writeBC3(src, 4, 4, out, 0);
      expect(end).toBe(16);
    });

    it('encodes max alpha correctly (alpha byte ≥ min alpha byte)', () => {
      // writeBC3 stores max alpha at offset+0 and min at offset+1
      const src = solidBlock(128, 64, 32, 200);
      const out = new Uint8Array(16);
      utex.writeBC3(src, 4, 4, out, 0);
      expect(out[0]).toBeGreaterThanOrEqual(out[1]);
    });
  });

  // ── BC3 round-trip ────────────────────────────────────────────────────────

  describe('BC3 round-trip (write → read)', () => {
    function roundTrip(r, g, b, a) {
      const src = solidBlock(r, g, b, a);
      const compressed = new Uint8Array(16);
      utex.writeBC3(src, 4, 4, compressed, 0);
      const decoded = new Uint8Array(64);
      utex.readBC3(compressed, 0, decoded, 4, 4);

      return decoded;
    }

    it('fully opaque red survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(255, 0, 0, 255), 255, 0, 0, 255, 0);
    });

    it('fully opaque blue survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(0, 0, 255, 255), 0, 0, 255, 255, 0);
    });

    it('fully transparent red survives round-trip', () => {
      expectAllPixelsApprox(roundTrip(255, 0, 0, 0), 255, 0, 0, 0, 0);
    });

    it('semi-transparent blue survives round-trip within tolerance', () => {
      expectAllPixelsApprox(roundTrip(0, 0, 255, 128), 0, 0, 255, 128, 10);
    });
  });
});
