import { mkdirSync } from 'node:fs';
import { writeFile, access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import sharp from 'sharp';
import { getAppId } from '~/lib/config.js';
import { WGApiError } from '~/lib/api.js';
import { getCached, setCached, purgeCache as purgeCacheLib } from '~/lib/cache.js';
import type { Vehicle, VehiclesData, WGApiResponse, ModuleType, ModuleNode, VehicleIconSize } from '~/types.js';

const IMAGE_KEY: Record<VehicleIconSize, keyof Vehicle['images']> = {
  small: 'small_icon',
  medium: 'contour_icon',
  large: 'big_icon',
  xs: 'contour_icon', // derived from medium — cropped locally, not fetched from WG
};

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

export class WGData {
  private readonly appId: string;
  private readonly limitOutput: number = 10000;
  private readonly iconsBaseDir: string;
  private vehicles: VehiclesData | null = null;

  constructor() {
    this.appId = getAppId();
    this.limitOutput = process.env.LIMIT_OUTPUT ? Number(process.env.LIMIT_OUTPUT) : 3;
    const cacheDir = process.env.WG_CACHE_DIR ?? '.data/cache';
    this.iconsBaseDir = join(cacheDir, '..', 'icons');
    for (const size of Object.keys(IMAGE_KEY) as VehicleIconSize[]) {
      mkdirSync(join(this.iconsBaseDir, size), { recursive: true });
    }
  }

  async getVehicles(): Promise<Vehicle[]> {
    if (!this.vehicles) {
      const endpoint = 'encyclopedia/vehicles';
      const cached = await getCached<VehiclesData>('list-vehicles', endpoint);

      if (cached) {
        this.vehicles = cached;

        return Object.values(cached);
      }

      this.vehicles = await this.fetchVehicles();

      await setCached('list-vehicles', endpoint, {}, this.vehicles);
    }

    return Object.values(this.vehicles);
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

  async fetchVehicleIcon(
    vehicle: Vehicle,
    size: VehicleIconSize,
    force = false,
  ): Promise<{ skipped: boolean; downloaded: boolean; failed: boolean; path: string | null; error: string | null }> {
    const url = vehicle.images?.[IMAGE_KEY[size]];
    if (!url) {
      return { skipped: true, downloaded: false, failed: false, path: null, error: null };
    }

    const dest = join(this.iconsBaseDir, size, basename(url));

    if (!force && (await fileExists(dest))) {
      return { skipped: true, downloaded: false, failed: false, path: dest, error: null };
    }

    try {
      await downloadIcon(url, dest);

      if (size === 'xs') {
        const { data: trimmed, info } = await sharp(dest).trim().toBuffer({ resolveWithObject: true });
        const SCALE_FACTOR = 0.8;
        const scaled = await sharp(trimmed)
          .resize(Math.round(info.width * SCALE_FACTOR), Math.round(info.height * SCALE_FACTOR))
          .toBuffer();
        await writeFile(dest, scaled);
      }

      return { skipped: false, downloaded: true, failed: false, path: dest, error: null };
    } catch (err) {
      return { skipped: false, downloaded: false, failed: true, path: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async getDefaultVehicleIcon(vehicle: Vehicle, size: VehicleIconSize): Promise<{ data: Buffer; info: sharp.OutputInfo } | null> {
    const result = await this.fetchVehicleIcon(vehicle, size, false);
    if (!result.path) {
      return null;
    }

    return sharp(result.path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  }

  async fetchIcons({ force = false, concurrency = 10, size, query }: { force?: boolean; concurrency?: number; size: VehicleIconSize; query?: string }): Promise<void> {
    const vehicles = query ? [await this.findVehicle(query)] : await this.getVehicles();
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < vehicles.length; i += concurrency) {
      const batch = vehicles.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (vehicle) => {
          const result = await this.fetchVehicleIcon(vehicle, size, force);
          const name = vehicle.images?.[IMAGE_KEY[size]] ? basename(vehicle.images[IMAGE_KEY[size]]) : vehicle.tag;
          if (result.downloaded) {
            downloaded++;
            console.error(`↓ ${name}`);
          } else if (result.failed) {
            failed++;
            console.error(`✗ ${name}: ${result.error}`);
          } else {
            skipped++;
          }
        }),
      );
    }

    console.error(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  }

  getBestConfig(vehicle: Vehicle): Record<ModuleType, number> {
    const tree = vehicle.modules_tree;

    const parent = new Map<number, number>();
    for (const node of Object.values(tree)) {
      if (node.next_modules) {
        for (const childId of node.next_modules) {
          parent.set(childId, node.module_id);
        }
      }
    }

    const depths = new Map<number, number>();
    const depth = (id: number): number => {
      let d = depths.get(id);
      if (d === undefined) {
        const p = parent.get(id);
        d = p === undefined ? 0 : 1 + depth(p);
        depths.set(id, d);
      }

      return d;
    };

    const byType = new Map<ModuleType, ModuleNode>();
    for (const node of Object.values(tree)) {
      const current = byType.get(node.type);
      if (current === undefined) {
        byType.set(node.type, node);
      } else {
        const nd = depth(node.module_id);
        const cd = depth(current.module_id);
        if (nd > cd || (nd === cd && node.module_id > current.module_id)) {
          byType.set(node.type, node);
        }
      }
    }

    const result = {} as Record<ModuleType, number>;
    for (const [type, node] of byType) {
      result[type] = node.module_id;
    }

    return result;
  }

  async inferBestConfig(query: number | string): Promise<Record<ModuleType, number>> {
    return this.getBestConfig(await this.findVehicle(query));
  }

  configToProfileId(config: Partial<Record<ModuleType, number>>): string {
    return Object.values(config)
      .filter((id): id is number => id != null)
      .sort((a, b) => a - b)
      .join('-');
  }

  async getStatsForBestConfig(query: number | string | Vehicle): Promise<unknown> {
    const vehicle = typeof query === 'object' ? query : await this.findVehicle(query);
    const config = this.getBestConfig(vehicle);
    const profileId = this.configToProfileId(config);

    const endpoint = 'encyclopedia/vehicleprofile';
    const params = {
      application_id: this.appId,
      tank_id: String(vehicle.tank_id),
      profile_id: profileId,
    };

    const cacheFilePrefix = `vehicle-${String(vehicle.tank_id).padStart(5, '0')}-profile`;

    const cached = await getCached<unknown>(cacheFilePrefix, endpoint, params);
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

      console.log('failed to find profile', { params });

      throw new WGApiError(err.field, err.code, err.message);
    }
    // IS-3-II
    //

    // d2
    // 579 = d2 APX 4 turret, opens 1348
    // 1348 = gun 47mm SA37
    // 1093 = engine (+)
    // 834 = chassis (+)
    // 583 = radio (+)
    // 323 = turret (-)


    const data = json.data!;
    await setCached(cacheFilePrefix, endpoint, params, data);

    return data;
  }

  async getShortNameStats(): Promise<{
    uniqueCharacters: string;
    maxLength: number;
    longestShortName: string;
    avgLength: number;
    medianLength: number;
    p80Length: number;
    p90Length: number;
  }> {
    const vehicles = await this.getVehicles();
    const chars = new Set<string>();
    let longestShortName = '';
    const lengths: number[] = [];

    for (const v of vehicles) {
      for (const c of v.short_name) {
        chars.add(c);
      }

      lengths.push(v.short_name.length);
      if (v.short_name.length > longestShortName.length) {
        longestShortName = v.short_name;
      }
    }

    const sorted = [...lengths].sort((a, b) => a - b);
    const n = sorted.length;
    const avgLength = Math.round(lengths.reduce((s, l) => s + l, 0) / n);
    const medianLength = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const p80Length = sorted[Math.ceil(0.8 * n) - 1];
    const p90Length = sorted[Math.ceil(0.9 * n) - 1];

    return {
      uniqueCharacters: [...chars].sort().join(''),
      maxLength: sorted[n - 1],
      longestShortName,
      avgLength,
      medianLength,
      p80Length,
      p90Length,
    };
  }

  async purgeCache(): Promise<void> {
    await purgeCacheLib();
  }

  async findVehicle(query: number | string): Promise<Vehicle> {
    const vehicles = await this.getVehicles();
    const q = String(query);
    const isId = /^\d+$/.test(q);
    const vehicle = vehicles.find((v) => {
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

  private async fetchVehicles(): Promise<VehiclesData> {
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
