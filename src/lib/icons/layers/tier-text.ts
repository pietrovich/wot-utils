import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { Aligner, createAligner } from '~/lib/box-utils/index.js';
import { renderWithShadow } from '~/lib/render-text.js';
import { PogsConstants } from "~/lib/icons/pogs/pogs-constants.js";

const defaultAligner = createAligner(PogsConstants, 'tm.+', [10, 5]);

export function tierText(aligner: Aligner = defaultAligner): LayerFactory {
  const cache = new Map<number, { data: Buffer; width: number; height: number }>();

  return async (_box, _prev, vehicle) => {
    let rendered = cache.get(vehicle.tier);
    const text = String(vehicle.tier);
    let width = 0;
    let height = 0;

    if (!rendered) {
      const fontName = vehicle.tier > 12
        ? 'pogsNumbersBold'
        : 'pogsNumbers';

      rendered = await renderWithShadow(fontName, text);
      cache.set(vehicle.tier, rendered);
      width = rendered.width;
      height = rendered.height;
    }

    const { left, top } = aligner.align(rendered);

    return {
      input: rendered.data,
      raw: { width, height, channels: 4 },
      left,
      top,
      meta: { width, height, left, top, text }
    };
  };
}
