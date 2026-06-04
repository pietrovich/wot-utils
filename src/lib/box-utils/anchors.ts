type CanonicalAnchor = 'tl' | 't' | 'tr' | 'l' | 'c' | 'r' | 'bl' | 'b' | 'br';

const ALIASES = {
  // top-left
  tl: 'tl', lt: 'tl', 'top-left': 'tl', 'left-top': 'tl',
  // top
  t: 't', tc: 't', ct: 't', top: 't', 'top-center': 't', 'center-top': 't',
  // top-right
  tr: 'tr', rt: 'tr', 'top-right': 'tr', 'right-top': 'tr',
  // left
  l: 'l', lc: 'l', cl: 'l', ml: 'l', left: 'l', 'left-center': 'l', 'center-left': 'l', 'middle-left': 'l',
  // center
  c: 'c', m: 'c', cc: 'c', center: 'c', middle: 'c',
  // right
  r: 'r', rc: 'r', cr: 'r', mr: 'r', right: 'r', 'right-center': 'r', 'center-right': 'r', 'middle-right': 'r',
  // bottom-left
  bl: 'bl', lb: 'bl', 'bottom-left': 'bl', 'left-bottom': 'bl',
  // bottom
  b: 'b', bc: 'b', cb: 'b', mb: 'b', bottom: 'b', 'bottom-center': 'b', 'center-bottom': 'b',
  // bottom-right
  br: 'br', rb: 'br', 'bottom-right': 'br', 'right-bottom': 'br',
} as const satisfies Record<string, CanonicalAnchor>;

export type AnchorAlias = keyof typeof ALIASES;

const OFFSETS: Record<CanonicalAnchor, [number, number]> = {
  tl: [0, 0],    t: [0.5, 0],   tr: [1, 0],
   l: [0, 0.5],  c: [0.5, 0.5],  r: [1, 0.5],
  bl: [0, 1],    b: [0.5, 1],   br: [1, 1],
};

export function resolveOffset(alias: AnchorAlias, w: number, h: number): [number, number] {
  const [fx, fy] = OFFSETS[ALIASES[alias]];
  return [fx * w, fy * h];
}
