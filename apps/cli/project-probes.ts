import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import type { Page, Response } from 'playwright';
import { safeUrl, type Report } from '../../packages/core';
import { contentHash,canonicalJson } from '../../packages/core/integrity';
import { projectEvidenceSchema, type ProjectEvidence, type ProjectFact } from '../../packages/core/project-evidence';

export const browserProbeVersion = 'vylnt-project-browser-v1';
const issuedTransport=new WeakMap<BrowserMeasurement,string>();
export interface BrowserMeasurement {
  version: typeof browserProbeVersion;
  scanId: string;
  originalScanHash: string;
  responseChainComplete: ProjectFact;
  hstsApplicable?: ProjectFact;
  tlsValidated?: ProjectFact;
  cspProbeBlocked?: ProjectFact;
}

/** A browser-enforced inline probe. Execution is observed separately from a CSP event.
 * A timeout, Trusted Types rejection or navigation cannot establish CSP protection.
 * This deliberately says nothing about required application scripts functioning. */
export async function probeInlineScript(page: Page): Promise<'executed' | 'blocked' | 'unknown'> {
  const key = '__vylnt_probe_' + randomBytes(16).toString('hex');
  return page.evaluate(async key => {
    const state = window as unknown as Record<string, unknown>;
    let enforced = false;
    const listener = (event: SecurityPolicyViolationEvent) => {
      if (event.disposition === 'enforce' && event.blockedURI === 'inline' && ['script-src', 'script-src-elem'].includes(event.effectiveDirective)) enforced = true;
    };
    const script = document.createElement('script');
    document.addEventListener('securitypolicyviolation', listener);
    try {
      script.textContent = `window[${JSON.stringify(key)}] = true;`;
      (document.head ?? document.documentElement).appendChild(script);
      await new Promise(resolve => setTimeout(resolve, 200));
      if (state[key] === true) return 'executed' as const;
      return enforced ? 'blocked' as const : 'unknown' as const;
    } catch { return 'unknown' as const; }
    finally { script.remove(); delete state[key]; document.removeEventListener('securitypolicyviolation', listener); }
  }, key);
}

export async function measureProjectBrowser(page: Page, response: Response, report: Report, origins: ReadonlySet<string>, transport?:{strictTls:boolean}): Promise<BrowserMeasurement> {
  const capturedUrl=page.url();
  const chain: {url: string; status: number;tlsObserved:boolean}[] = [];
  let complete = true, request: ReturnType<Response['request']> | null = response.request();
  while (request) {
    if (chain.length >= 10 || !origins.has(new URL(request.url()).origin)) { complete = false; break; }
    const previousResponse = await request.response();
    if (!previousResponse) { complete = false; break; }
    let tlsObserved=false;
    if(new URL(request.url()).protocol==='https:'&&transport?.strictTls===true){
      try{const details=await previousResponse.securityDetails();tlsObserved=!!details&&/^TLS 1\.[23]$/.test(details.protocol??'');}catch{/* Unavailable details remain unknown. */}
    }
    chain.push({url: safeUrl(request.url()), status: previousResponse.status(),tlsObserved});
    request = request.redirectedFrom();
  }
  // Client-side navigation after the collected response invalidates its relationship.
  if (page.url()!==capturedUrl||capturedUrl!==response.url()||safeUrl(page.url()) !== report.observation.url || safeUrl(response.url()) !== report.observation.url) complete = false;
  const witnessHash = await contentHash({version:browserProbeVersion, chain, complete});
  const measurement: BrowserMeasurement = {version:browserProbeVersion, scanId:report.scanId, originalScanHash:await contentHash(report),
    responseChainComplete:{value:complete,source:'browser',coverage:complete?'complete':'partial',witnessHash}};
  const tlsValidated=transport?.strictTls===true&&complete&&chain.length>0&&chain.every(hop=>hop.tlsObserved);
  measurement.tlsValidated={value:tlsValidated,source:'browser',coverage:tlsValidated||transport?.strictTls===false?'complete':'partial',
    witnessHash:await contentHash({version:'vylnt-project-transport-v1',strictTls:transport?.strictTls??null,chain,complete})};
  // IP literals cannot be HSTS hosts. DNS/TLS/preload applicability is not guessed.
  if (isIP(new URL(report.observation.url).hostname.replace(/^\[|\]$/g, ''))) measurement.hstsApplicable = {
    value:false, source:'browser', coverage:'complete', witnessHash:await contentHash({version:browserProbeVersion,ipLiteral:true})};
  else if(tlsValidated)measurement.hstsApplicable={value:true,source:'browser',coverage:'complete',witnessHash:measurement.tlsValidated.witnessHash};
  if (complete && report.findings.some(f => f.ruleId === 'HDR-003')) {
    const result = await probeInlineScript(page);
    if (page.url() === capturedUrl && result !== 'unknown') measurement.cspProbeBlocked = {
      value:result === 'blocked', source:'functional', coverage:'complete', witnessHash:await contentHash({version:browserProbeVersion,probe:'unapproved-inline',result})};
  }
  if(page.url()!==capturedUrl){measurement.responseChainComplete.coverage='partial';measurement.responseChainComplete.value=false;
    measurement.tlsValidated={...measurement.tlsValidated,value:false,coverage:'partial'};
    if(measurement.hstsApplicable?.value!==false)delete measurement.hstsApplicable;}
  issuedTransport.set(measurement,canonicalJson(measurement));return measurement;
}

/** Internal, same-run measurements only; this is not an upload/provenance endpoint. */
export function mergeBrowserMeasurement(evidence: ProjectEvidence, measurement: BrowserMeasurement): ProjectEvidence {
  if (measurement.version !== browserProbeVersion || measurement.scanId !== evidence.scanId || measurement.originalScanHash !== evidence.originalScanHash) throw Error('Browser measurement does not match this scan');
  if(issuedTransport.get(measurement)!==canonicalJson(measurement))throw Error('Browser transport receipt missing or changed');
  const merged = structuredClone(evidence);
  for (const target of merged.targets) {
    if (target.category === 'HDR-001') {
      target.facts.responseChainComplete = measurement.responseChainComplete;
      if (measurement.hstsApplicable) target.facts.hstsApplicable = measurement.hstsApplicable;
      if (measurement.tlsValidated) target.facts.tlsValidated = measurement.tlsValidated;
    }
    if (target.category === 'HDR-003' && measurement.cspProbeBlocked) target.facts.cspProbeBlocked = measurement.cspProbeBlocked;
  }
  return projectEvidenceSchema.parse(merged);
}
