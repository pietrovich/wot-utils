import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { DDSUtils } from '../../src/lib/utex-mod/DDSUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DDS = resolve(__dirname, 'sample.dds');

// Round-trip: decode sample.dds → encode back to DDS → decode again.
// The two RGBA buffers should be pixel-identical since the same codec
// (BC3/DXT5) is used both times and the intermediate is a lossless
// re-encoding of already-quantised data.

describe('UtexDDS integration', () => {
  it('decodes sample.dds to an RGBA buffer with correct dimensions', () => {
    const file = readFileSync(SAMPLE_DDS);
    const dds = new DDSUtils();
    const frames = dds.decode(file);

    expect(frames).toHaveLength(1);
    const { width, height, image } = frames[0];
    expect(width).toBe(80);
    expect(height).toBe(24);
    expect(image.byteLength).toBe(80 * 24 * 4);
  });

  it('round-trips through encode → decode with identical pixel output', () => {
    const file = readFileSync(SAMPLE_DDS);
    const dds = new DDSUtils();

    // Step 1: decode original DDS → RGBA
    const [{ width, height, image: originalRgba }] = dds.decode(file);

    // Step 2: encode RGBA → DDS (forces alpha path since sample is DXT5)
    const intermediate = dds.encode(originalRgba, width, height, true);

    // Step 3: decode intermediate DDS → RGBA
    const [{ image: roundTrippedRgba }] = dds.decode(Buffer.from(intermediate));

    const original = new Uint8Array(originalRgba);
    const result   = new Uint8Array(roundTrippedRgba);

    expect(result.length).toBe(original.length);

    // Pixel-by-pixel comparison — should be exact since both encode/decode
    // passes use the same BC3 codec on already-quantised data.
    let diffCount = 0;
    let maxDiff = 0;
    for (let i = 0; i < original.length; i++) {
      const diff = Math.abs(original[i] - result[i]);
      if (diff > 0) {diffCount++;}

      if (diff > maxDiff) {maxDiff = diff;}
    }

    // Report exact diff counts to make failures easy to diagnose
    expect(diffCount, `${diffCount} bytes differ (max delta: ${maxDiff})`).toBe(0);
  });
});
