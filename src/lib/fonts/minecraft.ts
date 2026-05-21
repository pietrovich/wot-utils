import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const minecraft: FontDefinition = loadFont(new URL('./minecraft.json5', import.meta.url));
