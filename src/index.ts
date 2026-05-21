import { resolve } from 'node:path';
import { config } from 'dotenv';
import { findPkgRoot } from '~/lib/pkg-root.js';
config({ path: resolve(findPkgRoot(new URL(import.meta.url)), '.env') });
import { Command } from 'commander';
import { WGData } from '~/WGData.js';
import { listVehiclesCommand } from '~/commands/vehicle/list.js';
import { exportCommand } from '~/commands/vehicle/export.js';
import { cachePurgeCommand } from '~/commands/cache/purge.js';
import { bestConfigCommand } from '~/commands/vehicle/best-config.js';
import { vehicleStatsCommand } from '~/commands/vehicle/stats.js';
import { charsCommand } from '~/commands/vehicle/chars.js';
import { longAliasesCommand } from '~/commands/vehicle/long-aliases.js';
import { renderCommand } from '~/commands/font/render.js';
import { pickCommand } from '~/commands/atlas/pick.js';
import { inspectAtlasCommand } from '~/commands/atlas/inspect.js';
import { extractAtlasCommand } from '~/commands/atlas/extract.js';
import { packAtlasCommand } from '~/commands/atlas/pack.js';
import { AtlasManager } from '~/lib/AtlasManager.js';
import { ddsDecodeCommand } from '~/commands/dds/decode.js';
import { ddsEncodeCommand } from '~/commands/dds/encode.js';
import { dumpBackgroundCommand } from '~/commands/icon/dump-background.js';
import { iconRenderCommand } from '~/commands/icon/render.js';
import { iconFetchCommand } from '~/commands/icon/fetch.js';
import { iconShrinkCommand } from '~/commands/icon/shrink.js';
import { TomatoApi } from '~/lib/tomato-api.js';
import { tomatoFetchCommand } from '~/commands/tomato/fetch.js';

const app = new WGData();
const atlasManager = new AtlasManager();
const tomatoApi = new TomatoApi();
const program = new Command();

program.name('pie-wot').description('CLI utilities for World of Tanks data and assets').version('0.1.0');

const vehicle = new Command('vehicle').description('WoT vehicle data');
vehicle.addCommand(listVehiclesCommand(app));
vehicle.addCommand(exportCommand(app));
vehicle.addCommand(vehicleStatsCommand(app));
vehicle.addCommand(bestConfigCommand(app));
vehicle.addCommand(charsCommand(app));
vehicle.addCommand(longAliasesCommand(app));

const atlas = new Command('atlas').description('Texture atlas tools');
atlas.addCommand(inspectAtlasCommand(atlasManager));
atlas.addCommand(pickCommand(atlasManager));
atlas.addCommand(extractAtlasCommand(atlasManager));
atlas.addCommand(packAtlasCommand(atlasManager));

const font = new Command('font').description('Pixel font tools');
font.addCommand(renderCommand());

const cache = new Command('cache').description('API response cache');
cache.addCommand(cachePurgeCommand(app));

const dds = new Command('dds').description('DDS texture tools');
dds.addCommand(ddsDecodeCommand());
dds.addCommand(ddsEncodeCommand());

program.addCommand(vehicle);
program.addCommand(atlas);
program.addCommand(font);
program.addCommand(cache);
program.addCommand(dds);

const icon = new Command('icon').description('Vehicle icon generation tools');
icon.addCommand(dumpBackgroundCommand());
icon.addCommand(iconRenderCommand(app));
icon.addCommand(iconFetchCommand(app));
icon.addCommand(iconShrinkCommand(app));
program.addCommand(icon);

const tomato = new Command('tomato').description('Tomato.gg data fetcher');
tomato.addCommand(tomatoFetchCommand(app, tomatoApi));
program.addCommand(tomato);

await program.parseAsync();
