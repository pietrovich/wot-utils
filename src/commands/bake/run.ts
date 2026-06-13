import { Command } from 'commander';
import type { WGData } from '~/lib/WGData.js';
import type { AtlasManager } from '~/lib/AtlasManager.js';
import { bakeAllCommand } from '~/commands/bake/all.js';
import { bakeClearCommand } from '~/commands/bake/clear.js';
import { bakeColorCommand } from '~/commands/bake/color.js';

export function bakeCommand(app: WGData, atlasManager: AtlasManager): Command {
  const bake = new Command('bake').description('Bake PogS icon sets');
  bake.addCommand(bakeAllCommand(app, atlasManager));
  bake.addCommand(bakeClearCommand(app, atlasManager));
  bake.addCommand(bakeColorCommand(app, atlasManager));

  return bake;
}
