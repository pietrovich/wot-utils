import { Command } from 'commander';
import type { App } from '~/app.js';
import type { TomatoApi } from '~/lib/tomato-api.js';

export function tomatoFetchCommand(app: App, tomato: TomatoApi): Command {
  return new Command('fetch')
    .description('Fetch Tomato.gg data for a vehicle and save to disk')
    .argument('<query>', 'tank_id (number), tag, or short_name')
    .action(async (query: string) => {
      try {
        const vehicle = await app.findVehicle(query);
        const { tank_id, short_name } = vehicle;

        console.error(`Fetching data for ${short_name} (${tank_id})…`);

        const results = await Promise.allSettled([
          tomato.fetchVehicleVisuals(tank_id),
          tomato.fetchVehicleLoadouts(tank_id),
        ]);

        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        for (const result of results) {
          if (result.status === 'rejected') {
            console.error(`  error: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
          }
        }

        const total = results.length;
        const summary =
          failed === 0
            ? `${total} requests, ${succeeded} succeeded`
            : `${total} requests, ${succeeded} succeeded, ${failed} failed`;

        console.log(summary);

        if (failed > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
