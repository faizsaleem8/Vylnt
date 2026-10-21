import type { Report } from '../../../packages/core';
import { analyseEvidenceReport } from '../../../packages/ml/evidence-release';
self.onmessage = async (event: MessageEvent<Report>) => {
  try { self.postMessage({ analysis: await analyseEvidenceReport(event.data) }); }
  catch { self.postMessage({ error: 'Evidence analysis unavailable. Full findings remain accessible.' }); }
};
