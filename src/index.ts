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
import { renderCommand } from './commands/render.js';
import { pickCommand } from './commands/pick.js';
import { inspectAtlasCommand } from './commands/inspect-atlas.js';
import { extractAtlasCommand } from './commands/extract-atlas.js';

const app = new App();
const program = new Command();

program.name('pie-wot').description('CLI utilities for World of Tanks data and assets').version('0.1.0');

const vehicle = new Command('vehicle').description('WoT vehicle data');
vehicle.addCommand(listVehiclesCommand(app));
vehicle.addCommand(exportCommand(app));
vehicle.addCommand(fetchIconsCommand(app));
vehicle.addCommand(vehicleStatsCommand(app));
vehicle.addCommand(bestConfigCommand(app));
vehicle.addCommand(charsCommand(app));

const atlas = new Command('atlas').description('Texture atlas tools');
atlas.addCommand(inspectAtlasCommand());
atlas.addCommand(pickCommand());
atlas.addCommand(extractAtlasCommand());

const font = new Command('font').description('Pixel font tools');
font.addCommand(renderCommand());

const cache = new Command('cache').description('API response cache');
cache.addCommand(cachePurgeCommand(app));

program.addCommand(vehicle);
program.addCommand(atlas);
program.addCommand(font);
program.addCommand(cache);

await program.parseAsync();
