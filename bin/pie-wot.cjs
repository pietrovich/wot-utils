#!/usr/bin/env node
'use strict';
const { spawnSync } = require('node:child_process');
const { resolve, dirname } = require('node:path');

const entry = resolve(dirname(__filename), '../src/index.ts');
const tsx   = resolve(dirname(__filename), '../node_modules/.bin/tsx');

const result = spawnSync(tsx, [entry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);
