import { join } from 'node:path';
import { Command } from 'commander';
import type { WGData } from '~/lib/WGData.js';
import type { AtlasManager } from '~/lib/AtlasManager.js';
import { PogsClearV2 } from '~/lib/icons/pogs/PogsClearV2.js';
import { PogsColorV1 } from '~/lib/icons/pogs/PogsColorV1.js';
import { pogsPipeline } from '~/lib/pipeline/pogs.js';
import { bakeSubcommand, resolveBakeOptions, type BakeOptions } from '~/commands/bake/bake-command.js';

export function bakeAllCommand(app: WGData, atlasManager: AtlasManager): Command {
  return bakeSubcommand('all', 'Bake all icon sets (clear + color)')
    .action(async (options: BakeOptions) => {
      const resolved = resolveBakeOptions(options);

      await pogsPipeline(app, atlasManager, new PogsClearV2(), {
        ...resolved,
        outDir: join(options.out, 'clear'),
        buildDir: join(options.out, 'clear', '.build'),
      });

      await pogsPipeline(app, atlasManager, new PogsColorV1(), {
        ...resolved,
        outDir: join(options.out, 'color'),
        buildDir: join(options.out, 'color', '.build'),
        clean: false,
        cleanAtlasDir: false,
      });
    });
}
