import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { WGData } from '~/WGData.js';

export function bestConfigCommand(app: WGData): Command {
  return new Command('best-config')
    .description('Infer best module configuration for a vehicle')
    .argument('<query>', 'tank_id (number), tag, or short_name')
    .action(async (query: string) => {
      try {
        const result = await app.inferBestConfig(query);
        console.log(app.configToProfileId(result));
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
