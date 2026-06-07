import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

export default defineConfig({
  entry: { index: 'src/index.ts' },
  define: { __PKG_VERSION__: JSON.stringify(version) },
  esbuildOptions(options) {
    options.dropLabels = ['DEV_ONLY'];
  },
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  async onSuccess() {
    const { cp } = await import('node:fs/promises');
    await cp('assets', 'dist/assets', { recursive: true });
  },
});
