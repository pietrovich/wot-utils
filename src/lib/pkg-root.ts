import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function findPkgRoot(url: URL): string {
  let d = dirname(fileURLToPath(url));
  while (!existsSync(resolve(d, 'package.json'))) {
    d = dirname(d);
  }

  return d;
}

// Resolves an asset path for both the built binary and dev (tsx) mode.
//
// Built binary: import.meta.url is dist/index.js, so assets copied by publicDir
// live adjacent to the bundle (e.g. dist/pogs-fixed/...).
//
// Dev / tsx: source files are deep in src/**; the adjacent path won't exist, so
// we fall back to the project root's assets/ directory via findPkgRoot.
export function resolveAsset(url: URL, ...parts: string[]): string {
  const adjacent = resolve(dirname(fileURLToPath(url)), 'assets', ...parts);

  if (existsSync(adjacent)) {
    return adjacent;
  }

  return resolve(findPkgRoot(url), 'assets', ...parts);
}
