import { access, copyFile, mkdir, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Vehicle } from '~/types.js';
import type { WGData } from '~/lib/WGData.js';
import type { AtlasManager } from '~/lib/AtlasManager.js';
import type { IconBuilder } from '~/lib/icons/pogs/icon-builder.js';
import type { ImageBaker } from '~/lib/icons/ImageBaker.js';
import { convertToPngFile } from '~/lib/utils/dds.js';
import { extractIconAtlases } from '~/lib/utils/game-resources.js';

const ATLAS_NAMES = [ 'battleAtlas', 'vehicleMarkerAtlas' ] as const;
const RENDER_CONCURRENCY = 5;
const STATS_BATCH_SIZE = 5;

export interface PipelineOptions {
  srcDir: string;
  outDir: string;
  buildDir: string;
  clean?: boolean;
  cleanAtlasDir?: boolean;
  gameDir?: string;
  prune?: boolean;
}

const REQUIRED_SRC_FILES = ATLAS_NAMES.flatMap((name) => [ `${ name }.dds`, `${ name }.xml` ]);

async function ensureAtlasAssets(srcDir: string, gameDir?: string): Promise<void> {
  const present = await Promise.all(REQUIRED_SRC_FILES.map((f) => pathExists(join(srcDir, f))));
  if (present.every(Boolean)) {
    return;
  }

  const missing = REQUIRED_SRC_FILES.filter((_, i) => !present[i]);
  if (!gameDir) {
    throw new Error(
      `Missing atlas files in ${ srcDir }: ${ missing.join(', ') }\nRun with --game-dir <wot-dir> to extract them automatically.`,
    );
  }

  console.log('Some source atlas files are missing — extracting from game directory...');
  await extractIconAtlases(gameDir, srcDir, (msg) => console.log(msg));
}

async function pathExists(p: string): Promise<boolean> {
  return access(p).then(() => true, () => false);
}

async function copyPngs(fromDir: string, toDir: string): Promise<void> {
  const entries = await readdir(fromDir);
  await Promise.all(
    entries
      .filter((e) => e.endsWith('.png'))
      .map((e) => copyFile(join(fromDir, e), join(toDir, e))),
  );
}

export async function cleanBuild(outDir: string): Promise<void> {
  await rm(join(outDir, '.build'), { recursive: true, force: true });
  await rm(join(outDir, 'res_mods'), { recursive: true, force: true });
  const entries = await readdir(outDir).catch(() => []);
  await Promise.all(
    entries
      .filter((e) => /\.(png|xml|dds)$/.test(e))
      .map((e) => unlink(join(outDir, e))),
  );
}

export async function decodeDds(srcDir: string): Promise<void> {
  for (const name of ATLAS_NAMES) {
    const ddsPath = join(srcDir, `${ name }.dds`);
    const pngPath = join(srcDir, `${ name }.png`);
    if ((await pathExists(ddsPath)) && !(await pathExists(pngPath))) {
      const out = await convertToPngFile(ddsPath);
      console.log(`Decoded → ${ out }`);
    }
  }
}

export async function extractAtlases(
  srcDir: string,
  buildDir: string,
  atlasManager: AtlasManager,
): Promise<void> {
  const atlasesDir = join(buildDir, 'atlases');
  await mkdir(atlasesDir, { recursive: true });

  for (const name of ATLAS_NAMES) {
    const destDir = join(atlasesDir, name);
    if (await pathExists(destDir)) {
      console.log(`skipping ${ name } extraction — ${ destDir } already exists`);
      continue;
    }

    const xmlPath = join(srcDir, `${ name }.xml`);
    const pngPath = join(srcDir, `${ name }.png`);
    const count = await atlasManager.extractAll(xmlPath, pngPath, destDir);
    console.log(`Extracted ${ count } textures → ${ destDir }`);
    await Promise.all([
      copyFile(pngPath, join(atlasesDir, `${ name }.png`)),
      copyFile(xmlPath, join(atlasesDir, `${ name }.xml`)),
    ]);
  }
}

export async function warmCache(app: WGData): Promise<{ vehiclesCount: number; profilesCount: number }> {
  console.log('warm up vehicle data cache');
  const vehicles = await app.getVehicles();
  console.log(`  ${ vehicles.length } vehicles`);

  console.log('warm up vehicle profile cache');
  let profilesCount = 0;
  for (let i = 0; i < vehicles.length; i += STATS_BATCH_SIZE) {
    const batch = vehicles.slice(i, i + STATS_BATCH_SIZE);
    await Promise.all(
      batch.map(async (v) => {
        try {
          await app.getStatsForBestConfig(v.tank_id);
          profilesCount++;
        } catch {
          // skip vehicles with no profile
        }
      }),
    );
  }

  console.log(`  ${ profilesCount } profiles`);

  return { vehiclesCount: vehicles.length, profilesCount };
}

