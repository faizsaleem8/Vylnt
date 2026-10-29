import type { Report } from '../core';
import { canonicalJson, contentHash } from '../core/integrity';
export { contentHash } from '../core/integrity';
import { reportStorageBytes } from '../core/report-size';
import type { InsightReport, StoredInsightReport } from '../core/insight-contracts';
import { analyseEvidenceReport, archivedEvidenceReleases, bundledEvidenceRelease } from './evidence-release';
import { verifyProjectEvidence,projectOwnerTag,type SealedProjectEvidence,type ProjectPublicKey } from '../core/project-evidence';

export const insightByteLimit = 1024 * 1024;
export class InsightSizeError extends Error {
  constructor(readonly bytes: number) { super('The combined insights report exceeds 1 MiB. No issues were dropped. Keep the full-data export and create a smaller scan.'); }
}
export async function freezeInsights(report: Report, project?:{seal:SealedProjectEvidence;keys:readonly ProjectPublicKey[]}): Promise<InsightReport> {
  const base = {originalScan:structuredClone(report),originalScanHash:await contentHash(report),analysis:await analyseEvidenceReport(report)};
  let content:InsightReport={version:'vynlt-frozen-insights-v1',...base};
  if(project){
    const seal=await verifyProjectEvidence(project.seal,report,project.keys);
    if(!seal||!seal.evidence.ownerTag)throw Error('Project evidence is not trusted or does not match the source scan or account binding.');
    content={version:'vylnt-frozen-insights-v2',...base,project:{seal,assessment:'not-enabled'}};
  }
  const bytes = reportStorageBytes(content);
  if (bytes > insightByteLimit) throw new InsightSizeError(bytes);
  return content;
}
/** Verify both canonical integrity and trusted evidence/template derivation, including direct database writes. */
export async function verifyFrozenInsights(stored: StoredInsightReport, keys:readonly ProjectPublicKey[]=[],ownerId?:string): Promise<boolean> {
  try{
  if (stored.id !== stored.hash || await contentHash(stored.content) !== stored.hash) return false;
  const version=stored.content.version;
  if (version !== 'vynlt-frozen-insights-v1'&&version!=='vylnt-frozen-insights-v2') return false;
  if(reportStorageBytes(stored.content)>insightByteLimit)return false;
  let project:Extract<InsightReport,{version:'vylnt-frozen-insights-v2'}>['project']|undefined;
  if(stored.content.version==='vylnt-frozen-insights-v2'){
    if(stored.content.project?.assessment!=='not-enabled')return false;
    const seal=await verifyProjectEvidence(stored.content.project.seal,stored.content.originalScan,keys);
    if(!seal?.evidence.ownerTag)return false;
    if(ownerId!==undefined&&seal.evidence.ownerTag!==await projectOwnerTag(seal.keyId,ownerId))return false;
    project={seal,assessment:'not-enabled'};
  }
  const modelHash = stored.content.analysis.model.hash;
  const releases = modelHash === null ? [null] : [bundledEvidenceRelease, ...archivedEvidenceReleases].filter(r => r?.modelHash === modelHash);
  for (const release of releases) {
    const base={originalScan:stored.content.originalScan,originalScanHash:await contentHash(stored.content.originalScan),analysis:await analyseEvidenceReport(stored.content.originalScan,release)};
    const trusted:InsightReport=project?{version:'vylnt-frozen-insights-v2',...base,project}:{version:'vynlt-frozen-insights-v1',...base};
    if (canonicalJson(trusted) === canonicalJson(stored.content)) return true;
  }
  return false;
  }catch{return false;}
}
