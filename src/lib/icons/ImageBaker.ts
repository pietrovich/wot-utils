import sharp from 'sharp';
import type { Vehicle } from '~/types.js';
import type { LayerFactory, LayerRenderResult } from '~/lib/icons/layer-factory.js';
import { logger } from "~/lib/logger.js";

let counter = 0;

export class ImageBaker {
  readonly #box: { width: number; height: number };
  readonly #layers: LayerFactory[];
  readonly #finalizer: ((s: sharp.Sharp) => sharp.Sharp) | undefined;

  constructor(
    box: { width: number; height: number },
    layers: LayerFactory[],
    finalizer?: (s: sharp.Sharp) => sharp.Sharp,
  ) {
    this.#box = box;
    this.#layers = layers;
    this.#finalizer = finalizer;
  }

  async bake(vehicle: Vehicle): Promise<sharp.Sharp> {
    counter++;
    logger.debug(`baking ${vehicle.short_name} (id:${vehicle.tank_id}) icon (job:${counter})...`);

    const blank = Buffer.alloc(this.#box.width * this.#box.height * 4, 0);
    const overlays: LayerRenderResult[] = [];
    let prev: LayerRenderResult | null = null;

    for (const fn of this.#layers) {
      let overlay = null;

      try {
        overlay = await fn(this.#box, prev, vehicle);
      } catch (e) {
        logger.error('==============');
        logger.error(`Error processing vehicle ${vehicle.short_name} (${vehicle.tank_id})`);
        logger.error(e);
        logger.error('==============');
        process.exit(1);
      }

      if (overlay) {
        overlays.push(overlay);
      }

      prev = overlay;
    }

    const result = sharp(blank, { raw: { width: this.#box.width, height: this.#box.height, channels: 4 } }).composite(overlays);
    const final = this.#finalizer ? this.#finalizer(result) : result;

    logger.debug(`.  baked ${vehicle.short_name} (${vehicle.tank_id}) icon successfully\n`);

    return final;
  }
}
