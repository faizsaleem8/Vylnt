import { datasetExample, type Annotation } from './dataset';
import { parseSubmission } from '../core/validation';
import { featureNames } from '../core/ml-features';
import { extractMlSequence, sequenceFeatureNames, sequenceVersion } from '../core/ml-sequence';

export function sequenceDatasetExample(input: { scanId: string; observation: unknown; rulesetVersion: string }, findingIndex: number, annotation: Annotation, secret: string) {
  const row = datasetExample(input, findingIndex, annotation, secret);
  const report = parseSubmission({ scanId: input.scanId, observation: input.observation });
  return { ...row, sequence: extractMlSequence(report, report.findings[findingIndex].id) };
}
export const sequenceDatasetEnvelope = (examples: ReturnType<typeof sequenceDatasetExample>[]) => ({ schemaVersion: sequenceVersion, sequenceFeatureNames: [...sequenceFeatureNames], baselineFeatureNames: [...featureNames], examples });
