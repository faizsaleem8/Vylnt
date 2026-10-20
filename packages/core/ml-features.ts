import type { Report } from './index';

export const featureVersion = 'vynlt-alert-v1';
export const mlRules = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001', 'JS-002'] as const;
export const featureNames = [
  ...mlRules.map(rule => `rule_${rule}`),
  'severity_info', 'severity_low', 'severity_medium', 'severity_high', 'severity_critical',
  'confidence_low', 'confidence_medium', 'confidence_high',
  'headers_collected', 'dom_collected', 'cookies_collected', 'https',
  'cookie_count', 'script_count', 'external_script_fraction', 'mixed_resource_fraction',
] as const;

/** Numeric metadata only. No URLs, cookie names, raw evidence, notes, scores or labels. */
export function extractMlFeatures(report: Report, findingId: string): Record<string, number> {
  const finding = report.findings.find(item => item.id === findingId);
  if (!finding || !mlRules.includes(finding.ruleId as typeof mlRules[number])) throw new Error('Choose a finding from a supported rule');
  const observation = report.observation;
  const features: Record<string, number> = Object.fromEntries(featureNames.map(name => [name, 0]));
  features[`rule_${finding.ruleId}`] = 1;
  features[`severity_${finding.severity}`] = 1;
  features[`confidence_${finding.confidence}`] = 1;
  features.headers_collected = Number(observation.headers !== undefined);
  features.dom_collected = Number(observation.domCollected);
  features.cookies_collected = Number(observation.cookies !== undefined);
  const page = new URL(observation.url);
  features.https = Number(page.protocol === 'https:');
  features.cookie_count = Math.min(100, observation.cookies?.length ?? 0) / 100;
  features.script_count = Math.min(150, observation.scripts.length) / 150;
  features.external_script_fraction = observation.domCollected && observation.scripts.length ? observation.scripts.filter(script => new URL(script.url).origin !== page.origin).length / observation.scripts.length : 0;
  features.mixed_resource_fraction = observation.resources.length ? observation.resources.filter(resource => resource.url.startsWith('http:')).length / observation.resources.length : 0;
  return features;
}
