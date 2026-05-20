import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname, basename } from 'node:path';
import { Command } from 'commander';
import { PNG } from 'pngjs';
import { DDSUtils } from '~/lib/utex-mod/DDSUtils.js';

export function ddsDecodeCommand(): Command {
  return new Command('decode')
    .description('Decode a DDS texture to a 32-bit RGBA PNG')
    .argument('<file>', 'path to the .dds file')
    .action(async (file: string) => {
      const buffer = await readFile(file);
      const frames = new DDSUtils().decode(buffer.buffer as ArrayBuffer);

      if (frames.length === 0) {
        console.error('No frames decoded from DDS file');
        process.exit(1);
      }

      const frame = frames[0];
      const png = new PNG({ width: frame.width, height: frame.height });
      png.data = Buffer.from(frame.image);

      const ext = extname(file);
      const outName = basename(file, ext) + '.png';
      const outPath = join(dirname(file), outName);

      await writeFile(outPath, PNG.sync.write(png));
      console.log(`Decoded → ${outPath}`);
    });
}
