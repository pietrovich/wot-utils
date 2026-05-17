import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { getAppId } from '../lib/config.js';
import { fetchVehicles, WGApiError } from '../lib/api.js';
import { getCached, setCached } from '../lib/cache.js';
import type { VehiclesData } from '../types.js';

export function exportCommand(): Command {
  return new Command('export')
    .description('Export all vehicles to a JSON file')
    .option('--output <path>', 'output file path (default: wg-export-<timestamp>.json)')
    .option('--app-id <id>', 'Wargaming application ID (overrides WG_APP_ID)')
    .option('--no-cache', 'bypass cache and fetch fresh data')
    .action(async (options) => {
      try {
        const appId = getAppId(options.appId);
        const endpoint = 'encyclopedia/vehicles';
        const params = { application_id: appId };
        const outputPath: string = options.output ?? `wg-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

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

        await writeFile(outputPath, JSON.stringify(data, null, 2));
        console.error(`Exported ${Object.keys(data).length} vehicles to ${outputPath}`);
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
