#!/usr/bin/env node
'use strict';
const { spawnSync } = require('node:child_process');
const { resolve, dirname } = require('node:path');

const root  = resolve(dirname(__filename), '..');
const entry = resolve(root, 'src/index.ts');
const tsx   = resolve(root, 'node_modules/.bin/tsx');

const result = spawnSync(tsx, [entry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});

process.exit(result.status ?? 0);
