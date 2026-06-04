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

function applySuffixRound(suffix: string | undefined, n: number): number {
  return (suffix === '.u' || suffix === '.+') ? Math.ceil(n) : Math.floor(n);
}

export function resolveOffset(alias: AnchorAlias, w: number, h: number): [number, number] {
  const [fx, fy] = OFFSETS[ALIASES[alias]];

  return [fx * w, fy * h];
}

export function resolveAnchorWithRound(alias: AnchorAliasWithRound, w: number, h: number): [number, number] {
  const last2 = alias.slice(-2);
  const hasSuffix = ROUND_SUFFIXES.has(last2);
  const pureAlias = (hasSuffix ? alias.slice(0, -2) : alias) as AnchorAlias;
  const suffix = hasSuffix ? last2 : undefined;
  const [rx, ry] = resolveOffset(pureAlias, w, h);

  return [applySuffixRound(suffix, rx), applySuffixRound(suffix, ry)];
}

// --- Axis expressions (for [AxisExpr, AxisExpr] box anchor tuples) ---

export type DimRef = 't' | 'l' | 'c' | 'r' | 'b' | 'w' | 'bw' | 'h' | 'bh';
type InnerExpr = DimRef | `${DimRef} ${'+'|'-'|'/'} ${number}`;
export type AxisExpr =
  | number
  | InnerExpr
  | `${DimRef}${RoundSuffix}`
  | `(${InnerExpr})${RoundSuffix}`
  | (string & {});

function resolveDimRef(dim: string, bw: number, bh: number, axis: 'x' | 'y'): number {
  if (dim === 't' || dim === 'l') { return 0; }

  if (dim === 'c') { return axis === 'x' ? bw / 2 : bh / 2; }

  if (dim === 'r' || dim === 'w' || dim === 'bw') { return bw; }

  return bh; // b, h, bh
}

const INNER_RE = /^(t|l|c|r|b|w|bw|h|bh)(?:\s*([+\-\/])\s*(\d+(?:\.\d+)?))?$/;

function resolveInner(expr: string, bw: number, bh: number, axis: 'x' | 'y'): number {
  const match = INNER_RE.exec(expr.trim());
  if (!match) { throw new Error(`Invalid axis expression: "${expr}"`); }

  const [, dim, op, numStr] = match;
  const base = resolveDimRef(dim, bw, bh, axis);
  if (!op) { return base; }

  const n = Number(numStr);
  if (op === '+') { return base + n; }

  if (op === '-') { return base - n; }

  return base / n;
}

export function resolveAxisExpr(expr: AxisExpr, bw: number, bh: number, axis: 'x' | 'y'): number {
  if (typeof expr === 'number') { return expr; }

  const s = String(expr);
  const groupMatch = /^\((.+)\)([.][ud+\-])$/.exec(s);
  if (groupMatch) {
    return applySuffixRound(groupMatch[2], resolveInner(groupMatch[1], bw, bh, axis));
  }

  const last2 = s.slice(-2);
  if (ROUND_SUFFIXES.has(last2)) {
    return applySuffixRound(last2, resolveInner(s.slice(0, -2).trim(), bw, bh, axis));
  }

  return Math.floor(resolveInner(s, bw, bh, axis));
}
