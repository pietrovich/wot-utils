import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { App } from '~/app.js';

interface Armor {
  front: number;
  sides: number;
  rear: number;
}

interface VehicleProfile {
  profile_id: string;
  turret: { view_range: number };
  armor: { hull: Armor; turret: Armor };
  gun: { reload_time: number };
}

interface TableRow {
  name: string;
  viewRange: number;
  reloadTime: number;
  hullArmor: Armor;
  turretArmor: Armor;
}

function formatArmor(a: Armor): string {
  try {
    return `${a.front} / ${a.sides} / ${a.rear}`;
  } catch (e) {
    return '';
  }
}

function printProfile(profile: VehicleProfile): void {
  console.log(`profile:      ${profile.profile_id}`);
  console.log(`view range:   ${profile.turret.view_range} m`);
  console.log(`hull armor:   ${formatArmor(profile.armor.hull)}  (front / sides / rear)`);
  console.log(`turret armor: ${formatArmor(profile.armor.turret)}  (front / sides / rear)`);
  console.log(`reload time:  ${profile.gun.reload_time.toFixed(2)} s`);
}

function printTable(rows: TableRow[]): void {
  const headers = ['Name', 'View Range', 'Reload (s)', 'Hull (f/s/r)', 'Turret (f/s/r)'];
  const cells = rows.map((r) => [
    r.name,
    String(r.viewRange),
    r.reloadTime.toFixed(2),
    formatArmor(r.hullArmor),
    formatArmor(r.turretArmor),
  ]);

  const widths = headers.map((h, i) => Math.max(h.length, ...cells.map((row) => row[i].length)));
  const pad = (s: string, w: number) => s.padEnd(w);
  const formatRow = (row: string[]) => row.map((cell, i) => pad(cell, widths[i])).join('  ');

  console.log(formatRow(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of cells) {
    try {
      console.log(formatRow(row));
    } catch (e) {
      console.log(`!!!! ${row[0]} ${e instanceof Error ? e.message : e}`);
    }
  }
}

function extractProfile(data: unknown): VehicleProfile {
  return Object.values(data as Record<string, VehicleProfile>)[0];
}

export function vehicleStatsCommand(app: App): Command {
  return new Command('stats')
    .description('Fetch stats for the best module configuration of a vehicle')
    .argument('[query]', 'tank_id (number), tag, or short_name')
    .option('--all', 'fetch stats for all vehicles and print as a table')
    .option('--raw', 'print full JSON response (single vehicle only)')
    .action(async (query: string | undefined, options) => {
      try {
        if (!query || options.all) {
          const vehicles = await app.getVehicles();
          const sorted = [...vehicles].sort((a, b) => a.short_name.localeCompare(b.short_name));
          const targets = options.all ? sorted : sorted.slice(0, 10);

          const rows: TableRow[] = [];
          const batchSize = 5;

          for (let i = 0; i < targets.length; i += batchSize) {
            const batch = targets.slice(i, i + batchSize);
            if (!options.raw) {
              console.error(`${i + 1}–${Math.min(i + batchSize, targets.length)} / ${targets.length}`);
            }

            const results = await Promise.all(
              batch.map(async (v) => {
                try {
                  const data = await app.getStatsForBestConfig(v.tank_id);
                  const profile = extractProfile(data);

                  return {
                    name: v.short_name,
                    viewRange: profile.turret.view_range,
                    reloadTime: profile.gun.reload_time,
                    hullArmor: profile.armor.hull,
                    turretArmor: profile.armor.turret,
                  } satisfies TableRow;
                } catch {
                  return null;
                }
              }),
            );

            for (const row of results) {
              if (row) {
                rows.push(row);
              }
            }
          }

          printTable(rows);
          return;
        }

        const result = await app.getStatsForBestConfig(query);

        if (options.raw) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        printProfile(extractProfile(result));
      } catch (error) {
        if (error instanceof WGApiError) {
          console.error(`API error [${error.code}] ${error.field}: ${error.message}`);
        } else {
          console.error('Error:', error instanceof Error ? error.message : error);
        }

        process.exit(1);
      }
    });
}
