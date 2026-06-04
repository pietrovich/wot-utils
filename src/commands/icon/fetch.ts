import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { WGData } from '~/lib/WGData.js';
import type { VehicleIconSize } from '~/types.js';

export function parseSize(input: string): VehicleIconSize {
  switch (input.toLowerCase()) {
    case 's':
    case 'small':
      return 'small';
    case 'm':
    case 'medium':
      return 'medium';
    case 'l':
    case 'large':
      return 'large';
    case 'xs':
      return 'xs';
    default:
      throw new Error(`Invalid size "${input}". Use xs, s/small, m/medium, or l/large.`);
  }
}

export function iconFetchCommand(app: WGData): Command {
  return new Command('fetch')
    .description('Download vehicle icons into .data/icons/{size}/')
    .argument('[query]', 'tank_id (number), tag, or short_name — omit to fetch all')
    .option('--size <size>', 'icon size: s/small, m/medium (default), l/large', 'medium')
    .option('--all', 'fetch icons for all vehicles')
    .option('--force', 're-download icons that already exist locally')
    .option('--concurrency <n>', 'parallel downloads', '10')
    .action(async (query: string | undefined, options) => {
      if (!query && !options.all) {
        console.error('Provide a query to fetch a single vehicle, or pass --all to fetch every vehicle.');
        process.exit(1);
      }

      try {
        await app.fetchIcons({
          query,
          size: parseSize(options.size),
          force: options.force,
          concurrency: Math.max(1, parseInt(options.concurrency, 10) || 10),
        });
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
