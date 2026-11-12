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

import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'docs/high_signal_file_index.json');
const overviewPath = join(root, 'docs/codebase-overview.md');
const prune = process.argv.includes('--prune');

/** Directories that never belong in a source index. */
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', '.remember', 'icons']);

/** Extensions the index is expected to cover. */
const INDEXED_EXTENSIONS = ['.js', '.mjs', '.py', '.html', '.css', '.json', '.yml', '.yaml'];

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
    if (IGNORED_DIRECTORIES.has(entry.name) || entry.name === '__pycache__') continue;

    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listSourceFiles(absolute));
      continue;
    }
    if (INDEXED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      found.push(relative(root, absolute).split(sep).join('/'));
    }
  }

  return found;
}

if (!existsSync(indexPath)) {
  console.error(`Missing ${relative(root, indexPath)}`);
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, 'utf8'));
if (!Array.isArray(index?.files)) {
  console.error('Documentation index must contain a files array.');
  process.exit(1);
}
const validPath = (path) => typeof path === 'string' && path.length > 0 &&
  !isAbsolute(path) && !/^[A-Za-z]:/.test(path) && !path.includes('\\') &&
  !path.split('/').some((part) => part === '..' || part === '.' || part === '');
const entries = index.files.filter((entry) => {
  if (validPath(entry?.path)) return true;
  problems.push('index entry has an invalid repository-relative path');
  return false;
});

const dead = entries.filter((entry) => !existsSync(join(root, entry.path)) || !statSync(join(root, entry.path)).isFile());
for (const entry of dead) {
  problems.push(`index entry points at a missing file: ${entry.path}`);
}

// Include runtime, tools, tests and CI; none of these surfaces is optional coverage.
const indexed = new Set(entries.map((entry) => entry.path));
const expected = ['src', 'scripts', 'test', '.github/workflows'].flatMap((path) =>
  existsSync(join(root, path)) ? listSourceFiles(join(root, path)) : [],
);
for (const path of expected) {
  if (!indexed.has(path)) problems.push(`source file missing from the index: ${path}`);
}

// The overview links to real paths in inline code spans; check the ones that
// look like repository paths rather than every span.
if (!existsSync(overviewPath)) problems.push('Missing docs/codebase-overview.md');
if (existsSync(overviewPath)) {
  const overview = readFileSync(overviewPath, 'utf8');
  const referenced = new Set(
    [...overview.matchAll(/`([^`\r\n]+)`/g)].map((m) => m[1])
      .filter((path) => /^(?:src|scripts|test|docs|icons)\//.test(path)),
  );

  for (const path of referenced) {
    const normalized = path.replace(/\/$/, '');
    if (!validPath(normalized)) {
      problems.push(`codebase-overview.md has an invalid repository-relative path: ${path}`);
      continue;
    }
    if (!existsSync(join(root, normalized)) || (path.endsWith('/') && !statSync(join(root, normalized)).isDirectory())) {
      problems.push(`codebase-overview.md references a missing path: ${path}`);
    }
  }
}

if (prune && dead.length > 0) {
  index.files = index.files.filter((entry) => !dead.includes(entry));
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Pruned ${dead.length} dead entr${dead.length === 1 ? 'y' : 'ies'}.`);
  for (const entry of dead) {
    const position = problems.indexOf(`index entry points at a missing file: ${entry.path}`);
    if (position !== -1) problems.splice(position, 1);
  }
}

if (problems.length > 0) {
  console.error(`Documentation indexes have ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nRun with --prune to drop dead entries, or add the missing files by hand.');
  process.exit(1);
}

console.log(`Documentation indexes OK — ${entries.length} entries, all paths resolve.`);
