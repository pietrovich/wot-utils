import { Command } from 'commander';
import sharp from 'sharp';
import { fonts } from '~/lib/fonts/index.js';
import { renderText } from '~/lib/render-text.js';

const DEFAULT_SAMPLE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
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

      if (!fonts[fontName]) {
        console.error(`Unknown font: ${fontName}. Available: ${Object.keys(fonts).join(', ')}`);
        process.exit(1);
      }

      const { data: textData, width: textW, height: textH } = renderText(fontName, text);
      const totalW = PADDING * 2 + textW;
      const totalH = PADDING * 2 + textH;

      // RGB buffer, filled white
      const buf = Buffer.alloc(totalW * totalH * 3, 0xff);

      // Composite dark text onto white canvas using alpha from rendered text
      for (let row = 0; row < textH; row++) {
        for (let col = 0; col < textW; col++) {
          const alpha = textData[(row * textW + col) * 4 + 3];
          if (alpha === 0) {
            continue;
          }

          const grey = 255 - alpha;
          const off = ((PADDING + row) * totalW + (PADDING + col)) * 3;
          buf[off] = grey;
          buf[off + 1] = grey;
          buf[off + 2] = grey;
        }
      }

      const outPath = `${fontName}.png`;
      await sharp(buf, { raw: { width: totalW, height: totalH, channels: 3 } })
        .png()
        .toFile(outPath);
      console.log(`${outPath} — ${[...text].length} chars, ${totalW}×${totalH}px`);
    });
}
