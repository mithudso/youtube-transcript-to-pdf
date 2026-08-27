#!/usr/bin/env node
/**
 * Manifest sanity check.
 *
 * Catches the failure modes that produce an extension Chrome silently refuses
 * to load: a manifest that is not valid JSON, references to files that do not
 * exist, icon files whose real pixel dimensions differ from the size they are
 * declared under, and stale Manifest V2 keys.
 *
 * Exits non-zero on the first category of problem found.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const problems = [];

/**
 * Records a problem when a condition does not hold.
 *
 * @param {boolean} condition
 * @param {string} message
 */
function expect(condition, message) {
  if (!condition) problems.push(message);
}

/**
 * Reads the pixel dimensions out of a PNG's IHDR chunk.
 *
 * @param {string} path
 * @returns {{width: number, height: number}}
 */
function readPngSize(path) {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * Confirms a manifest-referenced path exists on disk.
 *
 * @param {string} relativePath
 * @param {string} label
 */
function expectFile(relativePath, label) {
  expect(existsSync(join(root, relativePath)), `${label} references a missing file: ${relativePath}`);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
} catch (error) {
  console.error(`manifest.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

expect(manifest.manifest_version === 3, 'manifest_version must be 3');
expect(typeof manifest.name === 'string' && manifest.name.length > 0, 'name is required');
expect(/^\d+(\.\d+){0,3}$/.test(manifest.version ?? ''), 'version must be 1-4 dot-separated numbers');
expect(
  typeof manifest.description === 'string' && manifest.description.length <= 132,
  'description is required and must be 132 characters or fewer',
);

for (const key of ['background.scripts', 'browser_action', 'page_action', 'web_accessible_resources.legacy']) {
  const [head] = key.split('.');
  expect(!(head in manifest && key === head), `${head} is a Manifest V2 key`);
}
expect(!manifest.background?.scripts, 'background.scripts is Manifest V2; use background.service_worker');

expectFile(manifest.background?.service_worker ?? '', 'background.service_worker');
expectFile(manifest.action?.default_popup ?? '', 'action.default_popup');

for (const [size, path] of Object.entries(manifest.icons ?? {})) {
  expectFile(path, `icons.${size}`);
  if (!existsSync(join(root, path))) continue;

  const { width, height } = readPngSize(join(root, path));
  expect(
    width === Number(size) && height === Number(size),
    `icons.${size} is declared as ${size}x${size} but ${path} is ${width}x${height}`,
  );
}

for (const [size, path] of Object.entries(manifest.action?.default_icon ?? {})) {
  expectFile(path, `action.default_icon.${size}`);
}

expect(
  !(manifest.host_permissions ?? []).includes('<all_urls>'),
  'host_permissions should be scoped to specific hosts, not <all_urls>',
);

if (problems.length > 0) {
  console.error(`manifest.json has ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`manifest.json OK — ${manifest.name} v${manifest.version}`);
