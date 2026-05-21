import sharp from 'sharp';
import type { Vehicle } from '~/types.js';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';

export class ImageBaker {
  readonly #w: number;
  readonly #h: number;
  readonly #layers: LayerFactory[];

  constructor(w: number, h: number, layers: LayerFactory[]) {
    this.#w = w;
    this.#h = h;
    this.#layers = layers;
  }

  async bake(vehicle: Vehicle): Promise<sharp.Sharp> {
    const blank = Buffer.alloc(this.#w * this.#h * 4, 0);
    const results = await Promise.all(this.#layers.map((fn) => fn(this.#w, this.#h, vehicle)));
    const overlays = results.filter((o): o is sharp.OverlayOptions => o !== null);

    return sharp(blank, { raw: { width: this.#w, height: this.#h, channels: 4 } }).composite(overlays);
  }
}
