import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { WGData } from '~/WGData.js';

export function iconShrinkCommand(app: WGData): Command {
  return new Command('shrink')
    .description('Fetch medium icons, trim transparent borders, save as xs in .data/icons/xs/')
    .argument('[query]', 'tank_id (number), tag, or short_name — omit to process all')
    .option('--all', 'process icons for all vehicles')
    .option('--force', 're-process icons that are already cached')
    .option('--concurrency <n>', 'parallel downloads', '10')
    .action(async (query: string | undefined, options) => {
      if (!query && !options.all) {
        console.error('Provide a query to shrink a single vehicle icon, or pass --all to process every vehicle.');
        process.exit(1);
      }

      try {
        await app.fetchIcons({
          query,
          size: 'xs',
          force: options.force ?? false,
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
