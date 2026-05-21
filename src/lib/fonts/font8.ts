import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const font8: FontDefinition = loadFont(new URL('./font8.json5', import.meta.url));
