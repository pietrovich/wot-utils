import { Command } from 'commander';
import { WGApiError } from '../lib/api.js';
import type { App } from '../app.js';

export function fetchIconsCommand(app: App): Command {
  return new Command('fetch-icons')
    .description('Download contour icons for all vehicles into .data/contour-icons/')
    .option('--force', 're-download icons that already exist locally')
    .option('--concurrency <n>', 'parallel downloads', '10')
    .action(async (options) => {
      try {
        await app.fetchIcons({ force: options.force, concurrency: Math.max(1, parseInt(options.concurrency, 10) || 10) });
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
