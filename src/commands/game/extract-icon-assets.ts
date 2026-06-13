import { join } from 'node:path';
import { Command } from 'commander';
import { extractIconAtlases } from '~/lib/utils/game-resources.js';
import { convertToPngFile } from '~/lib/utils/dds.js';

export function extractIconAssetsCommand(): Command {
  return new Command('extract-icon-assets')
    .alias('extract-icons')
    .description(
      'Extract battle and vehicle marker atlas files from a WoT installation directory',
    )
    .argument('<src-dir>', 'WoT game directory (searched recursively for gui-partN.pkg files)')
    .argument('<out-dir>', 'destination directory for extracted files (created if absent)')
    .action(async (srcDir: string, outDir: string) => {
      const { pkgsFound, filesExtracted, skipped } = await extractIconAtlases(
        srcDir,
        outDir,
        (msg) => console.log(msg),
      );

      if (skipped) {
        console.log(`All atlas files already present in ${outDir}, nothing to do.`);
      } else {
        console.log(`Done. Scanned ${ pkgsFound } package(s), extracted ${ filesExtracted } file(s) → ${ outDir }`);
      }

      const ddsFiles = ['battleAtlas.dds', 'vehicleMarkerAtlas.dds'];
      for (const ddsFile of ddsFiles) {
        const ddsPath = join(outDir, ddsFile);
        try {
          const pngPath = await convertToPngFile(ddsPath);
          console.log(`Converted → ${pngPath}`);
        } catch (err) {
          console.error(`Warning: failed to convert ${ddsFile}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });
}
