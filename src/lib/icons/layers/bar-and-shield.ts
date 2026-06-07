import sharp from 'sharp';
import { resolveAsset } from '~/lib/pkg-root.js';
import type { LayerFactory, LayerRenderResult } from '~/lib/icons/layer-factory.js';

const SHIELD_PATH = resolveAsset(new URL(import.meta.url), 'pogs/sheild.png');
const STRIPE_PATH = resolveAsset(new URL(import.meta.url), 'pogs/stripe.png');

export function barAndShield(): LayerFactory {
  const cache = new Map<string, LayerRenderResult>();

  return async (box, _prev, _vehicle) => {
    const key = `${box.width}x${box.height}`;
    let overlay = cache.get(key);
    if (overlay === undefined) {
      const blank = Buffer.alloc(box.width * box.height * 4, 0);
      const { data } = await sharp(blank, { raw: { width: box.width, height: box.height, channels: 4 } })
        .composite([
          { input: STRIPE_PATH, top: 0, left: 0 },
          { input: SHIELD_PATH, top: 2, left: 1 },
        ])
        .raw()
        .toBuffer({ resolveWithObject: true });
      overlay = { input: data, raw: { width: box.width, height: box.height, channels: 4 }, left: 0, top: 0, meta: { width: box.width, height: box.height, left: 0, top: 0 } };
      cache.set(key, overlay);
    }

    return overlay;
  };
}
