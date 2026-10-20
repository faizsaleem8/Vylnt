import { parseMlModel, predictReport } from './ml-inference';
import { parseLstmModel, predictLstmReport } from './ml-lstm';
import type { Report } from './index';

export function parseAnalysisModel(value: unknown) {
  return value && typeof value === 'object' && 'kind' in value && value.kind === 'experimental-lstm' ? parseLstmModel(value) : parseMlModel(value);
}
export function predictAnalysis(model: ReturnType<typeof parseAnalysisModel>, report: Report) {
  return model.kind === 'experimental-lstm' ? predictLstmReport(model, report) : predictReport(model, report);
}
