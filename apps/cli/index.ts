import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { scanPage } from './scanner';
import { weights, type Severity } from '../../packages/core';
const { values } = parseArgs({ options: {
  url: { type: 'string' }, output: { type: 'string', default: 'reports/security-report.json' },
  'fail-on': { type: 'string', default: 'high' }, 'min-confidence': { type: 'string', default: 'high' },
  'allow-remote': { type: 'boolean', default: false }, 'ignore-https-errors': { type: 'boolean', default: false },
  'wait-ms': { type: 'string', default: '300' }, help: { type: 'boolean', default: false }
} });
if (values.help) console.log('VYLNT scanner\n--url <HTTP(S) URL> --output <JSON file> --fail-on <critical|high|medium|low|info|none> --min-confidence <high|medium|low>\nOptional: --allow-remote (authorized sites only), --ignore-https-errors (localhost only), --wait-ms <0..5000>\nExit: 0 pass, 1 findings exceed policy, 2 execution/configuration error.');
else {
  try {
    if (!values.url) throw new Error('--url is required');
    if (!['critical','high','medium','low','info','none'].includes(values['fail-on'])) throw new Error('Invalid --fail-on value');
    const confidence = { high: 3, medium: 2, low: 1 };
    if (!(values['min-confidence'] in confidence)) throw new Error('Invalid --min-confidence value');
    const waitMs = Number(values['wait-ms']); if (!Number.isInteger(waitMs) || waitMs < 0 || waitMs > 5000) throw new Error('--wait-ms must be 0..5000');
    const report = await scanPage(values.url, { allowRemote: values['allow-remote'], ignoreHTTPSErrors: values['ignore-https-errors'], waitMs });
    await mkdir(dirname(values.output), { recursive: true }); await writeFile(values.output, JSON.stringify(report, null, 2));
    const violations = values['fail-on'] === 'none' ? [] : report.findings.filter(f => weights[f.severity] >= weights[values['fail-on'] as Severity] && confidence[f.confidence] >= confidence[values['min-confidence'] as keyof typeof confidence]);
    console.log(`VYLNT: ${report.findings.length} findings, score ${report.score}/100, ${violations.length} policy violations. Report: ${values.output}`);
    process.exitCode = violations.length ? 1 : 0;
  } catch (error) { console.error(error instanceof Error ? error.message : 'Scan failed'); process.exitCode = 2; }
}
