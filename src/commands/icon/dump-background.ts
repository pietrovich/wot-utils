import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Command } from 'commander';
import { PNG } from 'pngjs';
import { bgColors } from '~/lib/icons/background-colors.js';

const WIDTH = 80;

export function dumpBackgroundCommand(): Command {
  return new Command('dump-background')
    .description('Write a gradient background PNG swatch for each tank type to cwd')
    .action(async () => {
      for (const [type, rows] of Object.entries(bgColors)) {
        const png = new PNG({ width: WIDTH, height: rows.length });

        for (let y = 0; y < rows.length; y++) {
          const [r, g, b] = rows[y];
          for (let x = 0; x < WIDTH; x++) {
            const i = (y * WIDTH + x) * 4;
            png.data[i]     = r;
            png.data[i + 1] = g;
            png.data[i + 2] = b;
            png.data[i + 3] = 255;
          }
        }

        const outPath = join(process.cwd(), `${type.toLowerCase()}.png`);
        await writeFile(outPath, PNG.sync.write(png));
        console.log(`Written ${outPath}`);
      }
    });
}
