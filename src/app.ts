import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { getAppId } from './lib/config.js';
import { WGApiError } from './lib/api.js';
import { getCached, setCached, purgeCache as purgeCacheLib } from './lib/cache.js';
import type { Vehicle, VehiclesData, WGApiResponse, ModuleType, ModuleNode } from './types.js';

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

  async getVehicles({
    useCache = true,
    cacheAll = false,
  }: { useCache?: boolean; cacheAll?: boolean } = {}): Promise<VehiclesData> {
    const endpoint = 'encyclopedia/vehicles';
    const limit = cacheAll ? undefined : 3;
    const params: Record<string, string> = {};
    if (limit) {
      params.limit = String(limit);
    }

    if (useCache) {
      const cached = await getCached<VehiclesData>('list-vehicles', endpoint, params);
      if (cached) {
        return cached;
      }
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

  async inferBestConfig(query: number | string): Promise<Record<ModuleType, number>> {
    const vehicle = await this.findVehicle(query);

    const byType = new Map<ModuleType, ModuleNode[]>();
    for (const node of Object.values(vehicle.modules_tree)) {
      const list = byType.get(node.type) ?? [];
      list.push(node);
      byType.set(node.type, list);
    }

    const result = {} as Record<ModuleType, number>;
    for (const [type, modules] of byType) {
      const terminals = modules.filter((m) => m.next_modules === null);
      const candidates = terminals.length > 0 ? terminals : modules;
      result[type] = candidates.reduce((a, b) => (b.module_id > a.module_id ? b : a)).module_id;
    }

    return result;
  }

  configToProfileId(config: Partial<Record<ModuleType, number>>): string {
    return Object.values(config)
      .filter((id): id is number => id != null)
      .sort((a, b) => a - b)
      .join('-');
  }

  async getStatsForBestConfig(query: number | string): Promise<unknown> {
    const vehicle = await this.findVehicle(query);
    const config = await this.inferBestConfig(query);
    const profileId = this.configToProfileId(config);

    const endpoint = 'encyclopedia/vehicleprofile';
    const params = {
      application_id: this.appId,
      tank_id: String(vehicle.tank_id),
      profile_id: profileId,
    };

    const cached = await getCached<unknown>('vehicle-profile', endpoint, params);
    if (cached) {
      return cached;
    }

    const url = new URL(`https://api.worldoftanks.eu/wot/${endpoint}/`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const response = await fetch(url.toString());
    const json = (await response.json()) as WGApiResponse<unknown>;

    if (json.status === 'error') {
      const err = json.error!;
      throw new WGApiError(err.field, err.code, err.message);
    }

    const data = json.data!;
    await setCached('vehicle-profile', endpoint, params, data);

    return data;
  }

  async purgeCache(): Promise<void> {
    await purgeCacheLib();
  }

  private async findVehicle(query: number | string): Promise<Vehicle> {
    const vehicles = await this.getVehicles();
    const q = String(query);
    const isId = /^\d+$/.test(q);
    const vehicle = Object.values(vehicles).find((v) => {
      if (isId) {
        return v.tank_id === Number(q);
      }

      return v.tag === q || v.short_name === q;
    });

    if (!vehicle) {
      throw new Error(`Vehicle not found: ${query}`);
    }

    return vehicle;
  }

  private async fetchVehicles(limit?: number): Promise<VehiclesData> {
    const fields = [
      '-crew',
      '-default_profile',
      '-description',
      '-prices_xp',
      '-price_gold',
      '-price_credit',
      '-next_tanks',
    ].join(',');

    const url = new URL('https://api.worldoftanks.eu/wot/encyclopedia/vehicles/');
    url.searchParams.set('application_id', this.appId);
    // url.searchParams.set('fields', fields);

    if (limit) {
      url.searchParams.set('limit', String(limit));
    }

    const tmp = `${url.toString()}&fields=${fields}`;
    const response = await fetch(tmp);
    const json = (await response.json()) as WGApiResponse<VehiclesData>;

    if (json.status === 'error') {
      const err = json.error!;
      throw new WGApiError(err.field, err.code, err.message);
    }

    return json.data!;
  }
}
