import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { findPkgRoot } from '~/lib/pkg-root.js';

const SCRIPTS: Record<string, string> = {
  'clear': 'bake-pogs-clear.sh',
  'color': 'bake-pogs-color-dmg-fsr-vr-rld.sh',
  'simple': 'bake-pogs-color-dmg-fsr-vr-rld.sh',
};

const scriptsDir = resolve(findPkgRoot(new URL(import.meta.url)), 'scripts');

export function bakeCommand(): Command {
  const names = Object.keys(SCRIPTS).join(', ');

  return new Command('bake')
    .description('Run a bundled build script')
    .argument('<script>', `available: ${names}`)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .passThroughOptions(true)
    .action((scriptName: string, _options: unknown, cmd: Command) => {
      const filename = SCRIPTS[scriptName];

      if (filename === undefined) {
        console.error(`Unknown script: ${scriptName}\nAvailable: ${names}`);
        process.exit(1);
      }

      const scriptPath = resolve(scriptsDir, filename);

      if (!existsSync(scriptPath)) {
        console.error(`Script not found: ${scriptPath}`);
        process.exit(1);
      }

      const extraArgs = cmd.args.slice(1);

      try {
        execFileSync('bash', [scriptPath, ...extraArgs], {
          stdio: 'inherit',
          env: { ...process.env, PIE_WOT_CWD: process.cwd() },
        });
      } catch (err) {
        process.exit((err as { status?: number }).status ?? 1);
      }
    });
}
