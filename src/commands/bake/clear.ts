import { Command } from 'commander';
import type { WGData } from '~/lib/WGData.js';
import type { AtlasManager } from '~/lib/AtlasManager.js';
import { PogsClearV2 } from '~/lib/icons/pogs/PogsClearV2.js';
import { pogsPipeline } from '~/lib/pipeline/pogs.js';
import { bakeSubcommand, resolveBakeOptions, type BakeOptions } from '~/commands/bake/bake-command.js';

export function bakeClearCommand(app: WGData, atlasManager: AtlasManager): Command {
  return bakeSubcommand('clear', 'Bake PogS clear icon set (no colour background)')
    .action(async (options: BakeOptions) => {
      await pogsPipeline(app, atlasManager, new PogsClearV2(), resolveBakeOptions(options));
    });
}
