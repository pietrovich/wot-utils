import sharp from 'sharp';
import { PixelFont, type GlyphPixels } from '~/lib/PixelFont.js';
import { Colors, type ColorValue } from '~/lib/colors.js';
import { fonts } from '~/lib/fonts/index.js';

const CHAR_GAP = 1;

export interface RenderedText {
  data: Buffer; // RGBA: colored text on transparent background
  width: number;
  height: number;
}

type PreparedGlyphs = { chars: string[]; charPixels: (GlyphPixels | null)[]; charWidths: number[]; width: number; height: number };

const prepareGlyphsCache = new Map<string, PreparedGlyphs>();

function prepareGlyphs(fontName: string, text: unknown): PreparedGlyphs {
  const str = String(text);
  const key = `${fontName}:${str}`;
  let result = prepareGlyphsCache.get(key);

  if (result === undefined) {
    const fontDef = fonts[fontName];
    if (!fontDef) {
      throw new Error(`Unknown font: "${fontName}". Available: ${Object.keys(fonts).join(', ')}`);
    }

    const pf = new PixelFont(fontDef);
    const chars = [...str];
    const charPixels = chars.map((ch) => pf.getPixels(ch));
    const charWidths = charPixels.map((p) => p?.width ?? 0);
    const width = charWidths.reduce((s, w) => s + w, 0) + CHAR_GAP * Math.max(0, chars.length - 1);
    const height = chars.length > 0 ? Math.max(...charPixels.map((p) => p?.height ?? 0)) : 0;

    result = { chars, charPixels, charWidths, width, height };
    prepareGlyphsCache.set(key, result);
  }

  return result;
}

export function getTextBox(fontName: string, text: unknown): { width: number; height: number } {
  const { width, height } = prepareGlyphs(fontName, text);

  return { width, height };
}

export function renderText(fontName: string, text: unknown, color: ColorValue = Colors.white): RenderedText {
  const { chars, charPixels, charWidths, width, height } = prepareGlyphs(fontName, text);

  const cr = (color >>> 24) & 0xff;
  const cg = (color >>> 16) & 0xff;
  const cb = (color >>> 8) & 0xff;
  const ca = color & 0xff;

  const data = Buffer.alloc(width * height * 4, 0);

  let x = 0;
  for (let ci = 0; ci < chars.length; ci++) {
    const pixels = charPixels[ci];
    if (pixels) {
      for (let row = 0; row < pixels.alpha.length; row++) {
        for (let col = 0; col < pixels.alpha[row].length; col++) {
          const alpha = pixels.alpha[row][col];
          if (alpha === 0) {
            continue;
          }

          const off = (row * width + (x + col)) * 4;
          data[off] = cr;
          data[off + 1] = cg;
          data[off + 2] = cb;
          data[off + 3] = Math.round((alpha / 255) * ca);
        }
      }
    }

    x += charWidths[ci] + CHAR_GAP;
  }

  return { data, width, height };
}

export async function renderWithShadow(
  fontName: string,
  text: unknown,
  color: ColorValue = Colors.white,
  shadowColor: ColorValue = Colors.black,
  distance = 1,
): Promise<RenderedText> {
  const main = renderText(fontName, text, color);
  const shadow = renderText(fontName, text, shadowColor);

  const width = main.width + distance;
  const height = main.height + distance;
  const base = Buffer.alloc(width * height * 4, 0);

  const { data } = await sharp(base, { raw: { width, height, channels: 4 } })
    .composite([
      { input: shadow.data, raw: { width: shadow.width, height: shadow.height, channels: 4 }, left: distance, top: distance },
      { input: main.data, raw: { width: main.width, height: main.height, channels: 4 }, left: 0, top: 0 },
    ])
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, width, height };
}
