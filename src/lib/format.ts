import Table from 'cli-table3';
import type { Vehicle } from '../types.js';

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

export function printVehiclesTable(vehicles: Vehicle[]): void {
  const table = new Table({
    head: ['Short', 'Tag', 'Name', 'ID', ''],
    colAligns: ['left', 'left', 'left', 'right', 'left'],
  });

  for (const v of vehicles) {
    table.push([v.short_name, v.tag, v.name, v.tank_id, `${GREEN}✓${RESET}`]);
  }

  console.log(table.toString());
}
