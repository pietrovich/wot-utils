import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { Vehicle } from '~/types.js';
import type { WGData } from '~/lib/WGData.js';
import { ImageBaker } from '~/lib/icons/ImageBaker.js';
import { PogsConstants } from '~/lib/icons/pogs/pogs-constants.js';
import { gradientBackground } from '~/lib/icons/layers/gradient-background.js';
import { preRenderedBackground } from '~/lib/icons/layers/pre-rendered-background.js';
import { barAndShield } from '~/lib/icons/layers/bar-and-shield.js';
import { vehicleIcon } from '~/lib/icons/layers/vehicle-icon.js';
import { tierText } from '~/lib/icons/layers/tier-text.js';
import { nameText } from '~/lib/icons/layers/name-text.js';
import { createAligner } from "~/lib/box-utils/index.js";

type Options = { color?: boolean; to?: string; create?: boolean; all?: boolean; bg?: string; preRenderedBg?: string };

const CONCURRENCY = 5;

async function renderOne(vehicle: Vehicle, baker: ImageBaker, outDir: string, color: boolean): Promise<void> {
  const outPath = join(outDir, `${vehicle.tag}.png`);
  const rendered = await baker.bake(vehicle);
  const pipeline = color ? rendered.removeAlpha() : rendered;
  const info = await pipeline.png().toFile(outPath);
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
        let layers;

        const box = PogsConstants;
        const tierTextAligner = createAligner(box, 't', [10, 5]);

        if (bgVersion !== undefined) {
          const version = parseInt(bgVersion.replace(/\D+/g, ''), 10);
          const flavor = options.color ? '' : 'clear';


          layers = [
            preRenderedBackground(version, flavor),
            vehicleIcon(app),
            tierText(tierTextAligner),
            nameText()
          ];
        } else {
          layers = options.color
            ? [gradientBackground(), barAndShield(), vehicleIcon(app), tierText(tierTextAligner), nameText()]
            : [barAndShield(), vehicleIcon(app), tierText(tierTextAligner), nameText()];
        }

        const vehicles: Vehicle[] = options.all
          ? await app.getVehicles()
          : [await app.findVehicle(query!)];

        const bakers = Array.from({ length: CONCURRENCY }, () => new ImageBaker(PogsConstants.width, PogsConstants.height, layers));
        const color = options.color ?? false;
        let idx = 0;

        await Promise.all(
          bakers.map(async (baker) => {
            while (idx < vehicles.length) {
              const vehicle = vehicles[idx++];
              await renderOne(vehicle, baker, outDir, color);
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
