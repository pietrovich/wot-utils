import type { WGData } from '~/lib/WGData.js';
import { ImageBaker } from '~/lib/icons/ImageBaker.js';
import { PogsConstants } from '~/lib/icons/pogs/pogs-constants.js';
import { gradientBackground } from '~/lib/icons/layers/gradient-background.js';
import { barAndShield } from '~/lib/icons/layers/bar-and-shield.js';
import { vehicleIcon } from '~/lib/icons/layers/vehicle-icon.js';
import { tierText } from '~/lib/icons/layers/tier-text.js';
import { nameText } from '~/lib/icons/layers/name-text.js';
import { createAligner } from '~/lib/box-utils/index.js';
import type { IconBuilder } from '~/lib/icons/pogs/icon-builder.js';

const iconAligner = createAligner(PogsConstants, 'bl.+', [18, 1]);

export class PogsColor implements IconBuilder {
  createBaker(app: WGData): ImageBaker {
    return new ImageBaker(
      PogsConstants,
      [
        gradientBackground(),
        barAndShield(),
        vehicleIcon(app, iconAligner),
        tierText(),
        nameText(),
      ],
      (s) => s.removeAlpha(),
    );
  }
}
