import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import type { Vehicle } from '~/types.js';

const filePath = fileURLToPath(new URL('./short-names.json5', import.meta.url));
const dict: Record<string, string> = JSON5.parse(readFileSync(filePath, 'utf8'));

export function lookupShortName(vehicle: Vehicle): string {
  return dict[vehicle.tag] ?? vehicle.short_name;
}

export function isResolved(vehicle: Vehicle): boolean {
  return vehicle.tag in dict;
}

export function add(vehicle: Vehicle, alias: string): void {
  dict[vehicle.tag] = alias;
}

export function save(): void {
  const sorted = Object.fromEntries(
    Object.entries(dict).sort(([, a], [, b]) => b.length - a.length),
  );
  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}
