import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

function getCacheDir(): string {
  return process.env.WG_CACHE_DIR ?? '.data/cache';
}

function cacheKey(prefix: string, endpoint: string, params: Record<string, string>): string {
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const input = `${endpoint}:${JSON.stringify(sorted)}`;
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 16);

  return `${prefix}-${hash}`;
}

interface CacheEntry<T> {
  fetchedAt: string;
  data: T;
}

export async function getCached<T>(
  prefix: string,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  const file = join(getCacheDir(), `${cacheKey(prefix, endpoint, params)}.json`);
  try {
    const raw = await readFile(file, 'utf-8');

    return (JSON.parse(raw) as CacheEntry<T>).data;
  } catch {
    return null;
  }
}

export async function setCached<T>(
  prefix: string,
  endpoint: string,
  params: Record<string, string>,
  data: T,
): Promise<void> {
  const dir = getCacheDir();
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${cacheKey(prefix, endpoint, params)}.json`);
  const entry: CacheEntry<T> = { fetchedAt: new Date().toISOString(), data };
  await writeFile(file, JSON.stringify(entry, null, 2));
}

export async function purgeCache(): Promise<void> {
  await rm(getCacheDir(), { recursive: true, force: true });
}
