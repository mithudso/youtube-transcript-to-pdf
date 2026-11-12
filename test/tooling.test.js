import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
function fixture(t, script) {
  const directory = mkdtempSync(join(tmpdir(), 'transcript-tooling-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'scripts'));
  cpSync(new URL(`scripts/${script}`, root), join(directory, 'scripts', script));
  return directory;
}
function run(directory, script, args = [], timeoutMs = 5000) {
  const result = spawnSync(process.execPath, [join(directory, 'scripts', script), ...args], {
    encoding: 'utf8', timeout: timeoutMs,
  });
  if (result.error) throw new Error(`Tool subprocess failed: ${script}`, { cause: result.error });
  assert.equal(result.signal, null, `Tool subprocess received ${result.signal}`);
  return result;
}
function indexFixture(t) {
  const directory = fixture(t, 'check-doc-indexes.mjs');
  for (const path of ['src', 'docs', 'test']) mkdirSync(join(directory, path));
  writeFileSync(join(directory, 'src/example.js'), 'export const example = 1;\n');
  writeFileSync(join(directory, 'docs/codebase-overview.md'), '# Files\n`src/example.js`\n');
  const files = ['src/example.js', 'scripts/check-doc-indexes.mjs'].map((path) => ({ path }));
  return { directory, files, writeIndex() {
    writeFileSync(join(directory, 'docs/high_signal_file_index.json'), JSON.stringify({ files }));
  } };
}

test('packaging rejects missing inputs before replacing the previous archive', (t) => {
  const directory = fixture(t, 'package-extension.mjs');
  for (const file of ['package.json', 'manifest.json', 'LICENSE']) cpSync(new URL(file, root), join(directory, file));
  cpSync(new URL('icons', root), join(directory, 'icons'), { recursive: true });
  mkdirSync(join(directory, 'dist'));
  const { version } = JSON.parse(readFileSync(join(directory, 'manifest.json')));
  const archive = join(directory, 'dist', `youtube-transcript-to-pdf-${version}.zip`);
  writeFileSync(archive, 'previous archive');
  const result = run(directory, 'package-extension.mjs');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /src/);
  assert.doesNotMatch(result.stdout, /Packaged/);
  assert.equal(readFileSync(archive, 'utf8'), 'previous archive');
});

test('doc indexes report unindexed Python tools and tests', (t) => {
  const f = indexFixture(t);
  writeFileSync(join(f.directory, 'scripts/asset.py'), 'print("fixture")\n');
  writeFileSync(join(f.directory, 'test/example.test.js'), '');
  f.writeIndex();
  const result = run(f.directory, 'check-doc-indexes.mjs');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /scripts\/asset.py/);
  assert.match(result.stderr, /test\/example.test.js/);
});

test('doc indexes reject existing paths outside the repository', (t) => {
  const f = indexFixture(t);
  // The parent directory exists, so existence alone cannot enforce containment.
  f.files.push({ path: '..' });
  f.writeIndex();
  const result = run(f.directory, 'check-doc-indexes.mjs');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid|outside|relative/i);
});

test('pruning dead entries still names remaining missing sources', (t) => {
  const f = indexFixture(t);
  f.files.push({ path: 'src/dead.js' });
  writeFileSync(join(f.directory, 'src/unindexed.js'), '');
  f.writeIndex();
  const result = run(f.directory, 'check-doc-indexes.mjs', ['--prune']);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /Pruned 1/);
  assert.match(result.stderr, /src\/unindexed.js/);
  const stored = JSON.parse(readFileSync(join(f.directory, 'docs/high_signal_file_index.json')));
  assert.deepEqual(stored.files.map((entry) => entry.path).sort(), ['scripts/check-doc-indexes.mjs', 'src/example.js']);
});

test('doc index validation requires its documented overview', (t) => {
  const f = indexFixture(t);
  rmSync(join(f.directory, 'docs/codebase-overview.md'));
  f.writeIndex();
  const result = run(f.directory, 'check-doc-indexes.mjs');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /codebase-overview.md/);
});

test('manifest validation rejects divergent versions and wrong action icon dimensions', (t) => {
  const directory = fixture(t, 'validate-manifest.mjs');
  for (const file of ['manifest.json', 'package.json']) cpSync(new URL(file, root), join(directory, file));
  cpSync(new URL('icons', root), join(directory, 'icons'), { recursive: true });
  cpSync(new URL('src', root), join(directory, 'src'), { recursive: true });
  const path = join(directory, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path));
  manifest.version = '65536.0.0';
  manifest.action.default_icon['16'] = 'icons/icon-128.png';
  writeFileSync(path, JSON.stringify(manifest));
  const result = run(directory, 'validate-manifest.mjs');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /version/i);
  assert.match(result.stderr, /action.default_icon.16/);
});

