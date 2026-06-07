type CanonicalAnchor = 'tl' | 'tm' | 'tr' | 'lm' | 'c' | 'rm' | 'bl' | 'bm' | 'br';

const ALIASES = {
  // top-left
  tl: 'tl', lt: 'tl', 'top-left': 'tl', 'left-top': 'tl',
  // top-middle
  tm: 'tm', tc: 'tm', ct: 'tm', top: 'tm', 'top-center': 'tm', 'top-middle': 'tm', 'center-top': 'tm', 'middle-top': 'tm',
  // top-right
  tr: 'tr', rt: 'tr', 'top-right': 'tr', 'right-top': 'tr',
  // left-middle
  lm: 'lm', lc: 'lm', cl: 'lm', ml: 'lm', left: 'lm', 'left-center': 'lm', 'left-middle': 'lm', 'center-left': 'lm', 'middle-left': 'lm',
  // center
  c: 'c', m: 'c', cc: 'c', center: 'c', middle: 'c',
  // right-middle
  rm: 'rm', rc: 'rm', cr: 'rm', mr: 'rm', right: 'rm', 'right-center': 'rm', 'right-middle': 'rm', 'center-right': 'rm', 'middle-right': 'rm',
  // bottom-left
  bl: 'bl', lb: 'bl', 'bottom-left': 'bl', 'left-bottom': 'bl',
  // bottom-middle
  bm: 'bm', bc: 'bm', cb: 'bm', mb: 'bm', bottom: 'bm', 'bottom-center': 'bm', 'bottom-middle': 'bm', 'center-bottom': 'bm', 'middle-bottom': 'bm',
  // bottom-right
  br: 'br', rb: 'br', 'bottom-right': 'br', 'right-bottom': 'br',
} as const satisfies Record<string, CanonicalAnchor>;

export type AnchorAlias = keyof typeof ALIASES;

type RoundSuffix = '.u' | '.d' | '.+' | '.-';
export type AnchorAliasWithRound = AnchorAlias | `${AnchorAlias}${RoundSuffix}`;

const OFFSETS: Record<CanonicalAnchor, [number, number]> = {
  tl: [0, 0],    tm: [0.5, 0],   tr: [1, 0],
  lm: [0, 0.5],   c: [0.5, 0.5], rm: [1, 0.5],
  bl: [0, 1],    bm: [0.5, 1],   br: [1, 1],
};

const ROUND_SUFFIXES: ReadonlySet<string> = new Set(['.u', '.d', '.+', '.-']);

export type DimRef = 't' | 'l' | 'c' | 'r' | 'b' | 'w' | 'bw' | 'h' | 'bh';
type InnerExpr = DimRef | `${DimRef} ${'+'|'-'|'/'} ${number}`;
export type AxisExpr =
  | number
  | InnerExpr
  | `${DimRef}${RoundSuffix}`
  | `(${InnerExpr})${RoundSuffix}`
  | (string & {});

const INNER_RE = /^(t|l|c|r|b|w|bw|h|bh)(?:\s*([+\-\/])\s*(\d+(?:\.\d+)?))?$/;

export type Box = { width: number; height: number };
export type Rect = { width: number; height: number };
export type Positioned = { left: number; top: number; width: number; height: number };
export type BoxAnchorPoint = [AxisExpr, AxisExpr];
export type BoxAnchor = AnchorAliasWithRound | BoxAnchorPoint;

export type AlignerParams = {
  box: Box;
  rectAnchor: AnchorAliasWithRound;
  boxAnchor: BoxAnchor;
};

export class Aligner {
  readonly params: AlignerParams;
  readonly #bx: number;
  readonly #by: number;
  #sx: number = 0;
  #sy: number = 0;

