import { Command } from 'commander';
import { getAppId } from '../lib/config.js';
import { fetchVehicles, WGApiError } from '../lib/api.js';
import { getCached, setCached } from '../lib/cache.js';
import { printJson, printVehiclesTable } from '../lib/format.js';
import type { VehiclesData } from '../types.js';

export async function getVehicles({ useCache = true, cacheAll = false }: { useCache?: boolean; cacheAll?: boolean } = {}): Promise<VehiclesData> {
  const resolvedAppId = getAppId();
  const endpoint = 'encyclopedia/vehicles';
  const params = { application_id: resolvedAppId };

  if (useCache) {
    const cached = await getCached<VehiclesData>('list-vehicles', endpoint, params);
    if (cached) return cached;
  }

  const data = await fetchVehicles(resolvedAppId);

  if (useCache) {
    const toCache = cacheAll ? data : Object.fromEntries(Object.entries(data).slice(0, 3));
    await setCached('list-vehicles', endpoint, params, toCache);
  }

  return data;
}

export function listVehiclesCommand(): Command {
  return new Command('list-vehicles')
    .description('List all vehicles from the WoT encyclopedia')
    .option('--table', 'render output as a table')
    .option('--no-cache', 'bypass cache and fetch fresh data')
    .option('--all', 'cache all vehicles (default: only first 3 are cached)')
    .action(async (options) => {
      try {
        const data = await getVehicles({ useCache: options.cache, cacheAll: options.all });

        if (options.table) {
          printVehiclesTable(data);
        } else {
          printJson(data);
        }
      } catch (error) {
        if (error instanceof WGApiError) {
          console.error(`API error [${error.code}] ${error.field}: ${error.message}`);
        } else {
          console.error('Error:', error instanceof Error ? error.message : error);
        }

        process.exit(1);
      }
    });
}
