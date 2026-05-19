import { readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

export interface TextureRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const parser = new XMLParser();

export async function readTextureAtlas(xmlPath: string): Promise<TextureRegion[]> {
  const xml = await readFile(xmlPath, 'utf-8');
  const doc = parser.parse(xml) as { root?: { SubTexture?: unknown[] | unknown } };
  const raw = doc.root?.SubTexture;
  if (!raw) {
    return [];
  }

  const entries = Array.isArray(raw) ? raw : [raw];
  const regions: TextureRegion[] = [];

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name.trim() : null;
    const x = Number(e.x);
    const y = Number(e.y);
    const width = Number(e.width);
    const height = Number(e.height);

    if (name && !isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
      regions.push({ name, x, y, width, height });
    }
  }

  return regions;
}
