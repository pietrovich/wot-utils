import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Command } from 'commander';
import { BackgroundFactory } from '~/lib/icons/background-factory.js';

export function dumpBackgroundCommand(): Command {
  return new Command('dump-background')
    .description('Write a composited tank-type icon background (gradient + shield) for each type to cwd')
    .action(async () => {
      const factory = new BackgroundFactory();
      for (const type of BackgroundFactory.types()) {
        const buf = await factory.generate(type);
        const outPath = join(process.cwd(), `${type.toLowerCase()}.png`);
        await writeFile(outPath, buf);
        console.log(`Written ${outPath}`);
      }
    });
}
