import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { getAppId } from './lib/config.js';
import { fetchVehicles } from './lib/api.js';
import { getCached, setCached, purgeCache as purgeCacheLib } from './lib/cache.js';
import type { VehiclesData } from './types.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadIcon(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(dest, buffer);
}

export class App {
  async getVehicles({ useCache = true, cacheAll = false }: { useCache?: boolean; cacheAll?: boolean } = {}): Promise<VehiclesData> {
    const appId = getAppId();
    const endpoint = 'encyclopedia/vehicles';
    const params = { application_id: appId };

    if (useCache) {
      const cached = await getCached<VehiclesData>('list-vehicles', endpoint, params);
      if (cached) return cached;
    }

    const data = await fetchVehicles(appId);

    if (useCache) {
      const toCache = cacheAll ? data : Object.fromEntries(Object.entries(data).slice(0, 3));
      await setCached('list-vehicles', endpoint, params, toCache);
    }

    return data;
  }

  async exportVehicles({ output, useCache = true }: { output?: string; useCache?: boolean } = {}): Promise<void> {
    const appId = getAppId();
    const endpoint = 'encyclopedia/vehicles';
    const params = { application_id: appId };
    const outputPath = output ?? `wg-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    let data: VehiclesData | null = null;
    if (useCache) {
      data = await getCached<VehiclesData>('export', endpoint, params);
    }

    if (!data) {
      data = await fetchVehicles(appId);
      if (useCache) {
        await setCached('export', endpoint, params, data);
      }
    }

    await writeFile(outputPath, JSON.stringify(data, null, 2));
    console.error(`Exported ${Object.keys(data).length} vehicles to ${outputPath}`);
  }

  async fetchIcons({ force = false, concurrency = 10 }: { force?: boolean; concurrency?: number } = {}): Promise<void> {
    const vehicles = await this.getVehicles();

    const cacheDir = process.env.WG_CACHE_DIR ?? '.data/cache';
    const iconsDir = join(dirname(cacheDir), 'contour-icons');
    await mkdir(iconsDir, { recursive: true });

    const all = Object.values(vehicles);
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < all.length; i += concurrency) {
      const batch = all.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (vehicle) => {
          const url = vehicle.images?.contour_icon;
          if (!url) {
            skipped++;
            return;
          }

          const dest = join(iconsDir, basename(url));

          if (!force && (await fileExists(dest))) {
            skipped++;
            return;
          }

          try {
            await downloadIcon(url, dest);
            downloaded++;
            console.error(`↓ ${basename(url)}`);
          } catch (err) {
            failed++;
            console.error(`✗ ${basename(url)}: ${err instanceof Error ? err.message : err}`);
          }
        }),
      );
    }

    console.error(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  }

  async purgeCache(): Promise<void> {
    await purgeCacheLib();
  }
}
