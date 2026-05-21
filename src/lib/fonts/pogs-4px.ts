import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const pogs4px: FontDefinition = loadFont(new URL('./pogs/4px.json5', import.meta.url));
