import { Command } from 'commander';
import type { WGData } from '~/lib/WGData.js';
import type { FetchResult, TomatoApi } from '~/lib/tomato-api.js';
import { fromTypeAlias } from '~/lib/vehicle-type-helpers.js';
import type { Vehicle, VehicleType } from '~/types.js';

const TYPE_ALIASES = ['lt', 'mt', 'ht', 'td', 'at'] as const;
type TypeAlias = (typeof TYPE_ALIASES)[number];

async function fetchVehicle(tomato: TomatoApi, vehicle: Vehicle): Promise<FetchResult[]> {
  return Promise.all([
    tomato.fetchVehicleVisuals(vehicle.tank_id),
    tomato.fetchVehicleLoadouts(vehicle.tank_id),
    tomato.fetchVehicleProLoadouts(vehicle.tank_id),
  ]);
}

function vehicleLine(results: FetchResult[], vehicle: Vehicle, prefix = ''): string {
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const elapsed = results.reduce((sum, r) => sum + r.elapsed, 0);
  const status = failed === 0
    ? 'OK'
    : (succeeded === 0 ? 'FAILED' : 'PARTIAL');

  return `${prefix}${vehicle.short_name} (${vehicle.tank_id}): ${status} (${succeeded}/${failed}) ${elapsed}ms`;
}

function printErrors(results: FetchResult[]): void {
  for (const r of results) {
    if (!r.success) {
      console.error(`    error [${r.fileName}]: ${r.error?.message ?? 'unknown'}`);
    }
  }
}

function printSummary(succeeded: number, failed: number): void {
  const total = succeeded + failed;
  const summary =
    failed === 0
      ? `${total} requests, ${succeeded} succeeded`
      : `${total} requests, ${succeeded} succeeded, ${failed} failed`;
  console.log(summary);
}

export function tomatoFetchCommand(app: WGData, tomato: TomatoApi): Command {
  return new Command('fetch')
    .description('Fetch Tomato.gg data for one vehicle or a filtered batch')
    .argument('[query]', 'tank_id (number), tag, or short_name')
    .option('--tier <n>', 'tier filter for batch mode', Number, 11)
    .option('--lt', 'include light tanks')
    .option('--mt', 'include medium tanks')
    .option('--ht', 'include heavy tanks')
    .option('--td', 'include tank destroyers (AT-SPG)')
    .option('--at', 'include SPGs (artillery)')
    .action(async (query: string | undefined, options) => {
      try {
        if (query) {
          const vehicle = await app.findVehicle(query);
          console.error(`Fetching data for ${vehicle.short_name} (${vehicle.tank_id})…`);
          const results = await fetchVehicle(tomato, vehicle);
          printErrors(results);
          console.error(vehicleLine(results, vehicle));
          const failed = results.filter((r) => !r.success).length;
          printSummary(results.length - failed, failed);
          if (failed > 0) {process.exit(1);}

          return;
        }

        const activeAliases = TYPE_ALIASES.filter((a): a is TypeAlias => Boolean(options[a]));
        if (activeAliases.length === 0) {
          console.error('Specify a <query> or --tier with at least one type flag (--lt, --mt, --ht, --td, --at).');
          process.exit(1);
        }

        const selectedTypes = new Set<VehicleType>(activeAliases.map(fromTypeAlias));
        const tier: number = options.tier;
        const vehicles = await app.getVehicles();
        const targets = vehicles.filter((v) => v.tier === tier && selectedTypes.has(v.type));

        if (targets.length === 0) {
          console.error(`No vehicles match tier ${tier} with the given type filters.`);
          process.exit(1);
        }

        console.error(`Fetching data for ${targets.length} vehicles (tier ${tier})…`);

        let totalSucceeded = 0;
        let totalFailed = 0;
        const total = targets.length;
        const width = String(total).length;
        let idx = 0;

        for (const vehicle of targets) {
          idx++;
          const results = await fetchVehicle(tomato, vehicle);
          const succeeded = results.filter((r) => r.success).length;
          const failed = results.filter((r) => !r.success).length;
          totalSucceeded += succeeded;
          totalFailed += failed;
          const progress = `${String(idx).padStart(width)}/${total} `;
          console.error(vehicleLine(results, vehicle, `  ${progress}`));
          printErrors(results);
        }

        printSummary(totalSucceeded, totalFailed);
        if (totalFailed > 0) {process.exit(1);}
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
