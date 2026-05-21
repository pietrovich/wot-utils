import type sharp from 'sharp';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { renderWithShadow } from '~/lib/render-text.js';

export function tierText(): LayerFactory {
  const cache = new Map<number, sharp.OverlayOptions>();

  return async (_w, h, vehicle) => {
    let overlay = cache.get(vehicle.tier);

    if (overlay === undefined) {
      const fontName = vehicle.tier > 10
        ? 'pogsNumbersBold'
        : 'pogsNumbers';
      const { data, width, height } = await renderWithShadow(fontName, vehicle.tier);
      // const left = width > 6
      //   ? 10 - Math.ceil(width / 2)
      //   : 6;

      const left = 10 - Math.ceil(width / 2);

      overlay = { input: data, raw: { width, height, channels: 4 }, left, top: 5 };

      cache.set(vehicle.tier, overlay);
    }

    return overlay;
  };
}
