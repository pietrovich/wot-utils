import { Command } from 'commander';
import { AtlasManager } from '~/lib/AtlasManager.js';

export function inspectAtlasCommand(atlas: AtlasManager): Command {
  return new Command('inspect')
    .description('List all texture names in an atlas XML')
    .argument('<atlas>', 'path to atlas XML')
    .action(async (atlasPath: string) => {
      const names = await atlas.listNames(atlasPath);
      names.forEach((name) => console.log(name));
    });
}
