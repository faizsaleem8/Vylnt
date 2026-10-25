import { describe, expect, it } from 'vitest';
import { readDeploymentConfig } from '../apps/server/config';
import { readRateLimits } from '../apps/server/rate-limits';
import { readRateBackendConfig } from '../apps/server/shared-rate-limits';
import { verifyFrozenInsights } from '../packages/ml/frozen-insights';
import type { StoredInsightReport } from '../packages/core/insight-contracts';
import { insightHtml } from '../apps/server/insight-html';
import frozen from '../docs/examples/insight-report.json';
import { currentEvidenceRelease } from '../packages/ml/bundled-evidence';

describe('VYLNT branding compatibility', () => {
  it('accepts existing deployment and rate settings, preferring corrected names', () => {
    const old = { VYNLT_ALLOWED_ORIGINS: 'http://localhost:4318', VYNLT_TRUSTED_PROXIES: '127.0.0.1', VYNLT_RATE_IP_MAX: '42', VYNLT_RATE_STORE: 'memory' };
    expect(readDeploymentConfig(old, 4318).origins).toEqual(['http://localhost:4318']);
    expect(readDeploymentConfig(old, 4318).trustedProxies).toEqual(['127.0.0.1']);
    expect(readRateLimits(old).ipMax).toBe(42);
    expect(readRateBackendConfig(old).mode).toBe('memory');
    const both = { ...old, VYLNT_ALLOWED_ORIGINS: 'http://127.0.0.1:4318', VYLNT_TRUSTED_PROXIES: '::1', VYLNT_RATE_IP_MAX: '84' };
    expect(readDeploymentConfig(both, 4318).origins).toEqual(['http://127.0.0.1:4318']);
    expect(readDeploymentConfig(both, 4318).trustedProxies).toEqual(['::1']);
    expect(readRateLimits(both).ipMax).toBe(84);
  });
  it('keeps historical frozen content valid while displaying corrected model branding', async () => {
    const original = JSON.stringify(frozen);
    expect(await verifyFrozenInsights(frozen as StoredInsightReport)).toBe(true);
    const rendered = structuredClone(frozen) as StoredInsightReport;
    rendered.content.analysis.model.name = currentEvidenceRelease!.name;
    const html = insightHtml(rendered, '');
    expect(html).toContain('VYLNT controlled LSTM');
    expect(html).not.toContain('VYNLT controlled LSTM');
    expect(JSON.stringify(frozen)).toBe(original);
  });
});
