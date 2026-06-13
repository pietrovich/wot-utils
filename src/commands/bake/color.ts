import { Command } from 'commander';
import type { WGData } from '~/lib/WGData.js';
import type { AtlasManager } from '~/lib/AtlasManager.js';
import { PogsColorV1 } from '~/lib/icons/pogs/PogsColorV1.js';
import { pogsPipeline } from '~/lib/pipeline/pogs.js';
import { bakeSubcommand, resolveBakeOptions, type BakeOptions } from '~/commands/bake/bake-command.js';

export function bakeColorCommand(app: WGData, atlasManager: AtlasManager): Command {
  return bakeSubcommand('color', 'Bake PogS colour icon set (DMG/FSR/VR/RLD labels, pre-rendered background v1)')
    .action(async (options: BakeOptions) => {
      await pogsPipeline(app, atlasManager, new PogsColorV1(), resolveBakeOptions(options));
    });
}
