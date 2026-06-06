import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { saveDebug } from '@tests/helpers/debug.js';
import { WGData } from '~/lib/WGData.js';
import { requireDataCache } from '@tests/helpers/require-cache.js';
import { PogsClearV2 } from "~/lib/icons/pogs/PogsClearV2.js";

const FIXTURE = fileURLToPath(new URL('../../fixtures/icons/pogs/clear/R04_T-34.png', import.meta.url));

describe('PogsClear integration', () => {
  beforeAll(() => {
    requireDataCache();
    process.env.WG_APP_ID ??= 'test';
  });

  it('renders vehicle id=1 (T-34) matching expected fixture byte-for-byte', async () => {
    const app = new WGData();
    const vehicle = await app.findVehicle(1);
    const baker = new PogsClearV2().createBaker(app);
    const result = await (await baker.bake(vehicle)).png().toBuffer();
    saveDebug('ImageBaker.clear.png', result);
    const expected = readFileSync(FIXTURE);
    expect(result.equals(expected)).toBe(true);
  });
});
