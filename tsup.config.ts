import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  // copy .json5 font files alongside the bundle so new URL(..., import.meta.url) resolves correctly
  loader: { '.json5': 'file' },
});