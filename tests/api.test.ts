import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVehicles, WGApiError } from '../src/lib/api.js';

describe('fetchVehicles', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns vehicle data on success', async () => {
    const mockData = { '1': { tank_id: 1, name: 'T-34', tier: 5 } };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'ok', data: mockData }) }),
    );

    const result = await fetchVehicles('test-app-id');
    expect(result).toEqual(mockData);
  });

  it('throws WGApiError on API error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: 'error',
            error: {
              field: 'application_id',
              code: 407,
              message: 'INVALID_APPLICATION_ID',
              value: null,
            },
          }),
      }),
    );

    await expect(fetchVehicles('bad-id')).rejects.toThrow(WGApiError);
    await expect(fetchVehicles('bad-id')).rejects.toThrow('INVALID_APPLICATION_ID');
  });

  it('includes application_id in the request URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok', data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchVehicles('my-app-id');

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('application_id=my-app-id');
  });
});
