import { Command } from 'commander';
import { WGApiError } from '../lib/api.js';
import type { App } from '../app.js';

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

function formatArmor(a: Armor): string {
  return `${a.front} / ${a.sides} / ${a.rear}`;
}

function printProfile(profile: VehicleProfile): void {
  console.log(`profile:      ${profile.profile_id}`);
  console.log(`view range:   ${profile.turret.view_range} m`);
  console.log(`hull armor:   ${formatArmor(profile.armor.hull)}  (front / sides / rear)`);
  console.log(`turret armor: ${formatArmor(profile.armor.turret)}  (front / sides / rear)`);
  console.log(`reload time:  ${profile.gun.reload_time.toFixed(2)} s`);
}

export function vehicleStatsCommand(app: App): Command {
  return new Command('vehicle-stats')
    .description('Fetch stats for the best module configuration of a vehicle')
    .argument('<query>', 'tank_id (number), tag, or short_name')
    .option('--raw', 'print full JSON response')
    .action(async (query: string, options) => {
      try {
        const result = await app.getStatsForBestConfig(query);

        if (options.raw) {
          console.log(JSON.stringify(result, null, 2));

          return;
        }

        const profile = Object.values(result as Record<string, VehicleProfile>)[0];
        printProfile(profile);
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
