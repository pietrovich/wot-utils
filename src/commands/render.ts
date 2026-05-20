import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { PixelFont } from '../lib/pixel-font.js';
import { fonts } from '../lib/fonts/index.js';
import { encodePng } from '../lib/png.js';

const DEFAULT_SAMPLE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHAR_GAP = 1;
const PADDING = 2;

export function renderCommand(): Command {
  return new Command('render')
    .description('Render a font sample as a PNG image in CWD')
    .argument('[font]', `font name (${Object.keys(fonts).join(', ')})`)
    .argument('[text]', 'text to render', DEFAULT_SAMPLE)
    .action(async (fontName: string | undefined, text: string) => {
      if (!fontName) {
        console.log(Object.keys(fonts).join('\n'));
        return;
      }

      const fontDef = fonts[fontName];
      if (!fontDef) {
        console.error(`Unknown font: ${fontName}. Available: ${Object.keys(fonts).join(', ')}`);
        process.exit(1);
      }

      const pf = new PixelFont(fontDef);
      const chars = [...text];
      const charPixels = chars.map((ch) => pf.getPixels(ch));

      const glyphH = Math.max(...charPixels.map((p) => p?.length ?? 0));
      const charWidths = charPixels.map((p) => p?.[0]?.length ?? 0);
      const totalW = PADDING * 2 + charWidths.reduce((s, w) => s + w, 0) + CHAR_GAP * (chars.length - 1);
      const totalH = PADDING * 2 + glyphH;

      // RGB buffer, filled white
      const buf = Buffer.alloc(totalW * totalH * 3, 0xff);

      let x = PADDING;
      for (let ci = 0; ci < chars.length; ci++) {
        const pixels = charPixels[ci];
        if (pixels) {
          for (let row = 0; row < pixels.length; row++) {
            const y = PADDING + row;
            for (let col = 0; col < pixels[row].length; col++) {
              const alpha = pixels[row][col]; // 0x00–0xFF from PixelFont
              const grey = 255 - alpha; // composite over white
              const off = (y * totalW + (x + col)) * 3;
              buf[off] = grey;
              buf[off + 1] = grey;
              buf[off + 2] = grey;
            }
          }
        }
        x += charWidths[ci] + CHAR_GAP;
      }

      const png = encodePng(totalW, totalH, buf);
      const outPath = `${fontName}.png`;
      await writeFile(outPath, png);
      console.log(`${outPath} — ${chars.length} chars, ${totalW}×${totalH}px`);
    });
}
