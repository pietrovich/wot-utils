import sharp from 'sharp';
import type { WGData } from '~/WGData.js';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { darkenIcon } from '~/lib/utils.js';

const MAX_ICON_W = 62;
const MAX_ICON_H = 15;
const ICON_X = 18;

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

export function vehicleIcon(app: WGData): LayerFactory {
  return async (_w, h, vehicle) => {
    const iconResult = await app.getDefaultVehicleIcon(vehicle, 'medium');
    if (!iconResult) {
      return null;
    }

    const { data: iconData, info: iconInfo } = iconResult;
    const { width: iconW, height: iconH } = fitToBox(iconInfo.width, iconInfo.height);
    const { data: scaledData, info: scaledInfo } = await sharp(darkenIcon(iconData, 0.4), {
      raw: { width: iconInfo.width, height: iconInfo.height, channels: iconInfo.channels as 1 | 2 | 3 | 4 },
    })
      .resize(iconW, iconH)
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      input: scaledData,
      raw: { width: scaledInfo.width, height: scaledInfo.height, channels: scaledInfo.channels as 1 | 2 | 3 | 4 },
      left: ICON_X,
      top: h - (iconH + 1),
    };
  };
}
