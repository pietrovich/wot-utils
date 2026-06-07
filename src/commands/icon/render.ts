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

type Options = { color?: boolean; clear?: boolean; to?: string; create?: boolean; all?: boolean; bg?: string; preRenderedBg?: string };

const CONCURRENCY = 5;

async function renderOneToFile(vehicle: Vehicle, baker: ImageBaker, outDir: string): Promise<void> {
  const outPath = join(outDir, `${vehicle.nation}-${vehicle.tag}.png`);
  const info = await (await baker.bake(vehicle)).png().toFile(outPath);
  console.log(`${outPath} — ${info.width}×${info.height}px`);
}

export function iconRenderCommand(app: WGData): Command {
  return new Command('render')
    .description('Render a vehicle icon with its short name label composited over a type background')
    .argument('[query]', 'tank_id (number), tag, or short_name')
    .option('--all', 'render all vehicles')
    .option('--color', 'use color variant (default)')
    .option('--clear', 'use clear variant (no color background)')
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

        const bgVersion = options.bg ?? options.preRenderedBg ?? (options.clear ? 'v2' : undefined);
        let builder: IconBuilder;

        const useColor = !options.clear;

        if (bgVersion !== undefined) {
          const version = parseInt(bgVersion.replace(/\D+/g, ''), 10);
          if (version === 1) {
            builder = useColor ? new PogsColorV1() : new PogsClearV1();
          } else {
            builder = useColor ? new PogsColorV2() : new PogsClearV2();
          }
        } else {
          builder = useColor ? new PogsColor() : new PogsClear();
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
              await renderOneToFile(vehicle, baker, outDir);
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
