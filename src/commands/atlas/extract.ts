import { Command } from 'commander';
import { AtlasManager } from '~/lib/AtlasManager.js';

export function extractAtlasCommand(atlas: AtlasManager): Command {
  return new Command('extract')
    .description('Extract all textures from an atlas into separate PNG files')
    .option('--from <path>', 'base path — derives <path>.png (image) and <path>.xml (map)')
    .option('--image <path>', 'atlas image path (PNG)')
    .option('--map <path>', 'atlas XML map path')
    .requiredOption('--to <dir>', 'destination directory')
    .action(async (options: { from?: string; image?: string; map?: string; to: string }) => {
      let imagePath: string;
      let mapPath: string;

      if (options.from) {
        imagePath = `${options.from}.png`;
        mapPath = `${options.from}.xml`;
      } else if (options.image && options.map) {
        imagePath = options.image;
        mapPath = options.map;
      } else {
        console.error('Provide either --from <path> or both --image <path> and --map <path>');
        process.exit(1);
      }

      const count = await atlas.extractAll(mapPath, imagePath, options.to);
      console.log(`Extracted ${count} textures → ${options.to}`);
    });
}
