import { createRequire } from 'node:module';
import { config } from 'dotenv';
import { resolve } from 'node:path';

declare const __PKG_VERSION__: string;

// DEV_ONLY is a labeled block dropped by esbuild at build time (see tsup.config.ts → esbuildOptions.dropLabels).
// In dev (tsx), it runs and reads the version from package.json via createRequire.
// In the built binary, the block is stripped and __PKG_VERSION__ — inlined as a string literal
// via tsup 'define' — is used instead. The || short-circuit prevents __PKG_VERSION__ from being
// evaluated in tsx mode where it is not defined.
let _version = '';
DEV_ONLY: {
  _version = (createRequire(import.meta.url)('../package.json') as { version: string }).version;
}

const version = _version || __PKG_VERSION__;

config({ path: resolve(process.env.PIE_WOT_CWD ?? process.cwd(), '.env') });
import { Command } from 'commander';
import { WGData } from '~/lib/WGData.js';
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
import { bakeCommand } from '~/commands/bake/run.js';
import { extractIconAssetsCommand } from '~/commands/game/extract-icon-assets.js';

const wgData = new WGData();
const atlasManager = new AtlasManager();
const tomatoApi = new TomatoApi();
const program = new Command();

program
  .name('pie-wot')
  .description('CLI utilities for World of Tanks data and assets')
  .version(version)
  .enablePositionalOptions();

const vehicle = new Command('vehicle').description('WoT vehicle data');
vehicle.addCommand(listVehiclesCommand(wgData));
vehicle.addCommand(exportCommand(wgData));
vehicle.addCommand(vehicleStatsCommand(wgData));
vehicle.addCommand(bestConfigCommand(wgData));
vehicle.addCommand(charsCommand(wgData));
vehicle.addCommand(longAliasesCommand(wgData));

const atlas = new Command('atlas').description('Texture atlas tools');
atlas.addCommand(inspectAtlasCommand(atlasManager));
atlas.addCommand(pickCommand(atlasManager));
atlas.addCommand(extractAtlasCommand(atlasManager));
atlas.addCommand(packAtlasCommand(atlasManager));

const font = new Command('font').description('Pixel font tools');
font.addCommand(renderCommand());

const cache = new Command('cache').description('API response cache');
cache.addCommand(cachePurgeCommand(wgData));

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
icon.addCommand(iconRenderCommand(wgData));
icon.addCommand(iconFetchCommand(wgData));
icon.addCommand(iconShrinkCommand(wgData));
program.addCommand(icon);

const tomato = new Command('tomato').description('Tomato.gg data fetcher');
tomato.addCommand(tomatoFetchCommand(wgData, tomatoApi));
program.addCommand(tomato);

program.addCommand(bakeCommand(wgData, atlasManager));

const game = new Command('game').description('WoT game installation tools');
game.addCommand(extractIconAssetsCommand());
program.addCommand(game);

await program.parseAsync();
