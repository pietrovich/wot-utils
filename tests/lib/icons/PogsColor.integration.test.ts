import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { saveDebug } from '@tests/helpers/debug.js';
import { WGData } from '~/lib/WGData.js';
import { requireDataCache } from '@tests/helpers/require-cache.js';
import { PogsColorV1 } from "~/lib/icons/pogs/PogsColorV1.js";

const FIXTURE = fileURLToPath(new URL('../../fixtures/icons/pogs/color/R04_T-34.png', import.meta.url));

describe('PogsColor integration', () => {
  beforeAll(() => {
    requireDataCache();
  });

  it('renders vehicle id=1 (T-34) matching expected fixture byte-for-byte', async () => {
    const app = new WGData();
    const vehicle = await app.findVehicle(1);
    const baker = new PogsColorV1().createBaker(app);
    const result = await (await baker.bake(vehicle)).png().toBuffer();
    saveDebug('ImageBaker.color.png', result);
    const expected = readFileSync(FIXTURE);
    expect(result.equals(expected)).toBe(true);
  });
});
