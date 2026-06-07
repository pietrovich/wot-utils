import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { AtlasManager } from '~/lib/AtlasManager.js';

export function pickCommand(atlas: AtlasManager): Command {
  return new Command('pick')
    .description('Extract a named texture region from an atlas and save as PNG')
    .argument('<atlas>', 'path to atlas XML')
    .argument('<image>', 'path to atlas image (always read as PNG)')
    .argument('<name>', 'texture name to extract')
    .action(async (atlasPath: string, imagePath: string, name: string) => {
      const result = await atlas.pick(atlasPath, imagePath, name);
      if (!result) {
        console.error(`Texture not found: ${name}`);
        console.error(`Run 'pie-wot atlas inspect ${atlasPath}' to list available textures`);
        process.exit(1);
      }

      const outPath = `${name}.png`;
      await writeFile(outPath, PNG.sync.write(result));
      console.log(`${outPath} — ${result.width}×${result.height}px`);
    });
}
