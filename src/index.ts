#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { App } from './app.js';
import { listVehiclesCommand } from './commands/list-vehicles.js';
import { exportCommand } from './commands/export.js';
import { fetchIconsCommand } from './commands/fetch-icons.js';
import { cachePurgeCommand } from './commands/cache-purge.js';
import { bestConfigCommand } from './commands/best-config.js';
import { vehicleStatsCommand } from './commands/vehicle-stats.js';
import { charsCommand } from './commands/chars.js';

const app = new App();
const program = new Command();

program.name('wg-fetcher').description('Fetch World of Tanks data from the Wargaming API').version('0.1.0');

program.addCommand(listVehiclesCommand(app));
program.addCommand(exportCommand(app));
program.addCommand(fetchIconsCommand(app));
program.addCommand(cachePurgeCommand(app));
program.addCommand(bestConfigCommand(app));
program.addCommand(vehicleStatsCommand(app));
program.addCommand(charsCommand(app));

await program.parseAsync();
