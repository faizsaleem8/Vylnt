import { createHmac } from 'node:crypto';
import { canonicalJson } from '../core/integrity';
import { parseSubmission } from '../core/validation';
import { RULESET_VERSION } from '../core';
import { extractMlFeatures, featureNames, featureVersion } from '../core/ml-features';

import { annotationSchema, type Annotation } from './annotation';
export { annotationSchema, type Annotation } from './annotation';
export function datasetExample(input: { scanId: string; observation: unknown; rulesetVersion: string }, findingIndex: number, annotation: Annotation, secret: string) {
  if (secret.length < 32) throw new Error('Use a private dataset HMAC key of at least 32 characters');
  const reviewed = annotationSchema.parse(annotation);
  if (input.rulesetVersion !== RULESET_VERSION) throw new Error('Reannotate the report with the current ruleset before preparing data');
  const report = parseSubmission({ scanId: input.scanId, observation: input.observation }); // Recalculate findings; do not trust report score/findings.
  const finding = report.findings[findingIndex];
  if (!finding) throw new Error('Finding index is out of range');
  const digest = (scope: string, value: string) => createHmac('sha256', secret).update(scope + ':' + value).digest('hex');
  return {
    schemaVersion: featureVersion, rulesetVersion: report.rulesetVersion,
    sampleId: digest('sample', report.scanId + ':' + finding.id),
    siteGroup: digest('family', reviewed.familyId),
    scanGroup: digest('scan', canonicalJson({ observation: report.observation, findings: report.findings })),
    label: reviewed.label, provenance: reviewed.provenance, reason: reviewed.reason,
    features: extractMlFeatures(report, finding.id),
  };
}
export const datasetEnvelope = (examples: ReturnType<typeof datasetExample>[]) => ({ schemaVersion: featureVersion, featureNames: [...featureNames], examples });
