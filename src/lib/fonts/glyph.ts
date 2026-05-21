export type PixelKind = 'empty' | 'quarter' | 'half' | 'three-quarter' | 'full';

export interface NormalizedGlyph {
  width: number;
  height: number;
  rows: PixelKind[][];
}

// Decoding palette (input → kind). More permissive than encoding:
//   ' '            → empty       (transparent)
//   '-'            → quarter     (25%)
//   '+'            → half        (50%)
//   '*' or '='     → three-quarter (75%)
//   '#' or [a-zA-Z] → full        (100%)
// Anything else also becomes 'empty'.
export function charToPixel(ch: string): PixelKind {
  const c = ch.toLowerCase().trim();
  switch (c) {
    case '-':
      return 'quarter';
    case '+':
      return 'half';
    case '*':
    case '=':
      return 'three-quarter';
  }

  if (c === '#' || /^[a-z]$/.test(c)) {
    return 'full';
  }

  return 'empty';
}

export function normalizeGlyph(rawRows: readonly string[], noTrim = false): NormalizedGlyph {
  const trimmed = noTrim
    ? rawRows
    : rawRows.map((row) => row.replace(/\s+$/u, ''));
  const width = trimmed.reduce((max, row) => Math.max(max, row.length), 0);
  const rows = trimmed.map((row) => {
    const padded = row.padEnd(width, ' ');

    return Array.from(padded, charToPixel);
  });

  return { width, height: rows.length, rows };
}

// Canonical encoding palette (kind → char). Always emits these characters,
// even though charToPixel accepts more aliases (e.g. '*' is decoded but never emitted).
export function pixelToChar(p: PixelKind): string {
  switch (p) {
    case 'full':
      return 'X';
    case 'three-quarter':
      return '=';
    case 'half':
      return '+';
    case 'quarter':
      return '-';
    case 'empty':
      return ' ';
  }
}

export function rowsToStrings(
  rows: readonly (readonly PixelKind[])[],
): string[] {
  return rows.map((row) => row.map(pixelToChar).join(''));
}
