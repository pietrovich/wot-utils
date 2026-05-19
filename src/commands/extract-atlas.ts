import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { readTextureAtlas } from '../lib/texture-atlas.js';

export function extractAtlasCommand(): Command {
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

      const regions = await readTextureAtlas(mapPath);
      const src = PNG.sync.read(await readFile(imagePath));

      await mkdir(options.to, { recursive: true });

      for (const region of regions) {
        const out = new PNG({ width: region.width, height: region.height });

        for (let row = 0; row < region.height; row++) {
          const srcOffset = ((region.y + row) * src.width + region.x) * 4;
          const dstOffset = row * region.width * 4;
          src.data.copy(out.data, dstOffset, srcOffset, srcOffset + region.width * 4);
        }

        await writeFile(join(options.to, `${region.name}.png`), PNG.sync.write(out));
      }

      console.log(`Extracted ${regions.length} textures → ${options.to}`);
    });
}
