import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { Aligner, createAligner } from '~/lib/box-utils/index.js';
import { renderWithShadow } from '~/lib/render-text.js';
import { PogsConstants } from "~/lib/icons/pogs/pogs-constants.js";

const defaultAligner = createAligner(PogsConstants, 'tm.+', [10, 5]);

export function tierText(aligner: Aligner = defaultAligner): LayerFactory {
  const cache = new Map<number, { data: Buffer; width: number; height: number }>();

  return async (_box, _prev, vehicle) => {
    let rendered = cache.get(vehicle.tier);

    if (rendered === undefined) {
      const fontName = vehicle.tier > 12 ? 'pogsNumbersBold' : 'pogsNumbers';
      rendered = await renderWithShadow(fontName, String(vehicle.tier));
      cache.set(vehicle.tier, rendered);
    }

    const { width, height } = rendered;
    const text = String(vehicle.tier);
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
