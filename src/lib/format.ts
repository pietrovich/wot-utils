import Table from 'cli-table3';
import type { Vehicle } from '../types.js';

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printVehiclesTable(vehicles: Vehicle[]): void {
  const table = new Table({
    head: ['ID', 'Name', 'Nation', 'Tier', 'Type', 'Premium'],
    colAligns: ['right', 'left', 'left', 'right', 'left', 'left'],
  });

  const sorted = [...vehicles].sort((a, b) =>
    a.tier !== b.tier ? a.tier - b.tier : a.name.localeCompare(b.name),
  );

  for (const v of sorted) {
    table.push([v.tank_id, v.name, v.nation, v.tier, v.type, v.is_premium ? 'yes' : '-']);
  }

  console.log(table.toString());
}
