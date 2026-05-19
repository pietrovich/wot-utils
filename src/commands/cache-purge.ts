import { Command } from 'commander';
import type { App } from '../app.js';

export function cachePurgeCommand(app: App): Command {
  return new Command('purge').description('Delete all cached API responses').action(async () => {
    await app.purgeCache();
    console.error('Cache purged.');
  });
}