test('manifest validation rejects directory entry points and truncated PNGs', (t) => {
  const directory = fixture(t, 'validate-manifest.mjs');
  for (const file of ['manifest.json', 'package.json']) cpSync(new URL(file, root), join(directory, file));
  cpSync(new URL('icons', root), join(directory, 'icons'), { recursive: true });
  cpSync(new URL('src', root), join(directory, 'src'), { recursive: true });
  const path = join(directory, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path));
  manifest.background.service_worker = '.';
  writeFileSync(path, JSON.stringify(manifest));
  const entry = run(directory, 'validate-manifest.mjs');
  assert.notEqual(entry.status, 0);
  assert.match(entry.stderr, /background.service_worker/);
  manifest.background.service_worker = 'src/background/service-worker.js';
  writeFileSync(path, JSON.stringify(manifest));
  const icon = join(directory, 'icons/icon-16.png');
  writeFileSync(icon, readFileSync(icon).subarray(0, 24));
  const png = run(directory, 'validate-manifest.mjs');
  assert.notEqual(png.status, 0);
  assert.match(png.stderr, /icons.16/);
});


test('overview checks missing directory references', (t) => {
  const f = indexFixture(t);
  f.writeIndex();
  writeFileSync(join(f.directory, 'docs/codebase-overview.md'), '`src/missing/`');
  const missing = run(f.directory, 'check-doc-indexes.mjs');
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /src\/missing/);
});

test('overview rejects existing outside paths', (t) => {
  const f = indexFixture(t);
  f.writeIndex();
  const outside = `${f.directory}-outside.js`;
  t.after(() => rmSync(outside, { force: true }));
  writeFileSync(outside, '');
  writeFileSync(join(f.directory, 'docs/codebase-overview.md'), '`src/../../' + basename(outside) + '`');
  const escaped = run(f.directory, 'check-doc-indexes.mjs');
  assert.notEqual(escaped.status, 0);
  assert.match(escaped.stderr, /invalid|outside|relative/i);
});

function validManifestFixture(t) {
  const directory = fixture(t, 'validate-manifest.mjs');
  for (const file of ['manifest.json', 'package.json']) cpSync(new URL(file, root), join(directory, file));
  for (const path of ['icons', 'src']) cpSync(new URL(path, root), join(directory, path), { recursive: true });
  return directory;
}

test('zip failure preserves the previous archive and cleans temporary output', (t) => {
  const directory = validManifestFixture(t);
  cpSync(new URL('scripts/package-extension.mjs', root), join(directory, 'scripts/package-extension.mjs'));
  cpSync(new URL('LICENSE', root), join(directory, 'LICENSE'));
  mkdirSync(join(directory, 'dist'));
  mkdirSync(join(directory, 'empty-path'));
  const { version } = JSON.parse(readFileSync(join(directory, 'manifest.json')));
  const archive = join(directory, 'dist', `youtube-transcript-to-pdf-${version}.zip`);
  writeFileSync(archive, 'previous archive');
  const result = spawnSync(process.execPath, [join(directory, 'scripts/package-extension.mjs')], {
    encoding: 'utf8', timeout: 5000, env: { ...process.env, PATH: join(directory, 'empty-path') },
  });
  assert.notEqual(result.status, 0);
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.match(result.stderr, /zip/);
  assert.equal(readFileSync(archive, 'utf8'), 'previous archive');
  assert.deepEqual(readdirSync(join(directory, 'dist')), [basename(archive)]);
});

test('manifest validation rejects external symlinks before accepting the file', (t) => {
  const directory = validManifestFixture(t);
  const outside = `${directory}-outside.png`;
  t.after(() => rmSync(outside, { force: true }));
  cpSync(new URL('icons/icon-16.png', root), outside);
  const icon = join(directory, 'icons/icon-16.png');
  rmSync(icon);
  symlinkSync(outside, icon);
  const result = run(directory, 'validate-manifest.mjs');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside the extension root/);
});

