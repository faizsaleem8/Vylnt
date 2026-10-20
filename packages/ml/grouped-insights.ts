import type { Report } from '../core';
import type { MlPrediction } from '../core/ml-inference';
import { summarizeReport } from '../core/report-insights';

/** Presentation grouping only. No model prediction may erase supporting evidence. */
export function groupMlInsights(report: Report, predictions: MlPrediction[]) {
  const byId = new Map(predictions.map(value => [value.findingId, value]));
  return summarizeReport(report).map(group => {
    const values = group.findingIds.map(findingId => byId.get(findingId) ?? { findingId, reason: 'No model prediction is available for this observation.' });
    return { ...group, values,
      actionable: values.filter(value => 'label' in value && value.label === 'actionable').length,
      contextual: values.filter(value => 'label' in value && value.label === 'contextual').length,
      abstained: values.filter(value => 'reason' in value).length,
    };
  });
}
