import { Command } from 'commander';
import { mkdir, access, writeFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { WGApiError } from '../lib/api.js';
import { getVehicles } from './list-vehicles.js';

function getIconsDir(): string {
  const cacheDir = process.env.WG_CACHE_DIR ?? '.data/cache';

  return join(dirname(cacheDir), 'contour-icons');
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

async function downloadIcon(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(dest, buffer);
}

export function fetchIconsCommand(): Command {
  return new Command('fetch-icons')
    .description('Download contour icons for all vehicles into .data/contour-icons/')
    .option('--force', 're-download icons that already exist locally')
    .option('--concurrency <n>', 'parallel downloads', '10')
    .action(async (options) => {
      try {
        const vehicles = await getVehicles();

        const iconsDir = getIconsDir();
        await mkdir(iconsDir, { recursive: true });

        const concurrency = Math.max(1, parseInt(options.concurrency, 10) || 10);
        const all = Object.values(vehicles);
        let downloaded = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < all.length; i += concurrency) {
          const batch = all.slice(i, i + concurrency);
          await Promise.all(
            batch.map(async (vehicle) => {
              const url = vehicle.images?.contour_icon;
              if (!url) {
                skipped++;

                return;
              }

              const dest = join(iconsDir, basename(url));

              if (!options.force && (await fileExists(dest))) {
                skipped++;

                return;
              }

              try {
                await downloadIcon(url, dest);
                downloaded++;
                console.error(`↓ ${basename(url)}`);
              } catch (err) {
                failed++;
                console.error(`✗ ${basename(url)}: ${err instanceof Error ? err.message : err}`);
              }
            }),
          );
        }

        console.error(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
      } catch (error) {
        if (error instanceof WGApiError) {
          console.error(`API error [${error.code}] ${error.field}: ${error.message}`);
        } else {
          console.error('Error:', error instanceof Error ? error.message : error);
        }

        process.exit(1);
      }
    });
}
