import sharp from 'sharp';
import type { Vehicle } from '~/types.js';
import type { LayerFactory, LayerRenderResult } from '~/lib/icons/layer-factory.js';

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
    const blank = Buffer.alloc(this.#box.width * this.#box.height * 4, 0);
    const overlays: LayerRenderResult[] = [];
    let prev: LayerRenderResult | null = null;
    for (const fn of this.#layers) {
      const overlay = await fn(this.#box, prev, vehicle);
      if (overlay !== null) {
        overlays.push(overlay);
      }

      prev = overlay;
    }

    const result = sharp(blank, { raw: { width: this.#box.width, height: this.#box.height, channels: 4 } }).composite(overlays);

    return this.#finalizer ? this.#finalizer(result) : result;
  }
}
