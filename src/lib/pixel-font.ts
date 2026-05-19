export type Font = Record<string, string[]>;

const ALPHA: Record<string, number> = {
  ' ': 0x00,
  '-': 0x40,  // 25%
  '+': 0xBF,  // 75%
  'X': 0xFF,
};

export class PixelFont {
  private readonly pixelCache = new Map<string, number[][] | null>();

  constructor(private readonly font: Font) {}

  getChar(char: string): string[] | null {
    return this.font[char] ?? null;
  }

  getPixels(char: string): number[][] | null {
    if (this.pixelCache.has(char)) {
      return this.pixelCache.get(char)!;
    }
    const rows = this.getChar(char);
    const pixels = rows === null ? null : rows.map((row) => [...row].map((c) => ALPHA[c] ?? 0x00));
    this.pixelCache.set(char, pixels);
    return pixels;
  }
}
