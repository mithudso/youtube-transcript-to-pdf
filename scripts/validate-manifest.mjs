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

import { readFileSync, existsSync, statSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

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
  const invalid = () => ({ width: -1, height: -1 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature) ||
      bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') return invalid();
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  const depth = bytes[24], color = bytes[25], interlaced = bytes[28];
  const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  if (!width || !height || !depths[color]?.includes(depth) || bytes[26] || bytes[27] || interlaced > 1) return invalid();
  let cursor = 8, end = false, palette = false;
  const data = [];
  while (cursor + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(cursor);
    if (cursor + length + 12 > bytes.length) return invalid();
    const type = bytes.toString('ascii', cursor + 4, cursor + 8);
    let crc = 0xffffffff;
    for (const value of bytes.subarray(cursor + 4, cursor + 8 + length)) {
      crc ^= value;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    if (((crc ^ 0xffffffff) >>> 0) !== bytes.readUInt32BE(cursor + 8 + length)) return invalid();
    if (type === 'IHDR' && cursor !== 8) return invalid();
    if (type === 'PLTE') palette = length > 0 && length <= 768 && length % 3 === 0;
    if (type === 'IDAT') data.push(bytes.subarray(cursor + 8, cursor + 8 + length));
    cursor += length + 12;
    if (type === 'IEND') { end = length === 0; break; }
  }
  if (!end || cursor !== bytes.length || !data.length || (color === 3 && !palette)) return invalid();
  // Validate the pixel stream, including Adam7 pass sizes, without installing an image decoder.
  const passes = interlaced ? [[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]] : [[0,0,1,1]];
  const rows = passes.map(([x, y, dx, dy]) => {
    const columns = Math.max(0, Math.ceil((width - x) / dx));
    return { count: columns ? Math.max(0, Math.ceil((height - y) / dy)) : 0,
      bytes: Math.ceil(columns * channels * depth / 8) + 1 };
  });
  const expected = rows.reduce((sum, row) => sum + row.count * row.bytes, 0);
  if (!expected || expected > 32 * 1024 * 1024) return invalid();
  try {
    const pixels = inflateSync(Buffer.concat(data), { maxOutputLength: expected + 1 });
    if (pixels.length !== expected) return invalid();
    let offset = 0;
    for (const row of rows) for (let n = 0; n < row.count; n += 1) {
      if (pixels[offset] > 4) return invalid();
      offset += row.bytes;
    }
  } catch { return invalid(); }
  return { width, height };
}

/**
 * Confirms a manifest-referenced path exists on disk.
 *
 * @param {string} relativePath
 * @param {string} label
 */
function expectFile(relativePath, label) {
  if (typeof relativePath !== 'string' || !relativePath || isAbsolute(relativePath)) {
    problems.push(`${label} must name a repository file`);
    return false;
  }
  const target = resolve(root, relativePath);
  const path = relative(root, target);
  if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
    problems.push(`${label} references a file outside the extension root`);
    return false;
  }
  try {
    const canonical = relative(realpathSync(root), realpathSync(target));
    if (canonical === '..' || canonical.startsWith(`..${sep}`) || isAbsolute(canonical)) {
      problems.push(`${label} references a file outside the extension root`);
      return false;
    }
    if (statSync(target).isFile()) return true;
  } catch {}
  problems.push(`${label} references a missing or non-file path: ${relativePath}`);
  return false;
}

function expectIcons(icons, label) {
  for (const [size, path] of Object.entries(icons ?? {})) {
    if (!/^[1-9]\d*$/.test(size) || !Number.isSafeInteger(Number(size))) {
      problems.push(`${label}.${size} must declare a positive integer icon size`);
      continue;
    }
    if (!expectFile(path, `${label}.${size}`)) continue;
    const { width, height } = readPngSize(join(root, path));
    expect(width === Number(size) && height === Number(size),
      `${label}.${size} is declared as ${size}x${size} but ${path} is ${width}x${height}`);
  }
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
expect(typeof manifest.version === 'string' && /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}$/.test(manifest.version) &&
  manifest.version.split('.').every((part) => Number(part) <= 65535) &&
  manifest.version.split('.').some((part) => Number(part) > 0),
  'version must be a string of 1-4 integers from 0 to 65535, with at least one nonzero part');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
expect(pkg.version === manifest.version, 'package.json and manifest.json versions must match');
expect(
  typeof manifest.description === 'string' && manifest.description.length <= 132,
  'description is required and must be 132 characters or fewer',
);

for (const key of ['browser_action', 'page_action', 'persistent', 'content_security_policy_string']) {
  expect(!(key in manifest), `${key} is a Manifest V2 key`);
}
for (const key of ['scripts', 'persistent']) {
  expect(!Object.hasOwn(manifest.background ?? {}, key), `background.${key} is Manifest V2; use background.service_worker`);
}

expectFile(manifest.background?.service_worker ?? '', 'background.service_worker');
expectFile(manifest.action?.default_popup ?? '', 'action.default_popup');

expectIcons(manifest.icons, 'icons');
if (typeof manifest.action?.default_icon === 'string') {
  const path = manifest.action.default_icon;
  if (expectFile(path, 'action.default_icon')) {
    const { width, height } = readPngSize(join(root, path));
    expect(width > 0 && height > 0, 'action.default_icon must reference a valid PNG');
  }
} else expectIcons(manifest.action?.default_icon, 'action.default_icon');

expect(
  !(manifest.host_permissions ?? []).some((pattern) =>
    pattern === '<all_urls>' || /^[^:]+:\/\/\*(?::[^/]*)?\//.test(pattern)),
  'host_permissions should be scoped to specific hosts, not <all_urls>',
);

if (problems.length > 0) {
  console.error(`manifest.json has ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`manifest.json OK — ${manifest.name} v${manifest.version}`);
