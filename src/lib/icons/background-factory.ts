import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import { bgColors } from './background-colors.js';

const WIDTH = 80;
const SHIELD_PATH = fileURLToPath(new URL('../../../assets/pogs/sheild.png', import.meta.url));

type CompositeInput = { input: Buffer; raw: sharp.Raw; top: number; left: number };

// — Experimental overlay generators, kept for reference ————————————————————

function buildOverlayBar1(): CompositeInput {
  const width = 80;
  const height = 10;
  const fadeWidth = 10;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const c = Math.round(255 * (1 - t));
    const baseAlpha = Math.round((0.3 + 0.4 * t) * 255);

    for (let x = 0; x < width; x++) {
      const distFromRight = width - 1 - x;
      const fadeFactor = distFromRight < fadeWidth ? distFromRight / fadeWidth : 1.0;
      const i = (y * width + x) * 4;
      pixels[i]     = c;
      pixels[i + 1] = c;
      pixels[i + 2] = c;
      pixels[i + 3] = Math.round(baseAlpha * fadeFactor);
    }
  }

  return { input: pixels, raw: { width, height, channels: 4 }, top: 0, left: 0 };
}

function buildOverlayBar2(): CompositeInput {
  const width = 60;
  const height = 10;
  const fadeWidth = 10;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const isBorderTop    = y === 0;
    const isBorderBottom = y === height - 1;
    const r = isBorderTop ? 255 : 0;
    const g = isBorderTop ? 255 : 0;
    const b = isBorderTop ? 255 : 0;
    const baseAlpha = isBorderTop
      ? Math.round(0.30 * 255)
      : isBorderBottom
        ? Math.round(0.60 * 255)
        : Math.round(0.40 * 255);

    for (let x = 0; x < width; x++) {
      const distFromRight = width - 1 - x;
      const fadeFactor = distFromRight < fadeWidth ? distFromRight / fadeWidth : 1.0;
      const i = (y * width + x) * 4;
      pixels[i]     = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = Math.round(baseAlpha * fadeFactor);
    }
  }

  return { input: pixels, raw: { width, height, channels: 4 }, top: 0, left: 17 };
}

// — Active overlay generator ————————————————————————————————————————————————

function buildOverlayBar(): CompositeInput {
  const width = 60;
  const height = 10;
  const fadeWidth = 10;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const isBorderTop    = y === 0;
    const isBorderBottom = y === height - 1;

    for (let x = 0; x < width; x++) {
      const isBorderLeft = x === 0;
      const isWhite = isBorderTop || isBorderLeft;
      const px = isWhite ? 255 : 0;
      const baseAlpha = isBorderTop || isBorderLeft
        ? Math.round(0.10 * 255)
        : isBorderBottom
          ? Math.round(0.60 * 255)
          : Math.round(0.40 * 255);

      const distFromRight = width - 1 - x;
      const fadeFactor = distFromRight < fadeWidth ? distFromRight / fadeWidth : 1.0;

      const i = (y * width + x) * 4;
      pixels[i]     = px;
      pixels[i + 1] = px;
      pixels[i + 2] = px;
      pixels[i + 3] = Math.round(baseAlpha * fadeFactor);
    }
  }

  return { input: pixels, raw: { width, height, channels: 4 }, top: 0, left: 17 };
}

// ——————————————————————————————————————————————————————————————————————————

function buildGradientBuffer(rows: [number, number, number][]): Buffer {
  const png = new PNG({ width: WIDTH, height: rows.length });

  for (let y = 0; y < rows.length; y++) {
    const [r, g, b] = rows[y];
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      png.data[i]     = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }

  return PNG.sync.write(png);
}

export class BackgroundFactory {
  private cachedOverlayBar: CompositeInput | null = null;

  private getOverlayBar(): CompositeInput {
    if (!this.cachedOverlayBar) {
      this.cachedOverlayBar = buildOverlayBar();
    }

    return this.cachedOverlayBar;
  }

  async generate(type: string): Promise<Buffer> {
    const rows = bgColors[type];
    if (!rows) {
      throw new Error(`Unknown tank type: "${type}"`);
    }

    const gradientBuf = buildGradientBuffer(rows);

    return sharp(gradientBuf)
      .composite([this.getOverlayBar(), { input: SHIELD_PATH, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  static types(): string[] {
    return Object.keys(bgColors);
  }
}

// suppress "declared but never read" on kept experimental generators
void buildOverlayBar1;
void buildOverlayBar2;
