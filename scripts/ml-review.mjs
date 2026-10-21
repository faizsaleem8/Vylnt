import { readFile, writeFile, mkdir, rename, open, unlink } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const { positionals, values } = parseArgs({ allowPositionals: true, options: {
  report: { type: 'string' }, family: { type: 'string' }, packet: { type: 'string' }, decision: { type: 'string' }, packets: { type: 'string' }, output: { type: 'string' },
  'source-kind': { type: 'string', default: 'controlled' },
} });
const command = positionals[0];
if (!['create', 'record', 'status', 'export'].includes(command) || positionals.length !== 1) throw new Error('Use ml:review create|record|status|export; developer-only private review workflow');
await mkdir('.local', { recursive: true });
const modulePath = resolve(`.local/ml-review-${randomUUID()}.mjs`);
await build({ entryPoints: ['packages/ml/review-workflow.ts'], bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { createReviewPacket, parseReviewPacket, addReviewDecision, reviewReadiness, reviewedExamples, assertPrivateMlPath } = await import(pathToFileURL(modulePath).href);
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const saveNew = async (path, value) => { assertPrivateMlPath(path); await mkdir(dirname(resolve(path)), { recursive: true }); await writeFile(path, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 }); };
if (command === 'create') {
  if (!values.report || !values.family || !values.output) throw new Error('create --report <saved scan> --family <actual application/template family> --output <new private packet.json>');
  const packet = createReviewPacket(await read(values.report), values.family, values['source-kind']);
  await saveNew(values.output, packet); console.log(JSON.stringify(reviewReadiness(packet)));
} else if (command === 'status' || command === 'record') {
  if (!values.packet) throw new Error('Provide --packet <private packet.json>');
  assertPrivateMlPath(values.packet);
  const lockPath = `${resolve(values.packet)}.lock`;
  const lock = command === 'record' ? await open(lockPath, 'wx', 0o600) : undefined;
  try {
  let packet = parseReviewPacket(await read(values.packet));
  if (command === 'record') {
    if (!values.decision) throw new Error('record --packet <packet.json> --decision <independent reviewer decision.json>');
    packet = addReviewDecision(packet, await read(values.decision));
    // Preserve each decision in a separate exclusive journal before updating the packet.
    await saveNew(`${values.packet}.reviews/${packet.decisions.at(-1).caseId}-${randomUUID()}.json`, packet.decisions.at(-1));
    const temp = `${values.packet}.${randomUUID()}.tmp`;
    await saveNew(temp, packet); await rename(temp, values.packet);
  }
  console.log(JSON.stringify(reviewReadiness(packet)));
  } finally { if (lock) { await lock.close(); await unlink(lockPath); } }
} else {
  if (!values.packets || !values.output) throw new Error('export --packets <JSON array of private packet paths> --output <new private manifest.json>');
  const paths = await read(values.packets);
  if (!Array.isArray(paths) || !paths.length || paths.length > 1000 || paths.some(p => typeof p !== 'string')) throw new Error('Expected 1..1000 explicit packet paths');
  const parsed = await Promise.all(paths.map(p => read(resolve(dirname(values.packets), p)).then(parseReviewPacket)));
  if (new Set(parsed.map(p => p.source.scanId)).size !== parsed.length) throw new Error('Repeated scans must not be assigned to multiple review families');
  const examples = [], status = parsed.map(reviewReadiness);
  // Reports and review attribution remain in the private output directory, never bundled.
  const privateDir = `${resolve(values.output)}.sources`;
  for (const packet of parsed) {
    const reportFile = `${privateDir}/${packet.sourceHash}.json`;
    const rows = reviewedExamples(packet, reportFile);
    if (!rows.length) continue;
    await saveNew(reportFile, packet.source); examples.push(...rows);
  }
  if (!examples.length) throw new Error('No application cases have two independent review declarations. Controlled fixtures cannot be promoted to application provenance. No training manifest was created.');
  await saveNew(values.output, { version: 2, examples });
  await saveNew(`${values.output}.readiness.json`, { packets: status, limitations: 'Disagreements retain individual labels for mandatory conflict auditing; matching intentions cannot be inferred from names.' });
  console.log(JSON.stringify({ annotations: examples.length, pairedCases: status.reduce((s, p) => s + p.ready, 0), pendingCases: status.reduce((s, p) => s + p.pending, 0), disagreements: status.reduce((s, p) => s + p.disagreements, 0) }));
}
