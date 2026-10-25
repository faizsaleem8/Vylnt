import type { Report } from '../core';
import { canonicalJson } from '../core/integrity';
import { parseAnalysisModel, predictAnalysis } from '../core/ml-model';
import { bundledModel } from './bundled-model';

/** No training, persistence or transport. The deployed VYLNT release owns the model. */
export async function analyseScan(report: Report, release: { name: string; model: unknown } = bundledModel) {
  const model = parseAnalysisModel(release.model);
  const values = predictAnalysis(model, report);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(model)));
  const modelHash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return { scanId: report.scanId, modelName: release.name, modelHash, kind: model.kind, provenance: model.provenance, rulesetVersion: model.rulesetVersion, threshold: model.threshold, values };
}
export type ScanAnalysis = Awaited<ReturnType<typeof analyseScan>>;
