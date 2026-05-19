import { Command } from 'commander';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { PNG } from 'pngjs';
import { MaxRectsPacker, type IRectangle } from 'maxrects-packer';

interface TextureRect extends IRectangle {
  name: string;
  png: PNG;
}

function buildXml(rects: Array<{ name: string; x: number; y: number; width: number; height: number }>): string {
  const entries = rects
    .map(
      (r) =>
        `  <SubTexture>\n` +
        `    <name> ${r.name} </name>\n` +
        `    <x> ${r.x} </x>\n` +
        `    <y> ${r.y} </y>\n` +
        `    <width> ${r.width} </width>\n` +
        `    <height> ${r.height} </height>\n` +
        `  </SubTexture>`,
    )
    .join('\n');
  return `<root>\n${entries}\n</root>\n`;
}

export function packAtlasCommand(): Command {
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

      const padding = parseInt(options.padding, 10);
      const maxWidth = parseInt(options.maxWidth, 10);

      const files = (await readdir(fromDir))
        .filter((f) => extname(f).toLowerCase() === '.png')
        .sort();

      if (files.length === 0) {
        console.error(`No PNG files found in ${fromDir}`);
        process.exit(1);
      }

      const entries: TextureRect[] = await Promise.all(
        files.map(async (file) => {
          const png = PNG.sync.read(await readFile(join(fromDir, file)));
          return { name: basename(file, '.png'), png, x: 0, y: 0, width: png.width, height: png.height };
        }),
      );

      const packer = new MaxRectsPacker<TextureRect>(maxWidth, 32768, padding, {
        smart: true,
        pot: false,
        square: false,
        allowRotation: false,
      });
      packer.addArray(entries);

      if (packer.bins.length > 1) {
        console.warn(`Warning: textures span ${packer.bins.length} bins — only the first will be written`);
      }

      const bin = packer.bins[0];
      const out = new PNG({ width: bin.width, height: bin.height });
      out.data.fill(0);

      const regions: Array<{ name: string; x: number; y: number; width: number; height: number }> = [];

      for (const rect of bin.rects) {
        const entry = rect as TextureRect;
        const { x, y, width, height, name, png } = entry;

        for (let row = 0; row < height; row++) {
          const srcOffset = row * width * 4;
          const dstOffset = ((y + row) * bin.width + x) * 4;
          png.data.copy(out.data, dstOffset, srcOffset, srcOffset + width * 4);
        }

        regions.push({ name, x, y, width, height });
      }

      regions.sort((a, b) => a.name.localeCompare(b.name));

      await writeFile(`${toPath}.png`, PNG.sync.write(out));
      await writeFile(`${toPath}.xml`, buildXml(regions));

      console.log(`Packed ${entries.length} textures → ${toPath}.png (${bin.width}×${bin.height})`);
    });
}
