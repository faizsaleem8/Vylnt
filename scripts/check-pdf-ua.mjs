// Optional local validator. Install veraPDF separately; no download or service is started.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const jar = process.env.VYNLT_VERAPDF_JAR;
assert.ok(jar, 'Set VYNLT_VERAPDF_JAR to the installed veraPDF CLI jar; Java is required.');
const files = process.argv.slice(2);
if (!files.length) files.push('test-results/pdf/empty.pdf', 'test-results/pdf/multipage.pdf', 'test-results/pdf/concise.pdf', 'test-results/pdf/frozen.pdf');
const child = spawn('java', ['-jar', resolve(jar), '--flavour', 'ua1', '--format', 'xml', ...files], { stdio: ['ignore', 'pipe', 'pipe'] });
let xml = '', warnings = '';
child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
child.stdout.on('data', chunk => { xml += chunk; }); child.stderr.on('data', chunk => { warnings += chunk; });
const code = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', accept); });
await mkdir('test-results/pdf', { recursive: true });
await writeFile('test-results/pdf/verapdf.xml', xml);
await writeFile('test-results/pdf/verapdf-warnings.log', warnings);
const reports = [...xml.matchAll(/<validationReport\b[^>]*isCompliant="(true|false)"/g)];
assert.equal(code, 0, `veraPDF exited ${code}; inspect test-results/pdf/verapdf.xml and warnings log`);
assert.equal(reports.length, files.length, 'Expected one validation report per input PDF');
assert.ok(reports.every(report => report[1] === 'true'), 'PDF/UA-1 validation failed; inspect test-results/pdf/verapdf.xml');
console.log(`PASS veraPDF PDF/UA-1 automated profile: ${reports.length} PDFs. Human reading-order acceptance remains separate.`);
