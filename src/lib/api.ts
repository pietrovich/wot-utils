import type { VehiclesData, WGApiResponse } from '../types.js';

const BASE_URL = 'https://api.worldoftanks.eu/wot';

export class WGApiError extends Error {
  constructor(
    public readonly field: string,
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'WGApiError';
  }
}

export async function fetchVehicles(appId: string): Promise<VehiclesData> {
  const url = new URL(`${BASE_URL}/encyclopedia/vehicles/`);
  url.searchParams.set('application_id', appId);

  const response = await fetch(url.toString());
  const json = (await response.json()) as WGApiResponse<VehiclesData>;

  if (json.status === 'error') {
    const err = json.error!;
    throw new WGApiError(err.field, err.code, err.message);
  }

  return json.data!;
}
