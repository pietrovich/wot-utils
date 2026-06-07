// sharp.composite() has no opacity option — it is not part of OverlayOptions and has never
// been added to the library. The only way to control the transparency of a composite layer
// is to manipulate the alpha channel of the input buffer directly before passing it in.
export function applyAlpha(buffer: Buffer, opacity: number): Buffer {
  const out = Buffer.from(buffer);
  for (let i = 3; i < out.length; i += 4) {
    out[i] = Math.round(out[i] * opacity);
  }

  return out;
}

// Multiplies RGB channels by `factor` (0–1), leaving alpha unchanged.
// Matches the PogsIconSet darkenImg behaviour: factor=0.2 reduces each channel to 20%,
// producing a near-black silhouette that composites cleanly over the gradient backgrounds.
// Pure-black pixels (R=G=B=0) are left untouched, as in the original implementation.
export function darkenIcon(buffer: Buffer, factor: number): Buffer {
  const out = Buffer.from(buffer);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i] === 0 && out[i + 1] === 0 && out[i + 2] === 0) {
      continue;
    }

    out[i] = Math.round(out[i] * factor);
    out[i + 1] = Math.round(out[i + 1] * factor);
    out[i + 2] = Math.round(out[i + 2] * factor);
  }

  return out;
}

// Converts an RGBA buffer to a light-gray silhouette suitable for multiply blending.
// Under multiply, lighter pixels leave the background unchanged while darker pixels darken it,
// so inverting the icon's luminance turns its dark areas into the "shadow" of the tank shape.
export function lightenBuffer(buffer: Buffer): Buffer {
  const out = Buffer.from(buffer);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] > 0) {
      const lum = Math.round(0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2]);
      const light = 255 - lum;
      out[i] = light;
      out[i + 1] = light;
      out[i + 2] = light;
    }
  }

  return out;
}
