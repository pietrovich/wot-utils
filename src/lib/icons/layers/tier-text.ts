import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import type { Aligner } from '~/lib/box-utils/index.js';
import { renderWithShadow } from '~/lib/render-text.js';

export function tierText(aligner: Aligner): LayerFactory {
  const cache = new Map<number, { data: Buffer; width: number; height: number }>();

  return async (_box, _prev, vehicle) => {
    let rendered = cache.get(vehicle.tier);

    if (rendered === undefined) {
      const fontName = vehicle.tier > 10
        ? 'pogsNumbersBold'
        : 'pogsNumbers';
      const { data, width, height } = await renderWithShadow(fontName, vehicle.tier);
      rendered = { data, width, height };
      cache.set(vehicle.tier, rendered);
    }

    const { left, top } = aligner.align(rendered);

    return { input: rendered.data, raw: { width: rendered.width, height: rendered.height, channels: 4 }, left, top, meta: { width: rendered.width, height: rendered.height, left, top, text: vehicle.tier } };
  };
}
