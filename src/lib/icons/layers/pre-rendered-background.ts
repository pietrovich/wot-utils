import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { LayerFactory, LayerRenderResult } from '~/lib/icons/layer-factory.js';
import { resolveAsset } from '~/lib/pkg-root.js';
import type { VehicleType } from '~/types.js';

type Flavor = '' | 'clear';

const TYPE_MAP: Record<VehicleType, string> = {
  lightTank: 'lt',
  mediumTank: 'mt',
  heavyTank: 'ht',
  'AT-SPG': 'td',
  SPG: 'at',
};

const selfUrl = new URL(import.meta.url);

export function preRenderedBackground(version: number, flavor: Flavor = ''): LayerFactory {
  const cache = new Map<string, LayerRenderResult>();
  const dir = resolveAsset(selfUrl, `pogs-fixed/pre-rendered/combined-v${version}`);

  return async (box, _prev, vehicle) => {
    if (version === 1) {
      flavor = ''
    }

    const isPrem = vehicle.is_premium || vehicle.is_premium_igr || vehicle.is_gift;
    const mappedType = TYPE_MAP[vehicle.type];
    const flavorSuffix = flavor ? `.${flavor}` : '';
    const premSuffix = isPrem ? '.prem' : '';
    const filename = `${mappedType}${flavorSuffix}${premSuffix}.png`;

    let overlay = cache.get(filename);
    if (overlay === undefined) {
      const filePath = resolve(dir, filename);
      const fileBuffer = await readFile(filePath);
      const { data } = await sharp(fileBuffer)
        .ensureAlpha()
        .extract({ left: 0, top: 0, width: box.width, height: box.height })
        .raw()
        .toBuffer({ resolveWithObject: true });

      overlay = { input: data, raw: { width: box.width, height: box.height, channels: 4 }, left: 0, top: 0, meta: { width: box.width, height: box.height, left: 0, top: 0 } };
      cache.set(filename, overlay);
    }

    return overlay;
  };
}
