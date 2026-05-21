import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const pogsNumbersBold: FontDefinition = loadFont(new URL('./pogs/numbers-bold.json5', import.meta.url));
