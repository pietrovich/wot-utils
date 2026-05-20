import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname, basename } from 'node:path';
import { Command } from 'commander';
import { PNG } from 'pngjs';
import { DDSUtils } from '~/lib/utex-mod/DDSUtils.js';

export function ddsEncodeCommand(): Command {
  return new Command('encode')
    .description('Encode a 32-bit RGBA PNG to a DXT5/BC3 DDS texture')
    .argument('<file>', 'path to the .png file')
    .action(async (file: string) => {
      const buffer = await readFile(file);
      const png = PNG.sync.read(buffer);

      const ddsBuffer = new DDSUtils().encode(png.data.buffer as ArrayBuffer, png.width, png.height, true);

      const ext = extname(file);
      const outName = basename(file, ext) + '.dds';
      const outPath = join(dirname(file), outName);

      await writeFile(outPath, Buffer.from(ddsBuffer));
      console.log(`Encoded → ${outPath}`);
    });
}
