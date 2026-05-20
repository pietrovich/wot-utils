import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { getCached, setCached, purgeCache } from '../src/lib/cache.js';

const testDir = join(tmpdir(), `wg-test-cache-${process.pid}`);

beforeEach(() => {
  vi.stubEnv('WG_CACHE_DIR', testDir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(testDir, { recursive: true, force: true });
});

describe('getCached', () => {
  it('returns null for a missing entry', async () => {
    expect(await getCached('cmd', 'endpoint', { foo: 'bar' })).toBeNull();
  });
});

describe('setCached / getCached', () => {
  it('stores and retrieves data', async () => {
    const data = { vehicles: [{ id: 1 }] };
    await setCached('cmd', 'endpoint', { foo: 'bar' }, data);
    expect(await getCached('cmd', 'endpoint', { foo: 'bar' })).toEqual(data);
  });

  it('uses a consistent key regardless of param insertion order', async () => {
    const data = { test: true };
    await setCached('cmd', 'ep', { b: '2', a: '1' }, data);
    expect(await getCached('cmd', 'ep', { a: '1', b: '2' })).toEqual(data);
  });

  it('stores different entries for different params', async () => {
    await setCached('cmd', 'ep', { id: '1' }, { v: 'one' });
    await setCached('cmd', 'ep', { id: '2' }, { v: 'two' });
    expect(await getCached('cmd', 'ep', { id: '1' })).toEqual({ v: 'one' });
    expect(await getCached('cmd', 'ep', { id: '2' })).toEqual({ v: 'two' });
  });
});

describe('purgeCache', () => {
  it('removes all cached entries', async () => {
    await setCached('cmd', 'ep', { a: '1' }, { data: 'x' });
    await purgeCache();
    expect(await getCached('cmd', 'ep', { a: '1' })).toBeNull();
  });

  it('does not throw if cache dir does not exist', async () => {
    await expect(purgeCache()).resolves.not.toThrow();
  });
});
