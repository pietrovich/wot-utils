import type sharp from 'sharp';
import { bgColors } from '~/lib/icons/pogs/background-colors.js';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import type { VehicleType } from '~/types.js';

type BgColors = typeof bgColors;

const TYPE_TO_KEY: Record<VehicleType, keyof BgColors> = {
  lightTank: 'Light',
  mediumTank: 'Medium',
  heavyTank: 'Heavy',
  'AT-SPG': 'TankDestroyer',
  SPG: 'Spg',
};

export function gradientBackground(colors: BgColors = bgColors): LayerFactory {
  const cache = new Map<string, sharp.OverlayOptions>();

  return async (w, _h, vehicle) => {
    const key = TYPE_TO_KEY[vehicle.type];
    const rows = colors[key];
    if (!rows) {
      throw new Error(`No gradient colors for vehicle type: ${vehicle.type}`);
    }

    let overlay = cache.get(key);
    if (overlay === undefined) {
      const height = rows.length;
      const pixels = Buffer.alloc(w * height * 4);
      for (let y = 0; y < height; y++) {
        const [r, g, b] = rows[y];
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          pixels[i] = r;
          pixels[i + 1] = g;
          pixels[i + 2] = b;
          pixels[i + 3] = 255;
        }
      }

      overlay = { input: pixels, raw: { width: w, height, channels: 4 }, left: 0, top: 0 };
      cache.set(key, overlay);
    }

    return overlay;
  };
}
