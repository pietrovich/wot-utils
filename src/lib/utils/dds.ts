import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname, basename } from 'node:path';
import { PNG } from 'pngjs';
import { DDSUtils } from '~/lib/utex-mod/DDSUtils.js';

export async function convertToPngFile(file: string, pngFileName?: string): Promise<string> {
  const buffer = await readFile(file);
  const frames = new DDSUtils().decode(buffer.buffer as ArrayBuffer);

  if (frames.length === 0) {
    throw new Error('No frames decoded from DDS file');
  }

  const frame = frames[0];
  const png = new PNG({ width: frame.width, height: frame.height });
  png.data = Buffer.from(frame.image);

  const outName = pngFileName ?? basename(file, extname(file)) + '.png';
  const outPath = join(dirname(file), outName);

  await writeFile(outPath, PNG.sync.write(png));
  return outPath;
}
