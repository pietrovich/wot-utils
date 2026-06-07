import { readFileSync, writeFileSync } from 'node:fs';
import JSON5 from 'json5';
import type { Vehicle } from '~/types.js';
import { resolveAsset } from '~/lib/pkg-root.js';

const shortNamesPath = resolveAsset(new URL(import.meta.url), 'pogs', 'short-names.json5');
const dict: Record<string, string> = {
  ...(JSON5.parse(readFileSync(shortNamesPath, 'utf8')) as Record<string, string>),
};

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
  writeFileSync(shortNamesPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}
