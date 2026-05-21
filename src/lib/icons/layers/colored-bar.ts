import type { LayerFactory } from '~/lib/icons/layer-factory.js';

const BAR_H = 2;

export function coloredBar(color: [number, number, number]): LayerFactory {
  const [r, g, b] = color;

  return async (w) => {
    const pixels = Buffer.alloc(w * BAR_H * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }

    return { input: pixels, raw: { width: w, height: BAR_H, channels: 4 }, left: 0, top: 0 };
  };
}
