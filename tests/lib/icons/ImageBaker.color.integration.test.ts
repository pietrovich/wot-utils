import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { saveDebug } from '@tests/helpers/debug.js';
import { WGData } from '~/lib/WGData.js';
import { ImageBaker } from '~/lib/icons/ImageBaker.js';
import { PogsConstants } from '~/lib/icons/pogs/pogs-constants.js';
import { gradientBackground } from '~/lib/icons/layers/gradient-background.js';
import { barAndShield } from '~/lib/icons/layers/bar-and-shield.js';
import { vehicleIcon } from '~/lib/icons/layers/vehicle-icon.js';
import { tierText } from '~/lib/icons/layers/tier-text.js';
import { nameText } from '~/lib/icons/layers/name-text.js';
import { requireDataCache } from '@tests/helpers/require-cache.js';
import { createAligner } from "~/lib/box-utils/index.js";

const FIXTURE = fileURLToPath(new URL('../../fixtures/icons/pogs/color/R04_T-34.png', import.meta.url));

describe('ImageBaker color preset integration', () => {
  beforeAll(() => {
    requireDataCache();
    process.env.WG_APP_ID ??= 'test';
  });

  it('renders vehicle id=1 (T-34) matching expected fixture byte-for-byte', async () => {
    const app = new WGData();
    const vehicle = await app.findVehicle(1);

    const baker = new ImageBaker(PogsConstants.width, PogsConstants.height, [
      gradientBackground(),
      barAndShield(),
      vehicleIcon(app),
      tierText(createAligner(PogsConstants, 't', [10, 5])),
      nameText(),
    ]);
    const result = await (await baker.bake(vehicle)).removeAlpha().png().toBuffer();
    saveDebug('ImageBaker.color.png', result);
    const expected = readFileSync(FIXTURE);
    expect(result.equals(expected)).toBe(true);
  });
});
