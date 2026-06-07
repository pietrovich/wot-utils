
import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import { printJson, printVehiclesTable } from '~/lib/format.js';
import type { WGData } from '~/lib/WGData.js';

export function listVehiclesCommand(app: WGData): Command {
  return new Command('list')
    .description('List vehicles from the WoT encyclopedia')
    .option('--all', 'show all vehicles (default: first 3)')
    .option('--json', 'output as JSON')
    .action(async (options) => {
      try {
        const vehicles = await app.getVehicles();
        const items = options.all ? vehicles : vehicles.slice(0, 3);

        if (options.json) {
          printJson(items);
        } else {
          printVehiclesTable(items);
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
