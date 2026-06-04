export type { AnchorAlias } from './anchors.js';
import { resolveOffset } from './anchors.js';
import type { AnchorAlias } from './anchors.js';

export type Box = { width: number; height: number };
export type Rect = { width: number; height: number };
export type Positioned = { left: number; top: number; width: number; height: number };
export type BoxAnchor = AnchorAlias | [number, number];

export function createAligner(
  box: Box,
  rectAnchor: AnchorAlias,
  boxAnchor: BoxAnchor,
): (rect: Rect) => Positioned {
  return (rect) => {
    const [bx, by] = Array.isArray(boxAnchor)
      ? boxAnchor
      : resolveOffset(boxAnchor, box.width, box.height);
    const [ox, oy] = resolveOffset(rectAnchor, rect.width, rect.height);
    return { left: Math.floor(bx - ox), top: Math.floor(by - oy), width: rect.width, height: rect.height };
  };
}
