import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { PNG } from 'pngjs';
import { MaxRectsPacker, type IRectangle } from 'maxrects-packer';
import { readTextureAtlas, type TextureRegion } from '~/lib/texture-atlas.js';

export interface PackOptions {
  padding?: number;
  maxWidth?: number;
}

export interface PackResult {
  pngBuffer: Buffer;
  xml: string;
  width: number;
  height: number;
  count: number;
  bins: number;
}

interface TextureRect extends IRectangle {
  name: string;
  png: PNG;
}

function copyRegion(src: PNG, region: TextureRegion): PNG {
  const out = new PNG({ width: region.width, height: region.height });
  for (let row = 0; row < region.height; row++) {
    const srcOffset = ((region.y + row) * src.width + region.x) * 4;
    const dstOffset = row * region.width * 4;
    src.data.copy(out.data, dstOffset, srcOffset, srcOffset + region.width * 4);
  }

  return out;
}

function buildXml(regions: Array<{ name: string; x: number; y: number; width: number; height: number }>): string {
  const entries = regions
    .map(
      (r) =>
        `  <SubTexture>\n` +
        `    <name> ${r.name} </name>\n` +
        `    <x> ${r.x} </x>\n` +
        `    <y> ${r.y} </y>\n` +
        `    <width> ${r.width} </width>\n` +
        `    <height> ${r.height} </height>\n` +
        `  </SubTexture>`,
    )
    .join('\n');

  return `<root>\n${entries}\n</root>\n`;
}

export class AtlasManager {
  async listNames(mapPath: string): Promise<string[]> {
    const regions = await readTextureAtlas(mapPath);

    return regions.map((r) => r.name).sort();
  }

  async pick(mapPath: string, imagePath: string, name: string): Promise<PNG | null> {
    const regions = await readTextureAtlas(mapPath);
    const region = regions.find((r) => r.name === name);
    if (!region) {
      return null;
    }

    const src = PNG.sync.read(await readFile(imagePath));

    return copyRegion(src, region);
  }

  async extractAll(mapPath: string, imagePath: string, destDir: string): Promise<number> {
    const regions = await readTextureAtlas(mapPath);
    const src = PNG.sync.read(await readFile(imagePath));
    await mkdir(destDir, { recursive: true });

    for (const region of regions) {
      const out = copyRegion(src, region);
      await writeFile(join(destDir, `${region.name}.png`), PNG.sync.write(out));
    }

    return regions.length;
  }

  async pack(srcDir: string, { padding = 0, maxWidth = 4096 }: PackOptions = {}): Promise<PackResult> {
    const files = (await readdir(srcDir))
      .filter((f) => extname(f).toLowerCase() === '.png')
      .sort();

    if (files.length === 0) {
      throw new Error(`No PNG files found in ${srcDir}`);
    }

    const entries: TextureRect[] = await Promise.all(
      files.map(async (file) => {
        const png = PNG.sync.read(await readFile(join(srcDir, file)));

        return { name: basename(file, '.png'), png, x: 0, y: 0, width: png.width, height: png.height };
      }),
    );

    const packer = new MaxRectsPacker<TextureRect>(maxWidth, 32768, padding, {
      smart: true,
      pot: false,
      square: false,
      allowRotation: false,
    });
    packer.addArray(entries);

    const bin = packer.bins[0];
    const out = new PNG({ width: bin.width, height: bin.height });
    out.data.fill(0);

    const regions: Array<{ name: string; x: number; y: number; width: number; height: number }> = [];

    for (const rect of bin.rects) {
      const { x, y, width, height, name, png } = rect as TextureRect;
      for (let row = 0; row < height; row++) {
        const srcOffset = row * width * 4;
        const dstOffset = ((y + row) * bin.width + x) * 4;
        png.data.copy(out.data, dstOffset, srcOffset, srcOffset + width * 4);
      }

      regions.push({ name, x, y, width, height });
    }

    regions.sort((a, b) => a.name.localeCompare(b.name));

    return {
      pngBuffer: PNG.sync.write(out),
      xml: buildXml(regions),
      width: bin.width,
      height: bin.height,
      count: entries.length,
      bins: packer.bins.length,
    };
  }
}
