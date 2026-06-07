export type { AnchorAlias, AnchorAliasWithRound, DimRef, AxisExpr } from './Aligner.js';
export type { Box, Rect, Positioned, BoxAnchorPoint, BoxAnchor, AlignerParams } from './Aligner.js';
export { Aligner } from './Aligner.js';

import { Aligner } from './Aligner.js';
import type { Box, BoxAnchor, AnchorAliasWithRound } from './Aligner.js';

export function createAligner(box: Box, rectAnchor: AnchorAliasWithRound, boxAnchor: BoxAnchor): Aligner {
  return new Aligner(box, rectAnchor, boxAnchor);
}
