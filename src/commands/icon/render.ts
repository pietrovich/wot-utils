import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { Vehicle } from '~/types.js';
import type { WGData } from '~/lib/WGData.js';
import type { ImageBaker } from '~/lib/icons/ImageBaker.js';
import type { IconBuilder } from '~/lib/icons/pogs/icon-builder.js';
import { PogsClear } from '~/lib/icons/pogs/PogsClear.js';
import { PogsColor } from '~/lib/icons/pogs/PogsColor.js';
import { PogsClearV1 } from '~/lib/icons/pogs/PogsClearV1.js';
import { PogsClearV2 } from '~/lib/icons/pogs/PogsClearV2.js';
import { PogsColorV1 } from '~/lib/icons/pogs/PogsColorV1.js';
import { PogsColorV2 } from '~/lib/icons/pogs/PogsColorV2.js';

type Options = { color?: boolean; to?: string; create?: boolean; all?: boolean; bg?: string; preRenderedBg?: string };

const CONCURRENCY = 5;

async function renderOne(vehicle: Vehicle, baker: ImageBaker, outDir: string): Promise<void> {
  const outPath = join(outDir, `${vehicle.tag}.png`);
  const info = await (await baker.bake(vehicle)).png().toFile(outPath);
  console.log(`${outPath} — ${info.width}×${info.height}px`);
}

export function iconRenderCommand(app: WGData): Command {
  return new Command('render')
    .description('Render a vehicle icon with its short name label composited over a type background')
    .argument('[query]', 'tank_id (number), tag, or short_name')
    .option('--all', 'render all vehicles')
    .option('--color', 'use color variant (gradient background)')
    .option('--bg <version>', 'use pre-rendered background at given version')
    .option('--pre-rendered-bg <version>', 'alias for --bg')
    .option('--to <dir>', 'output directory (default: current working directory)')
    .option('--create', 'create output directory if it does not exist')
    .action(async (query: string | undefined, options: Options) => {
      try {
        if (!query && !options.all) {
          console.error('Provide a query argument or use --all to render all vehicles.');
          process.exit(1);
        }

        const outDir = options.to ?? process.cwd();

        if (options.to && !existsSync(outDir)) {
          if (!options.create) {
            console.error(`Directory does not exist: ${outDir}\nProvide an existing path or add --create to create it.`);
            process.exit(1);
          }

          mkdirSync(outDir, { recursive: true });
        }

        const bgVersion = options.bg ?? options.preRenderedBg;
        let builder: IconBuilder;

        if (bgVersion !== undefined) {
          const version = parseInt(bgVersion.replace(/\D+/g, ''), 10);
          if (version === 1) {
            builder = options.color ? new PogsColorV1() : new PogsClearV1();
          } else {
            builder = options.color ? new PogsColorV2() : new PogsClearV2();
          }
        } else {
          builder = options.color ? new PogsColor() : new PogsClear();
        }

        const vehicles: Vehicle[] = options.all
          ? await app.getVehicles()
          : [await app.findVehicle(query!)];

        const bakers = Array.from({ length: CONCURRENCY }, () => builder.createBaker(app));
        let idx = 0;

        await Promise.all(
          bakers.map(async (baker) => {
            while (idx < vehicles.length) {
              const vehicle = vehicles[idx++];
              await renderOne(vehicle, baker, outDir);
            }
          }),
        );
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
