import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {basename, dirname, join, resolve, sep} from 'node:path';
import {parseArgs} from 'node:util';

const {values} = parseArgs({options: {output: {type: 'string'}, verify: {type: 'boolean'}}});
assert.ok(values.output, 'Provide an --output directory directly under .local');
const root = await realpath('.local');
const source = await realpath(join(root, 'ml-native-screening-etherpad-v3.3.15'));
const output = resolve(values.output);
assert.ok(source.startsWith(root + sep));
const outputParent=await realpath(dirname(output));
const temporary=values.verify&&process.platform==='linux'&&/^\/tmp\/vylnt-etherpad-runtime\.[a-zA-Z0-9]+$/.test(outputParent)&&basename(output)==='application';
assert.ok(temporary||outputParent===root&&/^etherpad-[a-z0-9-]+$/.test(basename(output)));

const pin = JSON.parse(await readFile('ml/applications/native/etherpad.source.json', 'utf8'));
assert.equal(pin.familyId, 'upstream:ether/etherpad');
assert.match(pin.revision, /^[a-f0-9]{40}$/);
const byteBudget = 24 * 1024 * 1024;
const git = (args, input) => execFileSync('git', args, {cwd: source, input, windowsHide: true, timeout: 45000, maxBuffer: byteBudget + 1024 * 1024});
assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), pin.revision, 'Pinned Etherpad revision differs');
const names = new Set();
let total = 0;
const entries = new TextDecoder('utf-8', {fatal: true}).decode(git(['ls-tree', '-rlz', '--full-tree', pin.revision]))
  .split('\0').filter(Boolean).map(entry => {
    const match = /^100(?:644|755) blob ([a-f0-9]{40}) +([0-9]+)\t(.+)$/s.exec(entry);
    assert.ok(match, 'Only pinned regular files are supported');
    const [, object, length, file] = match;
    const segments = file.split('/');
    assert.ok(segments.every(part => part && !/[<>:"\\|?*~\x00-\x1f]|[. ]$/.test(part) &&
      !/^(?:\.git|node_modules|\.env|vylnt-source-receipt\.json)$/i.test(part) &&
      !/^(?:CON|PRN|AUX|NUL|COM[0-9¹²³]|LPT[0-9¹²³])(?:\.|$)/i.test(part)), 'Unsafe native source path');
    const normalized = file.normalize('NFC').toLowerCase();
    assert.ok(!names.has(normalized), 'Native source path collision');
    names.add(normalized);
    const size = Number(length);
    total += size;
    assert.ok(size <= 4 * 1024 * 1024 && total <= byteBudget, 'Native source exceeds its copy budget');
    return {object, size, file};
  });
assert.ok(entries.length > 0 && entries.length <= 1500);

const response = git(['cat-file', '--batch'], entries.map(({object}) => object).join('\n') + '\n');
const expected = {...pin.sourceSha256, LICENSE: pin.licenseSha256, 'pnpm-lock.yaml': pin.dependencyLockSha256};
const verified = new Set();
let offset = 0;
for (const entry of entries) {
  const newline = response.indexOf(10, offset);
  assert.ok(newline >= offset);
  assert.equal(response.toString('ascii', offset, newline), `${entry.object} blob ${entry.size}`, 'Pinned Git object metadata differs');
  entry.bytes = response.subarray(newline + 1, newline + 1 + entry.size);
  offset = newline + 1 + entry.size;
  assert.equal(response[offset++], 10);
  assert.equal(createHash('sha1').update(`blob ${entry.size}\0`).update(entry.bytes).digest('hex'), entry.object, 'Pinned Git blob differs');
  if (Object.hasOwn(expected, entry.file)) {
    assert.equal(createHash('sha256').update(entry.bytes).digest('hex'), expected[entry.file], 'Screened source digest differs');
    verified.add(entry.file);
  }
}
assert.equal(offset, response.length);
assert.equal(verified.size, Object.keys(expected).length);

if (values.verify) {
  assert.equal(await realpath(output), output, 'Stage must be a direct directory');
  for (const {file, bytes} of entries) {
    const destination = join(output, file);
    const info = await lstat(destination);
    assert.ok(info.isFile() && !info.isSymbolicLink() && info.size === bytes.length &&
      await realpath(destination) === destination, `Staged path differs: ${file}`);
    assert.ok((await readFile(destination)).equals(bytes), `Staged file differs: ${file}`);
  }
} else {
  await mkdir(output);
  for (const {file, bytes} of entries) {
    const destination = join(output, file);
    await mkdir(dirname(destination), {recursive: true});
    await writeFile(destination, bytes, {flag: 'wx'});
  }
  await writeFile(join(output, 'vylnt-source-receipt.json'), JSON.stringify({version: 1, revision: pin.revision,
    files: entries.length, bytes: total, dependencyLockSha256: pin.dependencyLockSha256, eligibleExamples: 0}, null, 2) + '\n', {flag: 'wx'});
}
console.log(`${values.verify ? 'Verified' : 'Staged'} ${entries.length} pinned Etherpad files (${total} bytes).`);
