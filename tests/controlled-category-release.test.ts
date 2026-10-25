// Mechanical release fixtures only. They do not provide model qualification evidence.
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createReport } from '../packages/core';
import { evidenceRules } from '../packages/core/evidence-context';
import fixture from '../ml/fixtures/evidence-lstm-v3-parity.json';
import { analyseEvidenceReport, archivedEvidenceReleases } from '../packages/ml/evidence-release';
import type { ControlledCategoryRelease } from '../packages/ml/controlled-category-release';
import { contentHash, verifyFrozenInsights } from '../packages/ml/frozen-insights';
import { insightHtml } from '../apps/server/insight-html';
import * as numeric from '../packages/core/ml-lstm';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
function setup() {
  const modelJson = JSON.stringify(fixture.model);
  const categoryPolicyJson = JSON.stringify({ version: 1, safetyPolicy: 'controlled-category-v4', categories: Object.fromEntries(evidenceRules.map(rule => [rule, rule === 'JS-002' ? { supported: true, calibration: {temperature: 1}, thresholds: {contextual: .1, change: .9}, logisticCalibration: {temperature: 1}, logisticThresholds: {contextual: 0, change: 1}, validationCount: 32 } : {supported:false,reason:'missing-development-class'}])) });
  const release: ControlledCategoryRelease = { qualificationPolicy: 'vylnt-controlled-category-release-v1', name: 'UNIT MECHANICS ONLY', modelJson, modelHash: sha(modelJson), categoryPolicyJson, categoryPolicyHash: sha(categoryPolicyJson), candidateHash: 'a'.repeat(64), evaluationHash:'b'.repeat(64), registrationHash:'c'.repeat(64), holdoutHash:'d'.repeat(64), exposureHash:'e'.repeat(64), sourceLockHash:'f'.repeat(64), harnessHash:'1'.repeat(64), parityHash:'2'.repeat(64), datasetHash:fixture.model.datasetHash, splitHash:fixture.model.splitHash, testedScope:'Unit mechanics fixture; not application qualification', approvedCategories:['JS-002'], categories:{'JS-002':{changeCount:30,contextualCount:30,changeFamilies:5,contextualFamilies:5,precision:1,recall:1,coverage:1,highCriticalContextual:0,rulePrecision:.5,ruleRecall:1,testFamilies:10,insufficientEvidenceContextual:0}} };
  const report = createReport(crypto.randomUUID(), {url:'https://app.test/',scannedAt:'2026-10-26T00:00:00Z',headers:{'content-security-policy':"script-src 'self'"},cspEvidenceComplete:true,cookies:[],domCollected:true,resources:[],scripts:Array.from({length:71},(_,i)=>({url:`https://cdn.test/${i}.js`,integrity:false,scriptType:'classic' as const,async:false,defer:true}))});
  return {release,report};
}
describe('controlled category release mechanics',()=>{
  it('uses v3, groups 71 references, keeps unsupported rules in review and archives exact exports',async()=>{
    const {release,report}=setup(); const spy=vi.spyOn(numeric,'predictSequence').mockReturnValue(.01);
    try {
      const analysis=await analyseEvidenceReport(report,release);
      expect(analysis.inputSchema).toBe('vynlt-evidence-v3'); expect(analysis.schemaVersion).toBe('vylnt-insights-v2');
      expect(analysis.model.approvedCategories).toEqual(['JS-002']);
      expect(analysis.contextual).toHaveLength(1); expect(analysis.contextual[0].findingIds).toHaveLength(71); expect(spy).toHaveBeenCalledTimes(1);
      expect(analysis.issues.every(i=>i.assessment==='needs-review')).toBe(true);
      const content={version:'vynlt-frozen-insights-v1' as const,originalScan:report,originalScanHash:await contentHash(report),analysis};
      const hash=await contentHash(content); archivedEvidenceReleases.push(release);
      expect(insightHtml({id:hash,hash,createdAt:'2026-10-26T00:00:00Z',content}, '')).toContain('Controlled results are not independent');
      try {expect(await verifyFrozenInsights({id:hash,hash,createdAt:'2026-10-26T00:00:00Z',content})).toBe(true);} finally {archivedEvidenceReleases.pop();}
    } finally {spy.mockRestore();}
  });
  it('cannot hide incomplete or high-severity evidence, or a mixed group',async()=>{
    const {release,report}=setup(); const spy=vi.spyOn(numeric,'predictSequence').mockReturnValue(.01);
    try {
      report.findings.find(f=>f.ruleId==='JS-002')!.severity='high';
      expect((await analyseEvidenceReport(report,release)).issues.find(i=>i.category==='JS-002')?.assessment).toBe('needs-review');
      delete report.observation.cspEvidenceComplete;
      expect((await analyseEvidenceReport(report,release)).contextual).toHaveLength(0);
      report.observation.cspEvidenceComplete=true;
      report.observation.scripts[0].async=true;
      spy.mockReset().mockReturnValueOnce(.99).mockReturnValue(.01);
      expect((await analyseEvidenceReport(report,release)).issues.find(i=>i.category==='JS-002')?.assessment).toBe('change-warranted');
    } finally {spy.mockRestore();}
  });
  it('falls back for altered weights/policy, failed gates or unsupported schema',async()=>{
    const {release,report}=setup();
    for(const changed of [{...release,modelJson:release.modelJson+' '},{...release,categoryPolicyJson:release.categoryPolicyJson+' '},{...release,categories:{'JS-002':{...release.categories['JS-002'],recall:.94}}}]) expect((await analyseEvidenceReport(report,changed)).mode).toBe('evidence-summary');
  });
});
