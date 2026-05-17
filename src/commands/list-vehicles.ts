import { Command } from 'commander';
import { getAppId } from '../lib/config.js';
import { fetchVehicles, WGApiError } from '../lib/api.js';
import { getCached, setCached } from '../lib/cache.js';
import { printJson, printVehiclesTable } from '../lib/format.js';
import type { VehiclesData } from '../types.js';

export function listVehiclesCommand(): Command {
  return new Command('list-vehicles')
    .description('List all vehicles from the WoT encyclopedia')
    .option('--table', 'render output as a table')
    .option('--app-id <id>', 'Wargaming application ID (overrides WG_APP_ID)')
    .option('--no-cache', 'bypass cache and fetch fresh data')
    .action(async (options) => {
      try {
        const appId = getAppId(options.appId);
        const endpoint = 'encyclopedia/vehicles';
        const params = { application_id: appId };

        let data: VehiclesData | null = null;
        if (options.cache) {
          data = await getCached<VehiclesData>(endpoint, params);
        }

        if (!data) {
          data = await fetchVehicles(appId);
          if (options.cache) {
            await setCached(endpoint, params, data);
          }
        }

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
