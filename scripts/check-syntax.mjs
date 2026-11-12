#!/usr/bin/env node
/** Syntax-check every maintained JavaScript file without installing a linter. */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) check(path);
    else if (/\.(?:js|mjs)$/.test(entry.name)) {
      execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    }
  }
}
for (const directory of ['src', 'scripts', 'test']) check(join(root, directory));
console.log('JavaScript syntax OK — src/, scripts/, test/.');
