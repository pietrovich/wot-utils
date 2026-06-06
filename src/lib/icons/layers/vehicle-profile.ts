type ArmorFace = { front?: number; sides?: number; rear?: number };
type AmmoEntry = { type?: string; damage?: number[]; penetration?: number[] };

export type VehicleProfile = {
  turret?: { view_range?: number };
  gun?: { reload_time?: number };
  armor?: { hull?: ArmorFace; turret?: ArmorFace };
  ammo?: AmmoEntry[];
};
