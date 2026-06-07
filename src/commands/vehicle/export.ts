import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { WGData } from '~/lib/WGData.js';

export function exportCommand(app: WGData): Command {
  return new Command('export')
    .description('Export all vehicles to a JSON file')
    .option('--output <path>', 'output file path (default: wg-export-<timestamp>.json)')
    .option('--no-cache', 'bypass cache and fetch fresh data')
    .action(async (options) => {
      try {
        await app.exportVehicles({ output: options.output, useCache: options.cache });
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
