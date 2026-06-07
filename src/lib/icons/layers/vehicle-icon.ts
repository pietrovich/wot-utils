import sharp from 'sharp';
import type { WGData } from '~/lib/WGData.js';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { darkenIcon } from '~/lib/utils.js';
import { Aligner, createAligner } from "~/lib/box-utils/index.js";
import { PogsConstants } from "~/lib/icons/pogs/pogs-constants.js";

const MAX_ICON_W = 62;
const MAX_ICON_H = 15;

const defaultAligner = createAligner(PogsConstants, 'bm.+', [40, 'bh']);

function fitToBox(srcW: number, srcH: number): { width: number; height: number } {
  const aspect = srcW / srcH;
  let w = srcW;
  let h = srcH;

  if (w > MAX_ICON_W) {
    w = MAX_ICON_W;
    h = Math.trunc(w / aspect);
  }

  if (h > MAX_ICON_H) {
    h = MAX_ICON_H;
    w = Math.trunc(h * aspect);
  }

  return { width: w, height: h };
}

export function vehicleIcon(data: WGData, aligner: Aligner = defaultAligner): LayerFactory {
  return async (box, _prev, vehicle) => {
    const iconResult = await data.getDefaultVehicleIcon(vehicle, 'medium');
    if (!iconResult) {
      return null;
    }

    const { data: iconData, info: iconInfo } = iconResult;
    const { width: iconW, height: iconH } = fitToBox(iconInfo.width, iconInfo.height);
    const { data: scaledData, info: scaledInfo } = await sharp(darkenIcon(iconData, 0.5), {
      raw: { width: iconInfo.width, height: iconInfo.height, channels: iconInfo.channels as 1 | 2 | 3 | 4 },
    })
      .resize(iconW, iconH)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: trimmedData, info: trimmedInfo } = await sharp(scaledData, {
      raw: { width: scaledInfo.width, height: scaledInfo.height, channels: scaledInfo.channels as 1 | 2 | 3 | 4 },
    })
      .trim({ threshold: 13 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = trimmedInfo;

    const { left, top } = aligner.align({ width: trimmedInfo.width, height: trimmedInfo.height });

    return {
      input: trimmedData,
      raw: { width, height, channels: trimmedInfo.channels as 1 | 2 | 3 | 4 },
      left,
      top,
      meta: { width, height, left, top },
    };
  };
}
