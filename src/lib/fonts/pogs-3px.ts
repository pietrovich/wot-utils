import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const pogs3px: FontDefinition = loadFont(new URL('./pogs/3px.json5', import.meta.url));
