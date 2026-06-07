import { type NormalizedGlyph, type PixelKind, normalizeGlyph } from '~/lib/fonts/glyph.js';

export interface FontDefinition {
  glyphs: Record<string, string[]>;
}

export interface GlyphPixels {
  width: number;
  height: number;
  alpha: number[][];
}

const PIXEL_KIND_ALPHA: Record<PixelKind, number> = {
  empty: 0x00,
  quarter: 0x40,
  half: 0x80,
  'three-quarter': 0xbf,
  full: 0xff,
};

export class PixelFont {
  private readonly glyphMap: Map<string, NormalizedGlyph>;
  private readonly pixelCache = new Map<string, GlyphPixels | null>();

  constructor(font: FontDefinition) {
    this.glyphMap = new Map(
      Object
        .entries(font.glyphs)
        .map(([ch, rows]) => {
          return [ch, normalizeGlyph(rows, ch === ' ')]
        })
    );
  }

  getPixels(char: string): GlyphPixels | null {
    let result = this.pixelCache.get(char);

    if (result === undefined) {
      const glyph = this.glyphMap.get(char) ?? null;
      result =
        glyph === null
          ? null
          : { width: glyph.width, height: glyph.height, alpha: glyph.rows.map((row) => row.map((k) => PIXEL_KIND_ALPHA[k])) };
      this.pixelCache.set(char, result);
    }

    return result;
  }
}
