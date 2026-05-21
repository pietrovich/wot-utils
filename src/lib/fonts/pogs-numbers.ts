import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const pogsNumbers: FontDefinition = loadFont(new URL('./pogs/numbers.json5', import.meta.url));
