import type sharp from 'sharp';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';

export function solidBackground(color: [number, number, number, number] = [0, 0, 0, 255]): LayerFactory {
  const cache = new Map<string, sharp.OverlayOptions>();
  const [r, g, b, a] = color;
  const key = `${r},${g},${b},${a}`;

  return async (w, h) => {
    let overlay = cache.get(key);

    if (overlay === undefined) {
      const pixels = Buffer.alloc(w * h * 4);
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = a;
      }

      overlay = { input: pixels, raw: { width: w, height: h, channels: 4 }, left: 0, top: 0 };
      cache.set(key, overlay);
    }

    return overlay;
  };
}
