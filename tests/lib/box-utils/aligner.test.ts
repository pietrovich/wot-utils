import { describe, expect, it } from 'vitest';
import { createAligner } from '~/lib/box-utils/index.js';

const box = { width: 80, height: 24 };

describe('createAligner', () => {
  it('centers rect over box center', () => {
    const aligner = createAligner(box, 'c', 'c');
    expect(aligner({ width: 30, height: 10 })).toEqual({ left: 25, top: 7, width: 30, height: 10 });
  });

  it('top-left over top-left gives origin', () => {
    const aligner = createAligner(box, 'tl', 'tl');
    expect(aligner({ width: 30, height: 10 })).toEqual({ left: 0, top: 0, width: 30, height: 10 });
  });

  it('bottom-right over bottom-right aligns correctly', () => {
    const aligner = createAligner(box, 'br', 'br');
    expect(aligner({ width: 30, height: 10 })).toEqual({ left: 50, top: 14, width: 30, height: 10 });
  });

  it('rect bottom over explicit point', () => {
    const aligner = createAligner(box, 'b', [40, 20]);
    expect(aligner({ width: 30, height: 10 })).toEqual({ left: 25, top: 10, width: 30, height: 10 });
  });

  it('rect top-left over box center', () => {
    const aligner = createAligner(box, 'tl', 'c');
    expect(aligner({ width: 30, height: 10 })).toEqual({ left: 40, top: 12, width: 30, height: 10 });
  });

  it('preserves rect dimensions in result', () => {
    const aligner = createAligner(box, 'c', 'c');
    const result = aligner({ width: 44, height: 6 });
    expect(result.width).toBe(44);
    expect(result.height).toBe(6);
  });

  it('allows overflow (left/top may be negative)', () => {
    const aligner = createAligner(box, 'c', 'tl');
    expect(aligner({ width: 30, height: 10 })).toEqual({ left: -15, top: -5, width: 30, height: 10 });
  });

  describe('anchor aliases', () => {
    it('lt resolves same as tl', () => {
      const a = createAligner(box, 'tl', 'c');
      const b = createAligner(box, 'lt', 'c');
      expect(a({ width: 30, height: 10 })).toEqual(b({ width: 30, height: 10 }));
    });

    it('top-left resolves same as tl', () => {
      const a = createAligner(box, 'tl', 'c');
      const b = createAligner(box, 'top-left', 'c');
      expect(a({ width: 30, height: 10 })).toEqual(b({ width: 30, height: 10 }));
    });

    it('left-top resolves same as tl', () => {
      const a = createAligner(box, 'tl', 'c');
      const b = createAligner(box, 'left-top', 'c');
      expect(a({ width: 30, height: 10 })).toEqual(b({ width: 30, height: 10 }));
    });

    it('middle resolves same as c', () => {
      const a = createAligner(box, 'c', 'c');
      const b = createAligner(box, 'middle', 'middle');
      expect(a({ width: 30, height: 10 })).toEqual(b({ width: 30, height: 10 }));
    });

    it('bottom-right resolves same as br', () => {
      const a = createAligner(box, 'br', 'br');
      const b = createAligner(box, 'bottom-right', 'right-bottom');
      expect(a({ width: 30, height: 10 })).toEqual(b({ width: 30, height: 10 }));
    });
  });
});
