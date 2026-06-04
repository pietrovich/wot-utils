export type { AnchorAlias, AnchorAliasWithRound, DimRef, AxisExpr } from './anchors.js';
import { resolveAnchorWithRound, resolveAxisExpr } from './anchors.js';
import type { AnchorAliasWithRound, AxisExpr } from './anchors.js';

export type Box = { width: number; height: number };
export type Rect = { width: number; height: number };
export type Positioned = { left: number; top: number; width: number; height: number };
export type BoxAnchorPoint = [AxisExpr, AxisExpr];
export type BoxAnchor = AnchorAliasWithRound | BoxAnchorPoint;

export function createAligner(
  box: Box,
  rectAnchor: AnchorAliasWithRound,
  boxAnchor: BoxAnchor,
): (rect: Rect) => Positioned {
  return (rect) => {
    const [bx, by] = Array.isArray(boxAnchor)
      ? [resolveAxisExpr(boxAnchor[0], box.width, box.height, 'x'), resolveAxisExpr(boxAnchor[1], box.width, box.height, 'y')]
      : resolveAnchorWithRound(boxAnchor, box.width, box.height);
    const [ox, oy] = resolveAnchorWithRound(rectAnchor, rect.width, rect.height);

    return { left: bx - ox, top: by - oy, width: rect.width, height: rect.height };
  };
}
