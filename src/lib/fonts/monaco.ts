import { loadFont } from '~/lib/fonts/load-font.js';
import type { FontDefinition } from '~/lib/PixelFont.js';

export const monaco: FontDefinition = loadFont(new URL('./monaco.json5', import.meta.url));
