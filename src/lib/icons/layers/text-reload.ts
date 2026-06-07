import type { WGData } from '~/lib/WGData.js';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { Aligner, createAligner } from '~/lib/box-utils/index.js';
import { renderWithShadow } from '~/lib/render-text.js';
import { PogsConstants } from "~/lib/icons/pogs/pogs-constants.js";
import { Colors } from "~/lib/colors.js";


import type { VehicleProfile } from '~/lib/icons/layers/vehicle-profile.js';

const defaultAligner = createAligner(PogsConstants, 'br.+', [37, 'bh - 8']);

export function textReload(app: WGData, aligner: Aligner = defaultAligner): LayerFactory {
  return async (_box, _prev, vehicle) => {
    const profiles = await app.getStatsForBestConfig(vehicle) as Record<string, VehicleProfile>;
    const reloadTime = profiles[vehicle.tank_id]?.gun?.reload_time;
    if (reloadTime === undefined) {
      return null;
    }

    const { data, width, height } = await renderWithShadow('pogs4px', reloadTime, Colors.yellow);
    const { left, top } = aligner.align({ width, height });

    return {
      input: data,
      raw: { width, height, channels: 4 },
      left,
      top,
      meta: { width, height, left, top, text: reloadTime },
    };
  };
}
