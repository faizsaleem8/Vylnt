import {it,expect,afterEach} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createReport} from '../packages/core';
import {contentHash} from '../packages/core/integrity';
import {prepareProjectContexts,guardProjectAssessment,projectScriptPolicy,projectInlinePolicy,permissiveInlineDirective,type ProjectFact} from '../packages/core/project-evidence';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {ProjectSigner} from '../apps/server/project-signing';
import {applyJingoScriptProfile,applyJingoTransportProfile,jingoEditorStylesheet,nativeHashedResponse,pinnedJingoBytes} from '../packages/ml/native-jingo-profile';
import {createBookwiseScriptSeedBatch,createJingoScriptSeedBatch,assembleNativeSeedCorpus,nativeSessionSources,type JingoScriptSeedControls} from '../packages/ml/project-seed-corpus';
import {bookwiseScriptLayout} from './native-bookwise-script';
import {scriptControlsPass,type ScriptControls} from '../apps/cli/project-script-function';
const secret='private-unit-family-key-'.repeat(3),roots:string[]=[];
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
it('moves exactly the generated hash policy without changing the native script',()=>{
  const script='<script>Jingo.init("");</script>',html='<head></head><body>'+script+'</body>';
  const fixture=applyJingoScriptProfile(html,'hashed-response'),response=nativeHashedResponse(fixture);
  expect(response.html).toBe(html);
  expect(response.policy).toMatch(/^script-src 'self' 'unsafe-inline' 'sha256-[A-Za-z0-9+/]{43}='$/);
  expect(nativeHashedResponse(fixture,'eval')).toEqual({html,policy:response.policy.replace('unsafe-inline','unsafe-eval')});
  expect(()=>nativeHashedResponse(fixture+fixture)).toThrow(/one generated/);
  expect(()=>nativeHashedResponse(fixture+'<meta http-equiv="content-security-policy" content="default-src *">')).toThrow(/competing/i);
});
it('requires string evaluation to fail after removing the token while the native interaction still works',()=>{
  const phase={complete:true,functionality:'passed',inline:'blocked',stringEvaluation:'executed',metaPolicy:{version:'vylnt-meta-policy-v1',status:'absent',policyCount:0,identityHash:'a'.repeat(64),mutated:false}} as const;
  const controls:ScriptControls={baseline:phase,restored:phase,disabled:{complete:true,functionality:'failed',inline:'unknown'}};
  expect(scriptControlsPass(controls)).toBe(false);
  controls.withoutUnsafeEval={...phase,stringEvaluation:'blocked'};
  expect(scriptControlsPass(controls)).toBe(true);
  controls.withoutUnsafeEval.functionality='unknown';
  expect(scriptControlsPass(controls)).toBe(false);
});
it('changes only the selected stylesheet reference on the native editor route',()=>{
  const style=`<link rel="stylesheet" href="${jingoEditorStylesheet}">`,script='<script src="/vendor/codemirror/codemirror.min.js"></script>';
  const html=style+script;
  expect(applyJingoTransportProfile(html,true,'http-style',8443)).toBe(style.replace(jingoEditorStylesheet,'http://127.0.0.1:8443'+jingoEditorStylesheet)+script);
  expect(applyJingoTransportProfile(html,true,'https-upgrade-style',8443)).toBe(style.replace(jingoEditorStylesheet,'http://vylnt-resource.test:8443'+jingoEditorStylesheet)+script);
  expect(applyJingoTransportProfile(html,false,'http-style',8443)).toBe(html);
  expect(()=>applyJingoTransportProfile(style+style,true,'http-style',8443)).toThrow(/one native/);
});
async function fixture(early=false,path='/private-editor',commit='10079c22d6cb66cfa0e7a91742c631fa0a153bd4',broad?:'response'|'meta'){
  const response=broad==='response', metaPresent=early||broad==='meta';
  const report=createReport(crypto.randomUUID(),{url:'http://127.0.0.1:4444'+path,scannedAt:'2026-11-05T00:00:00Z',headers:response?{'content-security-policy':permissiveInlineDirective}:{},cspEvidenceComplete:response,domCollected:true,cookies:[],resources:[],scripts:[{url:'http://127.0.0.1:4444/editor.js',integrity:false,scriptType:'classic',async:false,defer:false}]});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit,configHash:'a'.repeat(64),adapterHash:'b'.repeat(64)},false);
  evidence.policy=broad?projectInlinePolicy:projectScriptPolicy;evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['c'.repeat(64)],headerOperations:0,cookieOperations:0,sessionMiddlewareRegistrations:1};
  const meta={version:'vylnt-meta-policy-v1' as const,status:metaPresent?'early-supported' as const:'absent' as const,policyCount:metaPresent?1:0,identityHash:'d'.repeat(64),mutated:false,...(metaPresent?{restricted:early,beforeScripts:true}:{})};
  const phase={complete:true,functionality:'passed' as const,inline:early?'blocked' as const:'executed' as const,metaPolicy:meta};
  const controls:JingoScriptSeedControls={version:'vylnt-native-editor-oracle-v1',nativeWriteReadback:true,scanHash:await contentHash(report),checkIdentity:evidence.adapterHash,sourceScriptsHash:'e'.repeat(64),controls:{baseline:structuredClone(phase),disabled:{complete:true,functionality:'failed',inline:'unknown'},restored:structuredClone(phase)}};
  const witnessHash=await contentHash({version:'vylnt-script-function-v2',check:evidence.adapterHash,originalScanHash:controls.scanHash,sourceScripts:controls.sourceScriptsHash,controls:controls.controls});
  const fact=(value:boolean,source:ProjectFact['source']='functional'):ProjectFact=>({value,source,coverage:'complete',witnessHash});
  const finding=report.findings.find(f=>f.ruleId==='HDR-003')!,facts=evidence.targets.find(t=>t.category==='HDR-003')!.facts;
  Object.assign(facts,{cspProbeAllowed:fact(true),cspProbeBlocked:fact(early),...(metaPresent?{scriptPolicyEnforced:fact(true,'browser'),scriptSourcesRestricted:fact(early,'browser'),metaPolicyBeforeScripts:fact(true,'browser')}:{})});
  const root=await mkdtemp(join(tmpdir(),'vylnt-jingo-seed-'));roots.push(root);const signer=await ProjectSigner.open(root);
  const make=()=>createJingoScriptSeedBatch(report,signer.seal(evidence),signer.trustedKeys,controls,secret);
  return{report,evidence,controls,facts,finding,signer,make};
}
it('separates an ineffective enforcing header and a permissive early meta policy, using repeated native controls',async()=>{
  const variants=new Set<string>();
  for(const source of ['response','meta'] as const){
    const f=await fixture(false,undefined,undefined,source);
    const row=async()=>(await f.make()).rows.find(r=>r.category==='HDR-003');
    expect(await row()).toMatchObject({reason:'native-inline-permitted-'+source,label:'change-warranted',uncertain:false});
    variants.add((await row())!.variant);
    const context=prepareProjectContexts(f.report,f.evidence)(f.finding);
    expect(guardProjectAssessment(context,f.finding,'contextual')).toBe('needs-review');
    f.evidence.policy=projectScriptPolicy;
    expect((await row())?.uncertain).toBe(true);
    f.evidence.policy=projectInlinePolicy;
    f.controls.controls.restored.inline='unknown';
    expect((await row())?.uncertain).toBe(true);
  }
  expect(variants.size).toBe(2);
});
it('injects BookWise policy before scripts and excludes dynamic template expressions from the allowlist',()=>{
  const layout='<html><head><link href="https://fonts.googleapis.com/css2?family=Test" rel="stylesheet"><script src="/classes/ModalManager.js"></script></head><body><script>\nwindow.showLoginModal = {{#if showLoginModal}}true{{else}}false{{/if}};\n</script></body></html>';
  const header='<script>\r\nasync function updateNotifications() {}\r\n</script>';
  const restricted=bookwiseScriptLayout(layout,header,true);
  expect(restricted.indexOf('http-equiv')).toBeLessThan(restricted.indexOf('<script'));
  expect(restricted).toContain(createHash('sha256').update('\nasync function updateNotifications() {}\n').digest('base64'));
  expect(restricted).toContain(createHash('sha256').update('\nwindow.showLoginModal = false;\n').digest('base64'));
  expect(bookwiseScriptLayout(layout,header,false)).not.toMatch(/http-equiv|googleapis/);
  expect(()=>bookwiseScriptLayout(layout,header.replace('{}','{ {{user}} }'),true)).toThrow();
  expect(()=>bookwiseScriptLayout(layout.replace('<head>','<head><meta http-equiv="Content-Security-Policy">'),header,true)).toThrow();
});
it('keeps BookWise script controls bound to the pinned application and category editor',async()=>{
  for(const early of [false,true]){
    const f=await fixture(early,'/categories',nativeSessionSources.bookwise.commit);
    const batch=()=>createBookwiseScriptSeedBatch(f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,f.controls,secret);
    expect((await batch()).rows.find(r=>r.category==='HDR-003')).toMatchObject({uncertain:false,label:early?'contextual':'change-warranted'});
    await expect(f.make()).rejects.toThrow('provenance');
    f.controls.nativeWriteReadback=false;
    expect((await batch()).rows.find(r=>r.category==='HDR-003')?.uncertain).toBe(true);
  }
  for(const f of [await fixture(),await fixture(false,'/categories')]){
    await expect(createBookwiseScriptSeedBatch(f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,f.controls,secret)).rejects.toThrow(/scope|provenance/);
  }
});
it('accepts exact pinned Git bytes and only hash-confirmed Windows text normalization',()=>{
  const bytes=Buffer.from('first\nsecond\n'),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  expect(pinnedJingoBytes(bytes,blob)).toEqual(bytes);expect(pinnedJingoBytes(Buffer.from('first\r\nsecond\r\n'),blob)).toEqual(bytes);
  for(const bad of [Buffer.from('changed\r\nsecond\r\n'),Buffer.from([0,13,10]),Buffer.from([255,13,10])])expect(()=>pinnedJingoBytes(bad,blob)).toThrow('pinned Git blob');
});
it('injects only bounded pinned-layout policy profiles without replacing native scripts',()=>{
  const html='<html><head><title>Local</title></head><body><script>Jingo.init("");</script></body></html>';
  expect(applyJingoScriptProfile(html,'missing')).toBe(html);
  const early=applyJingoScriptProfile(html,'early-meta'),late=applyJingoScriptProfile(html,'late-meta');
  expect(early.indexOf('<meta')).toBeLessThan(early.indexOf('<script>'));expect(late.indexOf('<meta')).toBeGreaterThan(late.indexOf('</script>'));
  expect(early).toContain("script-src 'self' 'sha256-");expect(early).toContain('<script>Jingo.init("");</script>');
  for(const bad of [html.replace('Jingo.init("");','unrecognized()'),html.replace('<head>','<head><head>'),html.replace('<title>','<meta http-equiv="Content-Security-Policy"><title>'),'a'.repeat(512*1024+1)])expect(()=>applyJingoScriptProfile(bad,'early-meta')).toThrow();
});
it.each([false,true])('retains real class controls and keeps archived policies review-only (early=%s)',async early=>{
  const f=await fixture(early),context=prepareProjectContexts(f.report,f.evidence)(f.finding),row=(await f.make()).rows.find(r=>r.category==='HDR-003')!;
  expect(context.requiresReview).toBe(false);expect(row.label).toBe(early?'contextual':'change-warranted');expect(row.uncertain).toBe(false);
  expect(guardProjectAssessment(context,f.finding,early?'contextual':'change-warranted')).toBe(row.label);
  expect(guardProjectAssessment(context,{...f.finding,severity:'high'},'contextual')).toBe('needs-review');
  for(const policy of ['vylnt-project-assessment-v1','vylnt-project-assessment-v2','vylnt-project-assessment-v3','vylnt-project-assessment-v4'] as const)expect(prepareProjectContexts(f.report,{...f.evidence,policy})(f.finding).requiresReview).toBe(true);
});
it('requires matching scoped witness, source inspection and complete collection',async()=>{
  const f=await fixture(true),review=()=>prepareProjectContexts(f.report,f.evidence)(f.finding).requiresReview;
  f.facts.metaPolicyBeforeScripts!.witnessHash='0'.repeat(64);expect(review()).toBe(true);f.facts.metaPolicyBeforeScripts!.witnessHash=f.facts.cspProbeAllowed!.witnessHash;
  f.evidence.inspection!.sourceHashes=[];expect(review()).toBe(true);f.evidence.inspection!.sourceHashes=['a'.repeat(64)];
  f.facts.cspProbeBlocked!.coverage='partial';expect(review()).toBe(true);f.facts.cspProbeBlocked!.coverage='complete';
  f.report.observation.headers!['content-security-policy']="script-src 'self'";f.report.observation.cspEvidenceComplete=false;expect(review()).toBe(true);
  delete f.report.observation.headers;expect(review()).toBe(true);
});
it('requires repeated native functionality and denies labels with incomplete or late metadata',async()=>{
  const f=await fixture(true),initial=structuredClone(f.controls),label=async()=>(await f.make()).rows.find(r=>r.category==='HDR-003')!.label;
  for(const mutate of [()=>{f.controls.nativeWriteReadback=false;},()=>{f.controls.controls.disabled.functionality='passed';},()=>{f.controls.controls.baseline.complete=false;},()=>{f.controls.controls.restored.inline='executed';},()=>{f.controls.controls.baseline.metaPolicy!.beforeScripts=false;},()=>{f.controls.controls.baseline.metaPolicy!.status='needs-review';},()=>{f.controls.controls.baseline.metaPolicy!.nonceContext=true;},()=>{delete f.controls.sourceScriptsHash;}]){
    Object.assign(f.controls,structuredClone(initial));mutate();expect(await label()).toBe('needs-review');
  }
});
it('rejects source/scan/oracle tampering and cannot reinterpret another family',async()=>{
  const f=await fixture(true);f.controls.scanHash='0'.repeat(64);await expect(f.make()).rejects.toThrow('binding');f.controls.scanHash=await contentHash(f.report);
  f.controls.checkIdentity='0'.repeat(64);await expect(f.make()).rejects.toThrow('binding');f.controls.checkIdentity=f.evidence.adapterHash;
  f.evidence.commit='51e7cffa382da3d7c710cbfc0d136868c94eb119';await expect(f.make()).rejects.toThrow('provenance');
});
it('keeps source hashes and identifiers out of tensors; repeated profiles do not manufacture families',async()=>{
  const a=await fixture(false),b=await fixture(true),first=await a.make(),second=await b.make();
  expect(first.family).toBe(second.family);expect(first.rows.find(r=>r.category==='HDR-003')!.variant).not.toBe(second.rows.find(r=>r.category==='HDR-003')!.variant);
  const result=await assembleNativeSeedCorpus([first,second,first,second],secret);
  expect(result.audit.families).toBe(1);expect(result.audit.categories['HDR-003'].completeChangeContexts).toBe(1);expect(result.audit.categories['HDR-003'].contextualContexts).toBe(1);expect(result.audit.trainingReady).toBe(false);
  for(const value of [a.report.scanId,a.evidence.runId,'127.0.0.1','private-editor','editor.js',secret])expect(JSON.stringify(first)).not.toContain(value);
  const before=prepareProjectContexts(a.report,a.evidence)(a.finding).sequence;a.evidence.inspection!.sourceHashes=['0'.repeat(64)];
  expect(prepareProjectContexts(a.report,a.evidence)(a.finding).sequence).toEqual(before);
});
