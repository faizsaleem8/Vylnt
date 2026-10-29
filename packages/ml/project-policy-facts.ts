import type { Report } from '../core';
import { contentHash } from '../core/integrity';
import { projectRules, projectPolicy, projectEvidenceSchema, type ProjectEvidence, type ProjectFact } from '../core/project-evidence';

/** Independent strict syntax parser; never calls the detection-rule evaluator. */
export function parseHsts(value: string | undefined): { supported: boolean; positive?: boolean } {
  if (value === undefined || value.trim() === '') return {supported:true,positive:false};
  if (value.length >= 8192 || /[^\x09\x20-\x7e]/.test(value) || value.includes(',')) return {supported:false};
  let age: bigint | undefined;
  const names = new Set<string>();
  for (const part of value.split(';')) {
    if (!part.trim()) continue;
    const match = /^([a-z][a-z0-9-]*)(?:\s*=\s*(.*))?$/i.exec(part.trim()); if (!match) return {supported:false};
    const name = match[1].toLowerCase(); if (names.has(name)) return {supported:false}; names.add(name);
    if (name === 'max-age') {
      const digits = /^(?:([0-9]{1,20})|"([0-9]{1,20})")$/.exec(match[2] ?? ''); if (!digits) return {supported:false};
      age = BigInt(digits[1] ?? digits[2]); if (age > 18446744073709551615n) return {supported:false};
    } else if (['includesubdomains','preload'].includes(name)) { if (match[2] !== undefined) return {supported:false}; }
    else return {supported:false}; // Extension semantics not reconstructed.
  }
  return age === undefined ? {supported:false} : {supported:true,positive:age > 0n};
}

/** Deliberately narrow policy facts, not a full CSP evaluator or execution oracle. */
function restrictedSources(policy: string, directiveNames: string[],scriptTokens=false): boolean | undefined {
  if(policy.length>=8192 || /[^\x09\x20-\x7e]/.test(policy))return;
  const directives = new Map<string,string[]>();
  for (const part of policy.split(';')) {
    const [name,...values] = part.trim().split(/\s+/); if (!name) continue;
    if (!/^[a-z0-9-]+$/i.test(name)) return;
    if (!directives.has(name.toLowerCase())) directives.set(name.toLowerCase(),values);
  }
  const values = directiveNames.map(name=>directives.get(name)).find(v=>v !== undefined);
  if (!values) return false;
  if (values.length === 1 && values[0] === "'none'") return true;
  if (!values.length || values.includes("'none'")) return;
  if (values.some(v=>['*',"'unsafe-inline'","'unsafe-eval'",'http:','https:','data:'].includes(v))) return false;
  if (!values.every(v=>{if(v==="'self'")return true;if(scriptTokens){const token=/^'(nonce|sha256|sha384|sha512)-([A-Za-z0-9+/_-]+={0,2})'$/.exec(v);if(token){try{const bytes=atob(token[2].replaceAll('-','+').replaceAll('_','/')).length;return token[1]==='nonce'?bytes>=16&&bytes<=128:bytes===Number(token[1].slice(3))/8;}catch{return false;}}}if(!/^https:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?\/?$/i.test(v))return false;try{new URL(v);return true;}catch{return false;}})) return;
  return true;
}
export function parseScriptPolicySources(policy:string){return restrictedSources(policy,['script-src-elem','script-src','default-src'],true);}
/** Only the effective script directive; style nonces do not establish script intent. */
export function scriptPolicyUsesNonce(policy:string){
  const directives=new Map<string,string[]>();for(const raw of policy.split(';')){const [name,...values]=raw.trim().split(/\s+/);if(name&&!directives.has(name.toLowerCase()))directives.set(name.toLowerCase(),values);}
  const selected=['script-src-elem','script-src','default-src'].map(n=>directives.get(n)).find(v=>v!==undefined);
  return selected?.some(v=>v.startsWith("'nonce-"))??false;
}

export async function collectResponseFacts(report: Report, binding: Pick<ProjectEvidence,'runId'|'commit'|'configHash'|'adapterHash'>, tlsValidated: boolean): Promise<ProjectEvidence> {
  const witnessHash = await contentHash({headers:report.observation.headers ?? null, cspEvidenceComplete:report.observation.cspEvidenceComplete ?? null, tlsValidated});
  const fact = (value: boolean, source: ProjectFact['source'] = 'response'): ProjectFact => ({value,source,coverage:'complete',witnessHash});
  const h = report.observation.headers;
  const targets: ProjectEvidence['targets'] = report.findings.filter(f=>projectRules.includes(f.ruleId as typeof projectRules[number])).map(f=>{
    const facts: ProjectEvidence['targets'][number]['facts'] = {};
    if (f.ruleId === 'HDR-001') {
      facts.tlsValidated = fact(tlsValidated, 'browser');
      // The current scanner only returns the final response. Never invent a complete redirect chain.
      if (h) { const parsed = parseHsts(h['strict-transport-security']); facts.hstsSyntaxSupported = fact(parsed.supported); if (parsed.positive !== undefined) facts.hstsPositive = fact(parsed.positive); }
    }
    if (h && ['HDR-002','HDR-003'].includes(f.ruleId)) {
      const csp = h['content-security-policy'];
      if ((csp === undefined || report.observation.cspEvidenceComplete === true) && (csp?.split(',').length??0)<=16) {
        const decisions = csp?.split(',').map(p=>f.ruleId==='HDR-003'?parseScriptPolicySources(p):restrictedSources(p,['frame-ancestors'])) ?? [false];
        const restricted = decisions.includes(true) ? true : decisions.includes(undefined) ? undefined : false;
        if (f.ruleId === 'HDR-003') { facts.scriptPolicyEnforced = fact(Boolean(csp)); if (restricted !== undefined) facts.scriptSourcesRestricted = fact(restricted); }
        else {
          const xfo = h['x-frame-options']?.trim().toLowerCase();
          const xfoRestricted = ['deny','sameorigin'].includes(xfo ?? '');
          const hasAncestorDirective=/(?:^|[;,])\s*frame-ancestors(?:\s|;|,|$)/i.test(csp??'');
          if (restricted !== undefined) { facts.frameAncestorsRestricted = fact(restricted || (!hasAncestorDirective && xfoRestricted)); facts.framePolicyEnforced = fact(hasAncestorDirective || xfoRestricted); }
        }
      }
    }
    return {findingId:f.id,category:f.ruleId as typeof projectRules[number],facts};
  });
  return projectEvidenceSchema.parse({version:'vylnt-evidence-v4',policy:projectPolicy,...binding,scanId:report.scanId,originalScanHash:await contentHash(report),targets});
}
