import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
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
