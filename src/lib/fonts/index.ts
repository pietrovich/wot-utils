import type { FontDefinition } from '~/lib/PixelFont.js';
import { pogsNumbers } from '~/lib/fonts/pogs-numbers.js';
import { pogsNumbersBold } from '~/lib/fonts/pogs-numbers-bold.js';
import { pogs4px } from '~/lib/fonts/pogs-4px.js';
import { pogs3px } from '~/lib/fonts/pogs-3px.js';

export const fonts: Record<string, FontDefinition> = {
  pogsNumbers,
  pogsNumbersBold,
  pogs4px,
  pogs3px,
};
