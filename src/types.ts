export type VehicleType = 'lightTank' | 'mediumTank' | 'heavyTank' | 'AT-SPG' | 'SPG';
export type Nation =
  | 'ussr'
  | 'germany'
  | 'usa'
  | 'france'
  | 'uk'
  | 'japan'
  | 'china'
  | 'czech'
  | 'sweden'
  | 'poland'
  | 'italy';
export type ModuleType = 'vehicleChassis' | 'vehicleTurret' | 'vehicleEngine' | 'vehicleRadio' | 'vehicleGun';

export interface ModuleNode {
  module_id: number;
  name: string;
  type: ModuleType;
  is_default: boolean;
  price_xp: number;
  price_credit: number;
  next_modules: number[] | null;
  next_tanks: number[] | null;
}

export interface Vehicle {
  tank_id: number;
  name: string;
  short_name: string;
  tag: string;
  tier: number;
  type: VehicleType;
  nation: Nation;
  is_premium: boolean;
  is_premium_igr: boolean;
  is_gift: boolean;
  is_wheeled: boolean;
  images: {
    small_icon: string;
    contour_icon: string;
    big_icon: string;
  };
  engines: number[];
  guns: number[];
  radios: number[];
  suspensions: number[];
  turrets: number[];
  provisions: number[];
  modules_tree: Record<string, ModuleNode>;
  multination: Record<string, { is_default: boolean; tank_id: number }> | null;
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
