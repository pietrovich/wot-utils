import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { getAppId } from './lib/config.js';
import { WGApiError } from './lib/api.js';
import { getCached, setCached, purgeCache as purgeCacheLib } from './lib/cache.js';
import type { VehiclesData, WGApiResponse } from './types.js';

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
  private readonly appId: string;

  constructor() {
    this.appId = getAppId();
  }

  async getVehicles({ useCache = true, cacheAll = false }: { useCache?: boolean; cacheAll?: boolean } = {}): Promise<VehiclesData> {
    const endpoint = 'encyclopedia/vehicles';
    const limit = cacheAll ? undefined : 3;
    const params: Record<string, string> = { application_id: this.appId };
    if (limit) {
      params.limit = String(limit);
    }

    if (useCache) {
      const cached = await getCached<VehiclesData>('list-vehicles', endpoint, params);
      if (cached) return cached;
    }

    const data = await this.fetchVehicles(limit);

    if (useCache) {
      await setCached('list-vehicles', endpoint, params, data);
    }

    return data;
  }

  async exportVehicles({ output, useCache = true }: { output?: string; useCache?: boolean } = {}): Promise<void> {
    const endpoint = 'encyclopedia/vehicles';
    const params = { application_id: this.appId };
    const outputPath = output ?? `wg-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    let data: VehiclesData | null = null;
    if (useCache) {
      data = await getCached<VehiclesData>('export', endpoint, params);
    }

    if (!data) {
      data = await this.fetchVehicles();
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

  private async fetchVehicles(limit?: number): Promise<VehiclesData> {
    const url = new URL('https://api.worldoftanks.eu/wot/encyclopedia/vehicles/');
    url.searchParams.set('application_id', this.appId);
    if (limit) {
      url.searchParams.set('limit', String(limit));
    }

    const response = await fetch(url.toString());
    const json = (await response.json()) as WGApiResponse<VehiclesData>;

    if (json.status === 'error') {
      const err = json.error!;
      throw new WGApiError(err.field, err.code, err.message);
    }

    return json.data!;
  }
}
