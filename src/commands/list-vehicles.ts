import { Command } from 'commander';
import { WGApiError } from '../lib/api.js';
import { printJson, printVehiclesTable } from '../lib/format.js';
import type { App } from '../app.js';

export function listVehiclesCommand(app: App): Command {
  return new Command('list-vehicles')
    .description('List all vehicles from the WoT encyclopedia')
    .option('--table', 'render output as a table')
    .option('--no-cache', 'bypass cache and fetch fresh data')
    .option('--all', 'cache all vehicles (default: only first 3 are cached)')
    .action(async (options) => {
      try {
        const data = await app.getVehicles({ useCache: options.cache, cacheAll: options.all });

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
