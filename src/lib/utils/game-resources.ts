import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { unzip } from 'fflate';

const GUI_PKG_RE = /gui-part\d+\.pkg$/;

export const ICON_ATLAS_FILES = new Set([
  'gui/flash/atlases/battleAtlas.dds',
  'gui/flash/atlases/battleAtlas.xml',
  'gui/flash/atlases/vehicleMarkerAtlas.dds',
  'gui/flash/atlases/vehicleMarkerAtlas.xml',
]);

export interface ExtractIconAtlasesResult {
  pkgsFound: number;
  filesExtracted: number;
  skipped: boolean;
}

export async function extractIconAtlases(
  srcDir: string,
  outDir: string,
  onProgress?: (msg: string) => void,
): Promise<ExtractIconAtlasesResult> {
  await mkdir(outDir, { recursive: true });

  const expectedFiles = [...ICON_ATLAS_FILES].map((f) => join(outDir, basename(f)));
  const allPresent = await Promise.all(expectedFiles.map((f) => access(f).then(() => true, () => false)));
  if (allPresent.every(Boolean)) {
    return { pkgsFound: 0, filesExtracted: 0, skipped: true };
  }

  const entries = await readdir(srcDir, { recursive: true });
  const pkgFiles = entries
    .filter((e) => GUI_PKG_RE.test(e))
    .map((e) => join(srcDir, e));

  if (pkgFiles.length === 0) {
    throw new Error(`No gui-partN.pkg files found in: ${ srcDir }`);
  }

  let filesExtracted = 0;

  for (const pkgFile of pkgFiles) {
    onProgress?.(`Checking: ${ pkgFile }`);

    let data: Uint8Array;
    try {
      data = await readFile(pkgFile);
    } catch {
      onProgress?.(`  Warning: failed to read package file, skipping.`);
      continue;
    }

    const extracted = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      unzip(data, { filter: (file) => ICON_ATLAS_FILES.has(file.name) }, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });

    const names = Object.keys(extracted);
    if (names.length === 0) {
      onProgress?.(`  No target files.`);
      continue;
    }

    onProgress?.(`  Extracting ${ names.length } file(s): ${ names.join(' ') }`);
    await Promise.all(
      names.map((name) => writeFile(join(outDir, basename(name)), extracted[name])),
    );
    filesExtracted += names.length;
  }

  return { pkgsFound: pkgFiles.length, filesExtracted, skipped: false };
}
