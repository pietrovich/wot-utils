import type { WGData } from '~/lib/WGData.js';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { Aligner, createAligner } from '~/lib/box-utils/index.js';
import { renderWithShadow } from '~/lib/render-text.js';
import { PogsConstants } from "~/lib/icons/pogs/pogs-constants.js";
import { Colors } from "~/lib/colors.js";


import type { VehicleProfile } from '~/lib/icons/layers/vehicle-profile.js';

const defaultAligner = createAligner(PogsConstants, 'br', ['r', 'b - 8']);

export function textTurretArmor(app: WGData, aligner: Aligner = defaultAligner): LayerFactory {
  return async (_box, prev, vehicle) => {
    const profiles = await app.getStatsForBestConfig(vehicle) as Record<string, VehicleProfile>;
    const turret = profiles[vehicle.tank_id]?.armor?.turret;
    if (turret === undefined) {
      return null;
    }

    const text = `${turret.front}*`

    const { data, width, height } = await renderWithShadow('pogs4px', text, Colors.white);

    const offsetX = -1 * prev!.meta!.width + width;
    const shifted = aligner.shift(offsetX, 0)
    const { left, top } = shifted.align({ width, height });

    return {
      input: data,
      raw: { width, height, channels: 4 },
      left,
      top,
      meta: { width, height, left, top, text },
    };
  };
}
