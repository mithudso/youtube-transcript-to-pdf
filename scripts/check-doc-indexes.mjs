#!/usr/bin/env node
/**
 * Path-validates the documentation retrieval indexes.
 *
 * Both `docs/high_signal_file_index.json` and `docs/codebase-overview.md` list
 * repository paths. Those lists rot silently every time a file is renamed, and
 * a rotted index is worse than no index — it sends a reader, or a retrieval
 * system, to a file that no longer exists.
 *
 * Exits non-zero when an entry points at a missing path, or when a source file
 * is missing from the index entirely.
 *
 * Usage:
 *   node scripts/check-doc-indexes.mjs            # validate
 *   node scripts/check-doc-indexes.mjs --prune    # drop dead JSON entries
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'docs/high_signal_file_index.json');
const overviewPath = join(root, 'docs/codebase-overview.md');
const prune = process.argv.includes('--prune');

/** Directories that never belong in a source index. */
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', '.remember', 'icons']);

/** Extensions the index is expected to cover. */
const INDEXED_EXTENSIONS = ['.js', '.mjs', '.html', '.css', '.json'];

/** @type {string[]} */
const problems = [];

/**
 * Lists every indexable source file, repository-relative.
 *
 * @param {string} directory
 * @returns {string[]}
 */
function listSourceFiles(directory) {
  const found = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;

    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listSourceFiles(absolute));
      continue;
    }
    if (INDEXED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      found.push(relative(root, absolute));
    }
  }

  return found;
}

if (!existsSync(indexPath)) {
  console.error(`Missing ${relative(root, indexPath)}`);
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const entries = Array.isArray(index.files) ? index.files : [];

const dead = entries.filter((entry) => !existsSync(join(root, entry.path)));
for (const entry of dead) {
  problems.push(`index entry points at a missing file: ${entry.path}`);
}

// Source files under src/ and scripts/ are the ones retrieval actually needs.
const indexed = new Set(entries.map((entry) => entry.path));
const expected = listSourceFiles(join(root, 'src')).concat(listSourceFiles(join(root, 'scripts')));
for (const path of expected) {
  if (!indexed.has(path)) problems.push(`source file missing from the index: ${path}`);
}

// The overview links to real paths in inline code spans; check the ones that
// look like repository paths rather than every span.
if (existsSync(overviewPath)) {
  const overview = readFileSync(overviewPath, 'utf8');
  const referenced = new Set(
    [...overview.matchAll(/`((?:src|scripts|test|docs|icons)\/[\w./-]+)`/g)].map((m) => m[1]),
  );

  for (const path of referenced) {
    if (path.endsWith('/')) continue;
    if (!existsSync(join(root, path))) {
      problems.push(`codebase-overview.md references a missing path: ${path}`);
    }
  }
}

if (prune && dead.length > 0) {
  index.files = entries.filter((entry) => existsSync(join(root, entry.path)));
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Pruned ${dead.length} dead entr${dead.length === 1 ? 'y' : 'ies'}.`);
  process.exit(problems.length > dead.length ? 1 : 0);
}

if (problems.length > 0) {
  console.error(`Documentation indexes have ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nRun with --prune to drop dead entries, or add the missing files by hand.');
  process.exit(1);
}

console.log(`Documentation indexes OK — ${entries.length} entries, all paths resolve.`);
