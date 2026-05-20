import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import { bgColors } from '~/lib/icons/background-colors.js';

const WIDTH = 80;
const SHIELD_PATH = fileURLToPath(new URL('../../../assets/pogs/sheild.png', import.meta.url));

function buildOverlayBar1(): { input: Buffer; raw: sharp.Raw; top: number; left: number } {
  const width = 80;
  const height = 10;
  const fadeWidth = 10;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const t = y / (height - 1); // 0 at top, 1 at bottom
    const c = Math.round(255 * (1 - t)); // white → black
    const baseAlpha = Math.round((0.3 + 0.4 * t) * 255); // 30% → 70% opaque

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

function buildOverlayBar2(): { input: Buffer; raw: sharp.Raw; top: number; left: number } {
  const width = 60;
  const height = 10;
  const fadeWidth = 10;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    // flat 40% opaque black base; top and bottom rows act as borders
    const isBorderTop    = y === 0;
    const isBorderBottom = y === height - 1;
    const r = isBorderTop ? 255 : 0;
    const g = isBorderTop ? 255 : 0;
    const b = isBorderTop ? 255 : 0;
    const baseAlpha = isBorderTop
      ? Math.round(0.30 * 255)  // top border: white 30% opaque
      : isBorderBottom
        ? Math.round(0.60 * 255)  // bottom border: black 60% opaque
        : Math.round(0.40 * 255); // body: black 40% opaque

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

function buildOverlayBar(): { input: Buffer; raw: sharp.Raw; top: number; left: number } {
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
        ? Math.round(0.10 * 255)  // top/left border: white 10% opaque
        : isBorderBottom
          ? Math.round(0.60 * 255)  // bottom border: black 60% opaque
          : Math.round(0.40 * 255); // body: black 40% opaque

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

export function dumpBackgroundCommand(): Command {
  return new Command('dump-background')
    .description('Write a composited tank-type icon background (gradient + shield) for each type to cwd')
    .action(async () => {
      for (const [type, rows] of Object.entries(bgColors)) {
        const gradientBuf = buildGradientBuffer(rows);

        const outPath = join(process.cwd(), `${type.toLowerCase()}.png`);
        await sharp(gradientBuf)
          .composite([
            buildOverlayBar(),
            { input: SHIELD_PATH, top: 0, left: 0 },
          ])
          .png()
          .toFile(outPath);

        console.log(`Written ${outPath}`);
      }
    });
}
