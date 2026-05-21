import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const font7: FontDefinition = loadFont(new URL('./font7.json5', import.meta.url));
