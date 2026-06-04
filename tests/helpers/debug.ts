import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findPkgRoot } from '~/lib/pkg-root.js';

const tmpDir = join(findPkgRoot(new URL(import.meta.url)), 'tests', 'tmp');

export function saveDebug(filename: string, data: Buffer): void {
  if (!process.env.DEBUG) {
    return;
  }
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(join(tmpDir, filename), data);
}