test('manifest validation rejects PNGs without encoded pixels and corrupted checksums', (t) => {
  const directory = validManifestFixture(t);
  const icon = join(directory, 'icons/icon-16.png');
  const original = readFileSync(icon);
  // Real IHDR, then zero-length IDAT and IEND with their correct CRCs: no pixel stream.
  writeFileSync(icon, Buffer.concat([original.subarray(0, 33),
    Buffer.from('000000004944415435af061e0000000049454e44ae426082', 'hex')]));
  assert.notEqual(run(directory, 'validate-manifest.mjs').status, 0);
  const damaged = Buffer.from(original);
  damaged[29] ^= 1; // IHDR checksum, independent of the declared dimensions.
  writeFileSync(icon, damaged);
  assert.notEqual(run(directory, 'validate-manifest.mjs').status, 0);
});

test('manifest validation rejects negative icon keys', (t) => {
  const directory = validManifestFixture(t);
  const path = join(directory, 'manifest.json');
  const original = JSON.parse(readFileSync(path));
  writeFileSync(join(directory, 'empty.png'), '');
  writeFileSync(path, JSON.stringify({ ...original, icons: { '-1': 'empty.png' } }));
  assert.notEqual(run(directory, 'validate-manifest.mjs').status, 0);
});

test('manifest validation rejects nested V2 flags even when false', (t) => {
  const directory = validManifestFixture(t);
  const path = join(directory, 'manifest.json');
  const original = JSON.parse(readFileSync(path));
  for (const persistent of [true, false]) {
    writeFileSync(path, JSON.stringify({ ...original, background: { ...original.background, persistent } }));
    const result = run(directory, 'validate-manifest.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /background.persistent/);
  }
});


test('tooling child processes have a finite deadline and report timeout distinctly', (t) => {
  const directory = fixture(t, 'check-doc-indexes.mjs');
  writeFileSync(join(directory, 'scripts/child-hang.mjs'), 'for (;;) {}');
  assert.throws(() => run(directory, 'child-hang.mjs', [], 200),
    (error) => error.cause?.code === 'ETIMEDOUT');
});


test('pruning preserves invalid entries and their metadata for explicit correction', (t) => {
  const f = indexFixture(t);
  const invalid = { path: './src/example.js', description: 'Preserve this authored metadata' };
  f.files.push(invalid, { path: 'src/dead.js' });
  f.writeIndex();
  const result = run(f.directory, 'check-doc-indexes.mjs', ['--prune']);
  assert.notEqual(result.status, 0);
  const saved = JSON.parse(readFileSync(join(f.directory, 'docs/high_signal_file_index.json')));
  assert.deepEqual(saved.files, f.files.filter((entry) => entry.path !== 'src/dead.js'));
});

test('overview validates complete references with punctuation and spaces', (t) => {
  const f = indexFixture(t);
  f.writeIndex();
  for (const path of ['src/missing+name.js', 'src/missing name.js']) {
    writeFileSync(join(f.directory, 'docs/codebase-overview.md'), '`' + path + '`');
    const result = run(f.directory, 'check-doc-indexes.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /references a missing path/);
  }
});

test('manifest versions reject leading-zero nonzero components', (t) => {
  const directory = validManifestFixture(t);
  const manifestPath = join(directory, 'manifest.json');
  const packagePath = join(directory, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath));
  const pkg = JSON.parse(readFileSync(packagePath));
  for (const version of ['01.0.1', '1.01.1']) {
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, version }));
    writeFileSync(packagePath, JSON.stringify({ ...pkg, version }));
    const result = run(directory, 'validate-manifest.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /version/);
  }
});

test('a valid string action icon passes while invalid PNG data still fails', (t) => {
  const directory = validManifestFixture(t);
  const path = join(directory, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path));
  manifest.action.default_icon = 'icons/icon-16.png';
  writeFileSync(path, JSON.stringify(manifest));
  assert.equal(run(directory, 'validate-manifest.mjs').status, 0);
  writeFileSync(join(directory, 'icons/icon-16.png'), 'not a PNG');
  assert.notEqual(run(directory, 'validate-manifest.mjs').status, 0);
});

test('universal host permission patterns fail the repository scope guard', (t) => {
  const directory = validManifestFixture(t);
  const path = join(directory, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path));
  for (const pattern of ['<all_urls>', 'https://*/*', '*://*/*']) {
    writeFileSync(path, JSON.stringify({ ...manifest, host_permissions: [pattern] }));
    const result = run(directory, 'validate-manifest.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /specific hosts/);
  }
});
