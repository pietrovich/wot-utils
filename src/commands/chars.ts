import { Command } from 'commander';
import { WGApiError } from '../lib/api.js';
import type { App } from '../app.js';

export function charsCommand(app: App): Command {
  return new Command('chars')
    .description('List unique characters found in vehicle short names')
    .action(async () => {
      try {
        console.log(await app.getCharacters());
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
