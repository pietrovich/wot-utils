import { readFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';
import JSON5 from 'json5';
import type { Plugin } from 'esbuild';

// Parses JSON5 files at build time and inlines them as plain JS objects,
// eliminating runtime readFileSync calls for font definitions and dict data.
const json5Plugin: Plugin = {
  name: 'json5',
  setup(build) {
    build.onLoad({ filter: /\.json5$/ }, async (args) => {
      const text = await readFile(args.path, 'utf8');

      const data = JSON5.parse(text);

      return {
        contents: `export default ${JSON.stringify(data)}`,
        loader: 'js',
      };
    });
  },
};

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  esbuildPlugins: [json5Plugin],
});
