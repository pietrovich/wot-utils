import type { WGData } from '~/lib/WGData.js';
import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { Aligner, createAligner } from '~/lib/box-utils/index.js';
import { renderWithShadow } from '~/lib/render-text.js';
import { PogsConstants } from "~/lib/icons/pogs/pogs-constants.js";
import { Colors } from "~/lib/colors.js";


import type { VehicleProfile } from '~/lib/icons/layers/vehicle-profile.js';

const defaultAligner = createAligner(PogsConstants, 'rt', ['r', 9]);

export function textDamage(app: WGData, aligner: Aligner = defaultAligner): LayerFactory {
  return async (_box, _prev, vehicle) => {
    const profiles = await app.getStatsForBestConfig(vehicle) as Record<string, VehicleProfile>;
    const text = profiles[vehicle.tank_id]?.ammo?.[0].damage?.[1];
    if (text === undefined) {
      return null;
    }

    const { data, width, height } = await renderWithShadow('pogs4px', text, Colors.beige);
    const { left, top } = aligner.align({ width, height });

    return {
      input: data,
      raw: { width, height, channels: 4 },
      left,
      top,
      meta: { width, height, left, top, text: text },
    };
  };
}
