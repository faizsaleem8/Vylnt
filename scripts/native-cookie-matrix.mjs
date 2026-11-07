import {spawn} from 'node:child_process';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {dirname, join, resolve, sep} from 'node:path';
import {parseArgs} from 'node:util';
import {crossSiteSessionProfiles,sessionProfiles} from './native-session-profile.mjs';

const families = ['bookwise', 'fieldpoint', 'habit-tracker', 'yoyo-collection', 'tabinator'];
const supportedFamilies = [...families, 'wikiflow'];
const {values} = parseArgs({options: {
  registration: {type: 'string'}, output: {type: 'string'},
  family: {type: 'string', multiple: true}, profile: {type: 'string', multiple: true},
}});
if (!values.registration || !values.output) throw Error('Provide --registration and a new --output under .local');
const root = await realpath('.local');
const registrationPath = await realpath(values.registration);
const output = resolve(values.output);
if (!registrationPath.startsWith(root + sep) || await realpath(dirname(output)) !== root) throw Error('Use private workspace paths');
const file = join(registrationPath, 'registration.json');
const info = await lstat(file);
if (!info.isFile() || info.isSymbolicLink() || info.size > 16384) throw Error('Invalid registration file');
const registration = JSON.parse(await readFile(file, 'utf8'));
if (registration.version !== 'vylnt-native-development-registration-v1' || !/^[a-f0-9]{64}$/.test(registration.registrationHash ?? '')) {
  throw Error('Use a prospective native registration');
}
const selectedFamilies = [...new Set(values.family ?? families)];
const selectedProfiles = [...new Set(values.profile ?? sessionProfiles)];
const permittedProfiles = selectedFamilies.length === 1 && selectedFamilies[0] === 'bookwise'
  ? [...sessionProfiles, ...crossSiteSessionProfiles] : sessionProfiles;
if (!selectedFamilies.every(family => supportedFamilies.includes(family)) || !selectedProfiles.every(profile => permittedProfiles.includes(profile))) {
  throw Error('Unsupported session matrix family or profile');
}
await mkdir(output);
const save = (name, data) => writeFile(join(output, name + '.json'), JSON.stringify(data, null, 2), {flag: 'wx', mode: 0o600});
await save('plan', {registrationHash: registration.registrationHash, families: selectedFamilies, profiles: selectedProfiles, browser: 'chromium'});
const running = new Set();
let interrupted = false;
const cancel = () => {
  interrupted = true;
  for (const child of running) if (child.connected) child.send({type: 'cancel'}, () => {});
};
process.on('SIGINT', cancel);
process.on('SIGTERM', cancel);
const results = [];
async function capture(family, profile) {
  const args = family === 'tabinator'
    ? ['scripts/native-tabinator-acceptance.mjs', '--seeds', '--session-profile=' + profile]
    : ['scripts/native-expansion-data.mjs', '--family', family, '--profile', profile];
  const child = spawn(process.execPath, args, {windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: {...process.env, VYLNT_NATIVE_REGISTRATION: registration.registrationHash, VYLNT_TEST_BROWSER: 'chromium'}});
  running.add(child);
  const code = await new Promise(done => {
    child.once('error', () => done(2));
    child.once('close', code => done(code ?? 2));
  });
  running.delete(child);
  const result = {family, profile, passed: code === 0, exitCode: code};
  await save(`${family}-${profile}`, result);
  results.push(result);
  console.log(`${family} ${profile}: ${result.passed ? 'passed' : 'failed'}`);
}
// Keep one active capture per family because the existing launchers share a
// bundle path within each family. Limit concurrent browsers on this host.
let next = 0;
const workers = Array.from({length: Math.min(3, selectedFamilies.length)}, async () => {
  while (!interrupted && next < selectedFamilies.length) {
    const family = selectedFamilies[next++];
    for (const profile of selectedProfiles) {
      if (interrupted) break;
      await capture(family, profile);
    }
  }
});
try {
  await Promise.all(workers);
  const passed = results.filter(result => result.passed).length;
  await save('summary', {planned: selectedFamilies.length * selectedProfiles.length, passed,
    failed: results.length - passed, interrupted, results});
  if (interrupted || passed !== selectedFamilies.length * selectedProfiles.length) process.exitCode = 2;
} finally {
  process.removeListener('SIGINT', cancel);
  process.removeListener('SIGTERM', cancel);
}
