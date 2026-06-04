import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import type { Rect, Positioned } from '~/lib/box-utils/index.js';
import { renderWithShadow } from '~/lib/render-text.js';

export function tierText(aligner: (rect: Rect) => Positioned): LayerFactory {
  const cache = new Map<number, { data: Buffer; width: number; height: number }>();

  return async (_w, _h, vehicle) => {
    let rendered = cache.get(vehicle.tier);

    if (rendered === undefined) {
      const fontName = vehicle.tier > 10
        ? 'pogsNumbersBold'
        : 'pogsNumbers';
      const { data, width, height } = await renderWithShadow(fontName, vehicle.tier);
      rendered = { data, width, height };
      cache.set(vehicle.tier, rendered);
    }

    const { left, top } = aligner(rendered);

    return { input: rendered.data, raw: { width: rendered.width, height: rendered.height, channels: 4 }, left, top };
  };
}
