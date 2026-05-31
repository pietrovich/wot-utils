import { Command } from 'commander';
import type { App } from '~/app.js';
import type { TomatoApi } from '~/lib/tomato-api.js';
import { fromTypeAlias } from '~/lib/vehicle-type-helpers.js';
import type { Vehicle, VehicleType } from '~/types.js';

const TYPE_ALIASES = ['lt', 'mt', 'ht', 'td', 'at'] as const;
type TypeAlias = (typeof TYPE_ALIASES)[number];

async function fetchVehicle(tomato: TomatoApi, vehicle: Vehicle): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.allSettled([
    tomato.fetchVehicleVisuals(vehicle.tank_id),
    tomato.fetchVehicleLoadouts(vehicle.tank_id),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`  error: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
    }
  }

  return {
    succeeded: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}

function printSummary(totalRequests: number, succeeded: number, failed: number): void {
  const summary =
    failed === 0
      ? `${totalRequests} requests, ${succeeded} succeeded`
      : `${totalRequests} requests, ${succeeded} succeeded, ${failed} failed`;
  console.log(summary);
}

export function tomatoFetchCommand(app: App, tomato: TomatoApi): Command {
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
          const { succeeded, failed } = await fetchVehicle(tomato, vehicle);
          printSummary(2, succeeded, failed);
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

        for (const vehicle of targets) {
          const { succeeded, failed } = await fetchVehicle(tomato, vehicle);
          totalSucceeded += succeeded;
          totalFailed += failed;
          const status = failed === 0 ? 'ok' : `${failed} failed`;
          console.error(`  ${vehicle.short_name} (${vehicle.tank_id}): ${status}`);
        }

        printSummary(targets.length * 2, totalSucceeded, totalFailed);
        if (totalFailed > 0) {process.exit(1);}
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
