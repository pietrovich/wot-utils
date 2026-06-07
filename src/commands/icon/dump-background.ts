import { join } from 'node:path';
import { Command } from 'commander';
import { bgColors } from '~/lib/icons/pogs/background-colors.js';
import { PogsConstants } from '~/lib/icons/pogs/pogs-constants.js';
import { ImageBaker } from '~/lib/icons/ImageBaker.js';
import { gradientBackground } from '~/lib/icons/layers/gradient-background.js';
import { barAndShield } from '~/lib/icons/layers/bar-and-shield.js';
import type { Vehicle } from '~/types.js';

export function dumpBackgroundCommand(): Command {
  return new Command('dump-background')
    .description('Write a composited tank-type icon background (gradient + shield) for each type to cwd')
    .action(async () => {
      const baker = new ImageBaker(PogsConstants, [
        gradientBackground(),
        barAndShield(),
      ]);

      for (const type of Object.keys(bgColors)) {
        const stub = { type } as unknown as Vehicle;
        const outPath = join(process.cwd(), `${type.toLowerCase()}.png`);
        await (await baker.bake(stub)).png().toFile(outPath);
        console.log(`Written ${outPath}`);
      }
    });
}
