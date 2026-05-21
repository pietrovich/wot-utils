import { Command } from 'commander';
import type { WGData } from '~/WGData.js';

export function cachePurgeCommand(app: WGData): Command {
  return new Command('purge').description('Delete all cached API responses').action(async () => {
    await app.purgeCache();
    console.error('Cache purged.');
  });
}
