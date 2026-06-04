import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import { add, isResolved, lookupShortName, save } from '~/lib/icons/pogs/short-names.js';
import type { WGData } from '~/lib/WGData.js';

export function longAliasesCommand(app: WGData): Command {
  return new Command('long-aliases')
    .description('List vehicles whose shortened alias exceeds 10 characters')
    .option('--update', 'back-fill dictionary with aliases that are too long or unresolved')
    .action(async (options) => {
      try {
        const vehicles = await app.getVehicles();
        let dirty = false;

        for (const vehicle of vehicles) {
          const alias = lookupShortName(vehicle);
          const tooLong = alias.length > 10;
          const unresolved = !isResolved(vehicle);

          if (tooLong || unresolved) {
            console.log(`${vehicle.tank_id} ${vehicle.tag} "${alias}"`);
            if (options.update) {
              add(vehicle, alias);
              dirty = true;
            }
          }
        }

        if (dirty) {
          save();
        }
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
