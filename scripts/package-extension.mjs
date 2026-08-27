#!/usr/bin/env node
/**
 * Builds `dist/<name>-<version>.zip`, the archive the Chrome Web Store accepts.
 *
 * Only the files the extension actually loads are included — no tests, no
 * scripts, no VCS metadata — because the store rejects archives carrying
 * development cruft.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Everything the packed extension needs, and nothing else. */
const INCLUDED = ['manifest.json', 'icons', 'src', 'LICENSE'];

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const slug = manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const archive = join(root, 'dist', `${slug}-${manifest.version}.zip`);

mkdirSync(join(root, 'dist'), { recursive: true });
rmSync(archive, { force: true });

execFileSync('zip', ['-r', '-q', '-X', archive, ...INCLUDED, '-x', '*.DS_Store'], {
  cwd: root,
  stdio: 'inherit',
});

console.log(`Packaged ${archive}`);
