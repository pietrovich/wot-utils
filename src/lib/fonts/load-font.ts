import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import type { FontDefinition } from '~/lib/PixelFont.js';

export function loadFont(url: URL): FontDefinition {
  const raw = readFileSync(fileURLToPath(url), 'utf8');

  return JSON5.parse(raw) as FontDefinition;
}
