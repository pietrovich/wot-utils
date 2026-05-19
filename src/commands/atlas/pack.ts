import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { AtlasManager } from '~/lib/atlas-manager.js';

export function packAtlasCommand(atlas: AtlasManager): Command {
  return new Command('pack')
    .description('Pack a directory of PNGs into a texture atlas')
    .option('--from <dir>', 'source directory containing PNG images')
    .option('--src <dir>', 'alias for --from')
    .option('--to <path>', 'output base path (gets .png and .xml extensions)')
    .option('--dst <path>', 'alias for --to')
    .option('--padding <n>', 'pixels of padding between textures', '0')
    .option('--max-width <n>', 'maximum atlas width in pixels', '4096')
    .action(async (options: { from?: string; src?: string; to?: string; dst?: string; padding: string; maxWidth: string }) => {
      const fromDir = options.from ?? options.src;
      const toPath = options.to ?? options.dst;

      if (!fromDir) {
        console.error('Provide --from <dir> or --src <dir>');
        process.exit(1);
      }
      if (!toPath) {
        console.error('Provide --to <path> or --dst <path>');
        process.exit(1);
      }

      const result = await atlas.pack(fromDir, {
        padding: parseInt(options.padding, 10),
        maxWidth: parseInt(options.maxWidth, 10),
      });

      if (result.bins > 1) {
        console.warn(`Warning: textures span ${result.bins} bins — only the first will be written`);
      }

      await writeFile(`${toPath}.png`, result.pngBuffer);
      await writeFile(`${toPath}.xml`, result.xml);

      console.log(`Packed ${result.count} textures → ${toPath}.png (${result.width}×${result.height})`);
    });
}
