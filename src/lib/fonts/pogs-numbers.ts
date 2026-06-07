import { readFileSync } from 'node:fs';
import JSON5 from 'json5';
import type { FontDefinition } from '~/lib/PixelFont.js';
import { resolveAsset } from '~/lib/pkg-root.js';

export const pogsNumbers = JSON5.parse(
  readFileSync(resolveAsset(new URL(import.meta.url), 'fonts', 'pogs', 'numbers.json5'), 'utf8'),
) as FontDefinition;
