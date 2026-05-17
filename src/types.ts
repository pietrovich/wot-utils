export interface Vehicle {
  tank_id: number;
  name: string;
  tier: number;
  type: 'lightTank' | 'mediumTank' | 'heavyTank' | 'AT-SPG' | 'SPG';
  nation: string;
  is_premium: boolean;
  tag: string;
  images?: {
    preview?: string;
    normal?: string;
  };
}

export type VehiclesData = Record<string, Vehicle>;

export interface WGApiResponse<T> {
  status: 'ok' | 'error';
  meta?: { count: number };
  data?: T;
  error?: {
    field: string;
    message: string;
    code: number;
    value: unknown;
  };
}
