import {expect,it} from 'vitest';
import {parseSubmission} from '../packages/core/validation';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {prepareProjectContexts,projectTransportPolicy,projectScriptPolicy,guardProjectAssessment} from '../packages/core/project-evidence';
import {applyJingoTransportProfile} from '../packages/ml/native-jingo-profile';
import {mergeCrossSiteMutation} from '../apps/cli/project-cross-site';
import {mergeHstsActivation,mergeHstsDisable} from '../apps/cli/project-hsts-plaintext';

const fact=(value:boolean,source:'browser'|'functional')=>({value,source,coverage:'complete' as const,witnessHash:'b'.repeat(64)});
async function measured(header?:string){
  const report=parseSubmission({scanId:crypto.randomUUID(),observation:{url:'https://localhost/editor',scannedAt:'2026-11-06T00:00:00.000Z',
    headers:header?{'strict-transport-security':header}:{},cspEvidenceComplete:true,domCollected:true,scripts:[],resources:[],
    cookies:[{name:'session',secure:true,httpOnly:true,sameSite:'no_restriction',session:true}]}});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),adapterHash:'b'.repeat(64),configHash:'c'.repeat(64)},false);
  evidence.policy=projectTransportPolicy;evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['d'.repeat(64)],headerOperations:0,cookieOperations:1,sessionMiddlewareRegistrations:1};
  return{report,evidence};
}
it('assesses an explicit HSTS directive only with observed valid HTTPS and complete response coverage',async()=>{
  const {report,evidence}=await measured('max-age=086400'),target=evidence.targets.find(t=>t.category==='HDR-001')!,finding=report.findings.find(f=>f.id===target.findingId)!;
  Object.assign(target.facts,{tlsValidated:fact(true,'browser'),hstsApplicable:fact(true,'browser'),responseChainComplete:fact(true,'browser')});
  const check=()=>prepareProjectContexts(report,evidence)(finding);
  expect(check().requiresReview).toBe(false);expect(guardProjectAssessment(check(),finding,'contextual')).toBe('contextual');
  evidence.policy=projectScriptPolicy;expect(check().requiresReview).toBe(true);evidence.policy=projectTransportPolicy;
  target.facts.tlsValidated!.coverage='partial';expect(check().requiresReview).toBe(true);
  delete report.observation.headers!['strict-transport-security'];expect(check().requiresReview).toBe(true);
});
it('a reproduced cross-site mutation supports change only, and never confers complete route coverage',async()=>{
  const {report,evidence}=await measured(),target=evidence.targets.find(t=>t.category==='CK-003')!,finding=report.findings.find(f=>f.id===target.findingId)!;
  Object.assign(target.facts,{cookieAuthDependency:fact(true,'functional'),csrfChecksPassed:fact(false,'functional')});
  const check=()=>prepareProjectContexts(report,evidence)(finding);
  expect(check().requiresReview).toBe(false);expect(check().projectFacts.stateChangingRoutesCovered).toBe('unknown');
  expect(guardProjectAssessment(check(),finding,'contextual')).toBe('needs-review');
  evidence.policy=projectScriptPolicy;expect(check().requiresReview).toBe(true);evidence.policy=projectTransportPolicy;
  target.facts.csrfChecksPassed!.value=true;expect(check().requiresReview).toBe(true);
  expect(()=>mergeCrossSiteMutation(evidence,{} as never)).toThrow('receipt');
});
it('does not admit an unissued active HSTS removal receipt',async()=>{
  const {evidence}=await measured('max-age=0');
  const result={version:'vylnt-hsts-plaintext-probe-v1',scanHash:evidence.originalScanHash,adapterHash:evidence.adapterHash,
    plaintextBeforeControl:true,controlTlsValidated:true,plaintextAfterControl:false,tlsAfterControl:true,
    nativeZeroDirective:true,plaintextAfterReset:true} as const;
  await expect(mergeHstsDisable(evidence,result)).rejects.toThrow('receipt');
  expect(evidence.targets.find(t=>t.category==='HDR-001')?.facts.hstsPreloadConfirmed).toBeUndefined();
});
it('does not admit an unissued native HSTS activation receipt',async()=>{
  const {evidence}=await measured('max-age=086400');
  const result={version:'vylnt-hsts-plaintext-probe-v1',scanHash:evidence.originalScanHash,adapterHash:evidence.adapterHash,
    plaintextBeforeControl:true,controlTlsValidated:true,plaintextAfterControl:false,tlsAfterControl:true,
    nativePositiveDirective:true,baselineResetVerified:true} as const;
  await expect(mergeHstsActivation(evidence,result)).rejects.toThrow('receipt');
  expect(evidence.targets.find(t=>t.category==='HDR-001')?.facts.hstsPreloadConfirmed).toBeUndefined();
});
it('changes exactly one native editor script reference and rejects missing or ambiguous matches',()=>{
  const src='<script src="/vendor/codemirror/codemirror.min.js"></script>';
  expect(applyJingoTransportProfile(src,true,'http-editor',5000)).toContain('http://127.0.0.1:5000/vendor/codemirror/codemirror.min.js');
  expect(applyJingoTransportProfile(src,true,'hsts-positive',5000)).toBe(src);
  for(const input of ['',src+src])expect(()=>applyJingoTransportProfile(input,true,'http-editor',5000)).toThrow();
});
