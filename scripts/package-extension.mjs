#!/usr/bin/env node
/**
 * Builds `dist/<name>-<version>.zip`, the archive the Chrome Web Store accepts.
 *
 * Only the files the extension actually loads are included — no tests, no
 * scripts, no VCS metadata — because the store rejects archives carrying
 * development cruft.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Everything the packed extension needs, and nothing else. */
const INCLUDED = ['manifest.json', 'icons', 'src', 'LICENSE'];

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));

// The archive is named from package.json rather than the manifest's display
// name: the display name is marketing copy that can change, while the package
// name is the stable repository identifier every doc and release refers to.
const { name: slug } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const archive = join(root, 'dist', `${slug}-${manifest.version}.zip`);

// Check before touching the previous archive: zip can succeed while omitting inputs.
for (const path of INCLUDED) {
  let stats;
  try { stats = statSync(join(root, path)); } catch { throw new Error(`Missing required package input: ${path}`); }
  if ((path === 'src' || path === 'icons') ? !stats.isDirectory() : !stats.isFile()) {
    throw new Error(`Invalid required package input: ${path}`);
  }
}
execFileSync(process.execPath, [join(root, 'scripts/validate-manifest.mjs')], { stdio: 'inherit' });
mkdirSync(join(root, 'dist'), { recursive: true });
const temporary = mkdtempSync(join(root, 'dist', '.package-'));
try {
  const candidate = join(temporary, 'extension.zip');
  execFileSync('zip', ['-r', '-q', '-X', candidate, ...INCLUDED, '-x', '*.DS_Store'], {
    cwd: root,
    stdio: 'inherit',
  });
  renameSync(candidate, archive);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log(`Packaged ${archive}`);
