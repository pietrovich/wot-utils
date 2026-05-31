import type { VehicleType } from '~/types.js';

const TYPE_MAP: Record<VehicleType, string> = {
  lightTank: 'lt',
  mediumTank: 'mt',
  heavyTank: 'ht',
  'AT-SPG': 'td',
  SPG: 'at',
};

const ALIAS_MAP = Object.fromEntries(
  Object.entries(TYPE_MAP).map(([type, alias]) => [alias, type as VehicleType]),
) as Record<string, VehicleType>;

export function toTypeAlias(type: VehicleType): string {
  return TYPE_MAP[type];
}

export function fromTypeAlias(alias: string): VehicleType {
  const type = ALIAS_MAP[alias];
  if (!type) {throw new Error(`Unknown vehicle type alias: ${alias}`);}

  return type;
}
