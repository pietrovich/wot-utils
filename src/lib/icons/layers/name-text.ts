import type { LayerFactory } from '~/lib/icons/layer-factory.js';
import { renderWithShadow } from '~/lib/render-text.js';
import { lookupShortName } from "~/lib/icons/pogs/short-names.js";

const NAME_X = 18;
const NAME_Y = 2;

export function nameText(): LayerFactory {
  return async (_box, _prev, vehicle) => {
    const alias = lookupShortName(vehicle).toLowerCase();

    const { data, width, height } = await renderWithShadow('pogs4px', alias);

    return { input: data, raw: { width, height, channels: 4 }, left: NAME_X, top: NAME_Y, meta: { width, height, left: NAME_X, top: NAME_Y, text: alias } };
  };
}
