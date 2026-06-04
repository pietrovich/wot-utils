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

  it('rect bottom-middle over explicit point', () => {
    const aligner = createAligner(box, 'bm', [40, 20]);
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

  describe('anchor rounding suffixes', () => {
    it('tm.+ uses ceil on odd rect width', () => {
      // tm offset on rect width=7: 7*0.5=3.5 → ceil=4
      const a = createAligner(box, 'tm.+', [10, 5]);
      const b = createAligner(box, 'tm.-', [10, 5]);
      const resultCeil = a({ width: 7, height: 6 });
      const resultFloor = b({ width: 7, height: 6 });
      expect(resultCeil.left).toBe(10 - 4); // ceil(3.5)=4
      expect(resultFloor.left).toBe(10 - 3); // floor(3.5)=3
    });

    it('.u is alias for .+', () => {
      const a = createAligner(box, 'tm.+', [10, 5]);
      const b = createAligner(box, 'tm.u', [10, 5]);
      expect(a({ width: 7, height: 6 })).toEqual(b({ width: 7, height: 6 }));
    });

    it('.d is alias for .-', () => {
      const a = createAligner(box, 'tm.-', [10, 5]);
      const b = createAligner(box, 'tm.d', [10, 5]);
      expect(a({ width: 7, height: 6 })).toEqual(b({ width: 7, height: 6 }));
    });
  });

  describe('axis expressions', () => {
    it('r and b resolve to box width and height', () => {
      const aligner = createAligner(box, 'tl', ['r', 'b']);
      expect(aligner({ width: 10, height: 5 })).toEqual({ left: 80, top: 24, width: 10, height: 5 });
    });

    it('r - 2 subtracts from box width', () => {
      const aligner = createAligner(box, 'tl', ['r - 2', 10]);
      expect(aligner({ width: 10, height: 5 })).toEqual({ left: 78, top: 10, width: 10, height: 5 });
    });

    it('c is axis-aware: x→bw/2, y→bh/2 (floor)', () => {
      const oddBox = { width: 81, height: 25 };
      const aligner = createAligner(oddBox, 'tl', ['c', 'c']);
      // floor(81/2)=40, floor(25/2)=12
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 40, top: 12, width: 1, height: 1 });
    });

    it('(c).- explicit floor on odd box', () => {
      const oddBox = { width: 81, height: 25 };
      const aligner = createAligner(oddBox, 'tl', ['(c).-', '(c).-']);
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 40, top: 12, width: 1, height: 1 });
    });

    it('c.- bare dim ref with floor suffix on odd box', () => {
      const oddBox = { width: 81, height: 25 };
      const aligner = createAligner(oddBox, 'tl', ['c.-', 'c.-']);
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 40, top: 12, width: 1, height: 1 });
    });

    it('(c).+ ceil on odd box', () => {
      const oddBox = { width: 81, height: 25 };
      const aligner = createAligner(oddBox, 'tl', ['(c).+', '(c).+']);
      // ceil(81/2)=41, ceil(25/2)=13
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 41, top: 13, width: 1, height: 1 });
    });

    it('c.+ bare dim ref with ceil suffix on odd box', () => {
      const oddBox = { width: 81, height: 25 };
      const aligner = createAligner(oddBox, 'tl', ['c.+', 'c.+']);
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 41, top: 13, width: 1, height: 1 });
    });

    it('(r / 3).- floor on 80-wide box', () => {
      const aligner = createAligner(box, 'tl', ['(r / 3).-', 5]);
      // floor(80/3)=26
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 26, top: 5, width: 1, height: 1 });
    });

    it('(r / 3).+ ceil on 80-wide box', () => {
      const aligner = createAligner(box, 'tl', ['(r / 3).+', 5]);
      // ceil(80/3)=27
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 27, top: 5, width: 1, height: 1 });
    });

    it('t and l resolve to 0', () => {
      const aligner = createAligner(box, 'tl', ['t', 'l']);
      expect(aligner({ width: 5, height: 5 })).toEqual({ left: 0, top: 0, width: 5, height: 5 });
    });

    it('t + 5 gives 5', () => {
      const aligner = createAligner(box, 'tl', ['t + 5', 'l + 3']);
      expect(aligner({ width: 1, height: 1 })).toEqual({ left: 5, top: 3, width: 1, height: 1 });
    });
  });
});
