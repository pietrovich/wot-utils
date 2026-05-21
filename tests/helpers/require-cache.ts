import { existsSync } from 'node:fs';

export function requireDataCache(): void {
  const dir = process.env.WG_CACHE_DIR ?? '.data/cache';
  if (!existsSync(dir)) {
    throw new Error(
      `Data cache directory not found: "${dir}"\n` +
      `Populate it before running integration tests:\n` +
      `  npm start -- vehicle list\n` +
      `  npm start -- icon fetch`,
    );
  }
}
