import type { WGData } from '~/lib/WGData.js';
import { ImageBaker } from '~/lib/icons/ImageBaker.js';
import { PogsConstants } from '~/lib/icons/pogs/pogs-constants.js';
import { preRenderedBackground } from '~/lib/icons/layers/pre-rendered-background.js';
import { vehicleIcon } from '~/lib/icons/layers/vehicle-icon.js';
import { tierText } from '~/lib/icons/layers/tier-text.js';
import { nameText } from '~/lib/icons/layers/name-text.js';
import { createAligner } from '~/lib/box-utils/index.js';
import type { IconBuilder } from '~/lib/icons/pogs/icon-builder.js';

const tierTextAligner = createAligner(PogsConstants, 'tm.+', [10, 5]);

export class PogsColorV1 implements IconBuilder {
  protected readonly version: number = 1;

  createBaker(data: WGData): ImageBaker {
    return new ImageBaker(
      PogsConstants,
      [
        preRenderedBackground(this.version, ''),
        vehicleIcon(data),
        tierText(tierTextAligner),
        nameText()
      ],
      (s) => s.removeAlpha(),
    );
  }
}
