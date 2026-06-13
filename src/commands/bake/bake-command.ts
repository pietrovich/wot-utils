import { join } from 'node:path';
import { Command } from 'commander';

export interface BakeOptions {
  out: string;
  atlasDir?: string;
  gameDir?: string;
  clean?: boolean;
  fresh?: boolean;
  prune?: boolean;
  tidy?: boolean;
}

export function resolveBakeOptions(options: BakeOptions) {
  const srcDir = options.atlasDir ?? join(options.out, '.atlases');
  const clean = options.clean ?? options.fresh;
  const prune = options.prune ?? options.tidy;

  return {
    srcDir,
    outDir: options.out,
    buildDir: join(options.out, '.build'),
    gameDir: options.gameDir,
    cleanAtlasDir: !options.atlasDir,
    clean,
    prune,
  };
}

export function bakeSubcommand(name: string, description: string): Command {
  return new Command(name)
    .description(description)
    .requiredOption('--out <dir>', 'output directory for the final mod files')
    .option('--atlas-dir <dir>', 'directory with extracted atlas DDS/PNG/XML files (default: <out>/.atlases)')
    .option('--game-dir <dir>', 'WoT game directory — used to extract missing atlas files automatically')
    .option('--clean', 'wipe build artefacts before starting')
    .option('--fresh', 'alias for --clean')
    .option('--prune', 'remove intermediate build directory after completion')
    .option('--tidy', 'alias for --prune');
}
