import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { readTextureAtlas } from '../lib/texture-atlas.js';

export function pickCommand(): Command {
  return new Command('pick')
    .description('Extract a named texture region from an atlas and save as PNG')
    .argument('<atlas>', 'path to atlas XML')
    .argument('<image>', 'path to atlas image (always read as PNG)')
    .argument('<name>', 'texture name to extract')
    .action(async (atlasPath: string, imagePath: string, name: string) => {
      const regions = await readTextureAtlas(atlasPath);
      const region = regions.find((r) => r.name === name);
      if (!region) {
        console.error(`Texture not found: ${name}`);
        console.error(`Available: ${regions.map((r) => r.name).join(', ')}`);
        process.exit(1);
      }

      const src = PNG.sync.read(await readFile(imagePath));

      const out = new PNG({ width: region.width, height: region.height });
      for (let row = 0; row < region.height; row++) {
        for (let col = 0; col < region.width; col++) {
          const srcIdx = ((region.y + row) * src.width + (region.x + col)) * 4;
          const dstIdx = (row * region.width + col) * 4;
          out.data[dstIdx] = src.data[srcIdx];
          out.data[dstIdx + 1] = src.data[srcIdx + 1];
          out.data[dstIdx + 2] = src.data[srcIdx + 2];
          out.data[dstIdx + 3] = src.data[srcIdx + 3];
        }
      }

      const outPath = `${name}.png`;
      await writeFile(outPath, PNG.sync.write(out));
      console.log(`${outPath} — ${region.width}×${region.height}px`);
    });
}
