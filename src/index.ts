#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { listVehiclesCommand } from './commands/list-vehicles.js';
import { exportCommand } from './commands/export.js';
import { purgeCache } from './lib/cache.js';

const program = new Command();

program.name('wg-fetcher').description('Fetch World of Tanks data from the Wargaming API').version('0.1.0');

program.addCommand(listVehiclesCommand());
program.addCommand(exportCommand());

program
  .command('cache-purge')
  .description('Delete all cached API responses')
  .action(async () => {
    await purgeCache();
    console.error('Cache purged.');
  });

await program.parseAsync();
