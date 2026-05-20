import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WGApiError } from '../src/lib/api.js';
import { App } from '../src/app.js';

describe('App vehicle fetching', () => {
  beforeEach(() => {
    vi.stubEnv('WG_APP_ID', 'test-app-id');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns vehicle data on success', async () => {
    const mockData = { '1': { tank_id: 1, name: 'T-34', tier: 5 } };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'ok', data: mockData }) }),
    );

    const result = await new App().getVehicles({ useCache: false });
    expect(result).toEqual(mockData);
  });

  it('throws WGApiError on API error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: 'error',
            error: { field: 'application_id', code: 407, message: 'INVALID_APPLICATION_ID', value: null },
          }),
      }),
    );

    await expect(new App().getVehicles({ useCache: false })).rejects.toThrow(WGApiError);
    await expect(new App().getVehicles({ useCache: false })).rejects.toThrow('INVALID_APPLICATION_ID');
  });

  it('includes application_id in the request URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok', data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await new App().getVehicles({ useCache: false });

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('application_id=test-app-id');
  });
});
