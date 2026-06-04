import { Command } from 'commander';
import { WGApiError } from '~/lib/api.js';
import type { WGData } from '~/lib/WGData.js';

export function charsCommand(app: WGData): Command {
  return new Command('chars').description('List unique characters found in vehicle short names').action(async () => {
    try {
      const { uniqueCharacters, maxLength, longestShortName, avgLength, medianLength, p80Length, p90Length } =
        await app.getShortNameStats();
      console.log('uniqueCharacters:', uniqueCharacters);
      console.log('maxLength:', maxLength);
      console.log('longestShortName:', longestShortName);
      console.log('avgLength:', avgLength);
      console.log('medianLength:', medianLength);
      console.log('p80Length:', p80Length);
      console.log('p90Length:', p90Length);
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
