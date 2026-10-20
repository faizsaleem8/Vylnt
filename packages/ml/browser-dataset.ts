import type { Report } from '../core';
import { RULESET_VERSION } from '../core';
import { parseSubmission } from '../core/validation';
import { canonicalJson } from '../core/integrity';
import { extractMlFeatures, featureNames, featureVersion } from '../core/ml-features';
import { annotationSchema, annotationReasons, type Annotation } from './annotation';

export type TrainingLabel = Annotation['label'];
/** Same feature-only/HMAC format as the offline preparer. Never exports raw report data. */
export async function prepareBrowserDataset(report: Report, labels: Record<string, TrainingLabel>, familyId: string, secret: string) {
  if (secret.length < 32) throw new Error('Use a private dataset key of at least 32 characters. Reuse it for every scan in this dataset.');
  if (report.rulesetVersion !== RULESET_VERSION) throw new Error('Rescan and review under the current ruleset before preparing data.');
  const fresh = parseSubmission({ scanId: report.scanId, observation: report.observation });
  if (Object.keys(labels).some(id => !fresh.findings.some(finding => finding.id === id))) throw new Error('A label refers to a finding outside this recomputed scan.');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = async (scope: string, value: string) => {
    const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(scope + ':' + value));
    return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  };
  const scanGroup = await digest('scan', canonicalJson({ observation: fresh.observation, findings: fresh.findings }));
  const examples = await Promise.all(fresh.findings.map(async finding => {
    const label = labels[finding.id] ?? 'unreviewed';
    const annotation = annotationSchema.parse({ familyId: familyId.trim(), label, provenance: 'reviewed', reason: annotationReasons[label] });
    return {
      schemaVersion: featureVersion, rulesetVersion: fresh.rulesetVersion,
      sampleId: await digest('sample', fresh.scanId + ':' + finding.id),
      siteGroup: await digest('family', annotation.familyId), scanGroup,
      label: annotation.label, provenance: annotation.provenance, reason: annotation.reason,
      features: extractMlFeatures(fresh, finding.id),
    };
  }));
  if (!examples.length) throw new Error('This scan has no findings to annotate.');
  return { schemaVersion: featureVersion, featureNames: [...featureNames], examples };
}
