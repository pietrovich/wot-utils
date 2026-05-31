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
