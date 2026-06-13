import { Command } from 'commander';
import { convertToPngFile } from '~/lib/utils/dds.js';

export function ddsDecodeCommand(): Command {
  return new Command('decode')
    .description('Decode a DDS texture to a 32-bit RGBA PNG')
    .argument('<file>', 'path to the .dds file')
    .action(async (file: string) => {
      const outPath = await convertToPngFile(file);
      console.log(`Decoded → ${outPath}`);
    });
}