  constructor(box: Box, rectAnchor: AnchorAliasWithRound, boxAnchor: BoxAnchor) {
    this.params = { box, rectAnchor, boxAnchor };
    [this.#bx, this.#by] = Array.isArray(boxAnchor)
      ? [Aligner.#resolveAxisExpr(boxAnchor[0], box.width, box.height, 'x'), Aligner.#resolveAxisExpr(boxAnchor[1], box.width, box.height, 'y')]
      : Aligner.#resolveAnchorWithRound(boxAnchor, box.width, box.height);
  }

  align(rect: Rect): Positioned {
    const [ox, oy] = Aligner.#resolveAnchorWithRound(this.params.rectAnchor, rect.width, rect.height);

    return { left: this.#bx + this.#sx - ox, top: this.#by + this.#sy - oy, width: rect.width, height: rect.height };
  }

  clone(overrides?: Partial<AlignerParams>): Aligner {
    const a = new Aligner(
      overrides?.box ?? this.params.box,
      overrides?.rectAnchor ?? this.params.rectAnchor,
      overrides?.boxAnchor ?? this.params.boxAnchor,
    );
    a.#sx = this.#sx;
    a.#sy = this.#sy;

    return a;
  }

  shift(x: number, y: number): Aligner {
    const a = new Aligner(this.params.box, this.params.rectAnchor, this.params.boxAnchor);
    a.#sx = this.#sx + x;
    a.#sy = this.#sy + y;

    return a;
  }

  static #applySuffixRound(suffix: string | undefined, n: number): number {
    return (suffix === '.u' || suffix === '.+') ? Math.ceil(n) : Math.floor(n);
  }

  static #resolveOffset(alias: AnchorAlias, w: number, h: number): [number, number] {
    const [fx, fy] = OFFSETS[ALIASES[alias]];

    return [fx * w, fy * h];
  }

  static #resolveAnchorWithRound(alias: AnchorAliasWithRound, w: number, h: number): [number, number] {
    const last2 = alias.slice(-2);
    const hasSuffix = ROUND_SUFFIXES.has(last2);
    const pureAlias = (hasSuffix ? alias.slice(0, -2) : alias) as AnchorAlias;
    const suffix = hasSuffix ? last2 : undefined;
    const [rx, ry] = Aligner.#resolveOffset(pureAlias, w, h);

    return [Aligner.#applySuffixRound(suffix, rx), Aligner.#applySuffixRound(suffix, ry)];
  }

  static #resolveDimRef(dim: string, bw: number, bh: number, axis: 'x' | 'y'): number {
    if (dim === 't' || dim === 'l') { return 0; }

    if (dim === 'c') { return axis === 'x' ? bw / 2 : bh / 2; }

    if (dim === 'r' || dim === 'w' || dim === 'bw') { return bw; }

    return bh; // b, h, bh
  }

  static #resolveInner(expr: string, bw: number, bh: number, axis: 'x' | 'y'): number {
    const match = INNER_RE.exec(expr.trim());
    if (!match) { throw new Error(`Invalid axis expression: "${expr}"`); }

    const [, dim, op, numStr] = match;
    const base = Aligner.#resolveDimRef(dim, bw, bh, axis);
    if (!op) { return base; }

    const n = Number(numStr);
    if (op === '+') { return base + n; }

    if (op === '-') { return base - n; }

    return base / n;
  }

  static #resolveAxisExpr(expr: AxisExpr, bw: number, bh: number, axis: 'x' | 'y'): number {
    if (typeof expr === 'number') { return expr; }

    const s = String(expr);
    const groupMatch = /^\((.+)\)([.][ud+\-])$/.exec(s);
    if (groupMatch) {
      return Aligner.#applySuffixRound(groupMatch[2], Aligner.#resolveInner(groupMatch[1], bw, bh, axis));
    }

    const last2 = s.slice(-2);
    if (ROUND_SUFFIXES.has(last2)) {
      return Aligner.#applySuffixRound(last2, Aligner.#resolveInner(s.slice(0, -2).trim(), bw, bh, axis));
    }

    return Math.floor(Aligner.#resolveInner(s, bw, bh, axis));
  }
}
