import { Command } from 'commander';
import { readTextureAtlas } from '../lib/texture-atlas.js';

export function inspectAtlasCommand(): Command {
  return new Command('inspect')
    .description('List all texture names in an atlas XML')
    .argument('<atlas>', 'path to atlas XML')
    .action(async (atlasPath: string) => {
      const regions = await readTextureAtlas(atlasPath);
      regions
        .map((r) => r.name)
        .sort()
        .forEach((name) => console.log(name));
    });
}