async function renderOneToFile(vehicle: Vehicle, baker: ImageBaker, outDir: string): Promise<void> {
  const outPath = join(outDir, `${ vehicle.nation }-${ vehicle.tag }.png`);
  const info = await (await baker.bake(vehicle)).png().toFile(outPath);
  console.log(`${ outPath } — ${ info.width }×${ info.height }px`);
}

export async function renderIcons(
  app: WGData,
  builder: IconBuilder,
  buildDir: string,
  vehiclesCount: number,
): Promise<void> {
  const iconsDir = join(buildDir, 'icons');
  const existing = await readdir(iconsDir).catch(() => []);
  const pngCount = existing.filter((e) => e.endsWith('.png')).length;

  if (pngCount >= vehiclesCount) {
    console.log(`skipping icons render — ${ iconsDir } already has ${ pngCount } icons`);

    return;
  }

  console.log('generating icons');
  await mkdir(iconsDir, { recursive: true });
  const vehicles = await app.getVehicles();
  const bakers = Array.from({ length: RENDER_CONCURRENCY }, () => builder.createBaker(app));
  let idx = 0;

  await Promise.all(
    bakers.map(async (baker) => {
      while (idx < vehicles.length) {
        const vehicle = vehicles[idx++];
        await renderOneToFile(vehicle, baker, iconsDir);
      }
    }),
  );
}

export async function overlayIcons(buildDir: string): Promise<void> {
  console.log('overlaying generated icons into atlas directories');
  const iconsDir = join(buildDir, 'icons');
  for (const name of ATLAS_NAMES) {
    await copyPngs(iconsDir, join(buildDir, 'atlases', name));
  }
}

const SUFFIX_RE = /_(7x7|bob|IGR)\.png$/;
const SUFFIX_EXCLUDED = new Set([ 'battleLoadingFormBgTips.png', 'battleLoadingFormBgTips_7x7.png' ]);

export async function replaceSuffixed(buildDir: string): Promise<void> {
  console.log('replacing suffixed variants in atlas with base icons');
  const iconsDir = join(buildDir, 'icons');

  for (const name of ATLAS_NAMES) {
    const atlasDir = join(buildDir, 'atlases', name);
    const entries = await readdir(atlasDir);

    for (const filename of entries) {
      if (!SUFFIX_RE.test(filename) || SUFFIX_EXCLUDED.has(filename)) {
        continue;
      }

      const base = filename.replace(SUFFIX_RE, '.png');
      if (SUFFIX_EXCLUDED.has(base)) {
        continue;
      }

      const basePath = join(atlasDir, base);
      if (!(await pathExists(basePath))) {
        continue;
      }

      await copyFile(basePath, join(atlasDir, filename));
      await copyFile(basePath, join(iconsDir, filename));
    }
  }
}

export async function packAtlases(
  outDir: string,
  buildDir: string,
  atlasManager: AtlasManager,
): Promise<void> {
  const atlasesOutDir = join(outDir, 'res_mods', 'version', 'gui', 'flash', 'atlases');
  await mkdir(atlasesOutDir, { recursive: true });

  for (const name of ATLAS_NAMES) {
    const result = await atlasManager.pack(join(buildDir, 'atlases', name));
    if (result.bins > 1) {
      console.warn(`Warning: ${ name } textures span ${ result.bins } bins — only the first will be written`);
    }

    const pngPath = join(atlasesOutDir, `${ name }.png`);
    await writeFile(pngPath, result.pngBuffer);
    await writeFile(join(atlasesOutDir, `${ name }.xml`), result.xml);
    await rename(pngPath, join(atlasesOutDir, `${ name }.dds`));
    console.log(`Packed ${ result.count } textures → ${ name }.dds (${ result.width }×${ result.height })`);
  }
}

export async function copyContour(outDir: string, buildDir: string): Promise<void> {
  const contourDir = join(outDir, 'res_mods', 'version', 'gui', 'flash', 'maps', 'icons', 'vehicle', 'contour');
  await mkdir(contourDir, { recursive: true });
  await copyPngs(join(buildDir, 'icons'), contourDir);
}

export async function pogsPipeline(
  app: WGData,
  atlasManager: AtlasManager,
  builder: IconBuilder,
  options: PipelineOptions,
): Promise<void> {
  const { srcDir, outDir, buildDir, clean, cleanAtlasDir, gameDir, prune } = options;

  if (clean) {
    await cleanBuild(outDir);
    if (cleanAtlasDir) {
      await rm(srcDir, { recursive: true, force: true });
    }
  }

  await ensureAtlasAssets(srcDir, gameDir);

  await decodeDds(srcDir);
  await extractAtlases(srcDir, buildDir, atlasManager);
  const { vehiclesCount } = await warmCache(app);
  await renderIcons(app, builder, buildDir, vehiclesCount);
  await overlayIcons(buildDir);
  await replaceSuffixed(buildDir);
  await packAtlases(outDir, buildDir, atlasManager);
  await copyContour(outDir, buildDir);

  if (prune) {
    await rm(buildDir, { recursive: true, force: true });
  }
}
