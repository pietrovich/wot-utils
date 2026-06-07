import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { WGData } from '~/lib/WGData.js';
import { requireDataCache } from '@tests/helpers/require-cache.js';

describe('WGData.inferBestConfig', () => {
  beforeAll(() => {
    requireDataCache();
  });

  it('returns correct best config for vehicle id=1 (T-34)', async () => {
    const app = new WGData();
    const config = await app.inferBestConfig(1);

    expect(app.configToProfileId(config)).toBe('258-259-1287-520453-522244');
    expect(config).toEqual({
      vehicleChassis: 258,
      vehicleTurret: 259,
      vehicleRadio: 1287,
      vehicleEngine: 520453,
      vehicleGun: 522244,
    });

  });
  it('returns correct best config for vehicle id=49', async () => {
    const app = new WGData();
    const config = await app.inferBestConfig(49);

    expect(app.configToProfileId(config)).toBe('50-51-52-55-13365');
    expect(config).toEqual({
      vehicleChassis: 50,
      vehicleTurret: 51,
      vehicleGun: 52,
      vehicleRadio: 55,
      vehicleEngine: 13365,
    });

  });

  it('returns correct best config for vehicle id=321', async () => {
    const app = new WGData();
    const config = await app.inferBestConfig(321);

    expect(app.configToProfileId(config)).toBe('579-583-834-1093-1348');
    expect(config).toEqual({
      vehicleTurret: 579,
      vehicleRadio: 583,
      vehicleChassis: 834,
      vehicleGun: 1348,
      vehicleEngine: 1093,
    });
  });

  it('returns correct best config for vehicle id=22529', async () => {
    const app = new WGData();
    const config = await app.inferBestConfig(22529);

    // 2311-55812-56069-57347-64258
    //                  56579
    // 2311-55812-56069-56579-64258
    expect(app.configToProfileId(config)).toBe('2311-55812-56069-56579-64258');
    expect(config).toEqual({
      vehicleRadio: 2311,
      vehicleGun: 55812,
      vehicleEngine: 56069,
      vehicleTurret: 56579,
      vehicleChassis: 64258,
    });
  });
});
