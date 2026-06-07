import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import type { Vehicle } from '~/types.js';
import rawDict from './short-names.json5';

const dict: Record<string, string> = { ...(rawDict as Record<string, string>) };

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
  const filePath = fileURLToPath(new URL('./short-names.json5', import.meta.url));
  const sorted = Object.fromEntries(
    Object.entries(dict).sort(([, a], [, b]) => b.length - a.length),
  );
  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}
