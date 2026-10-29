import type {Page,CDPSession,Browser} from 'playwright';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {contentHash} from '../../packages/core/integrity';
import {parseScriptPolicySources,scriptPolicyUsesNonce} from '../../packages/ml/project-policy-facts';

export const metaPolicyVersion='vylnt-meta-policy-v1';
export interface MetaPolicySummary {
  version:typeof metaPolicyVersion;status:'early-supported'|'absent'|'needs-review';
  policyCount:number;identityHash?:string;beforeScripts?:boolean;restricted?:boolean;mutated:boolean;
  nonceContext?:boolean;
}
const remembered=new WeakMap<Page,MetaPolicySummary>();
const tooling=new WeakMap<Browser,Promise<ReadonlySet<string>>>();
/** Learn only exact tooling hashes from a fresh, network-blocked blank context.
 * No script source is read and no website code can enter this calibration. */
async function toolingHashes(page:Page):Promise<ReadonlySet<string>>{
  const browser=page.context().browser();if(!browser)return new Set();
  let pending=tooling.get(browser);if(pending)return pending;
  pending=(async()=>{
    const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
    try{
      await context.route('**/*',route=>route.abort());await context.routeWebSocket('**/*',socket=>socket.close());
      const blank=await context.newPage(),session=await context.newCDPSession(blank),contexts=new Set<number>(),hashes=new Set<string>();
      session.on('Runtime.executionContextCreated',event=>{const aux=event.context.auxData as unknown as {isDefault?:boolean}|undefined;if(aux?.isDefault===true)contexts.add(event.context.id);});
      session.on('Debugger.scriptParsed',event=>{if(contexts.has(event.executionContextId)&&event.url===''&&!event.hasSourceURL&&/^[a-f0-9]{64}$/i.test(event.hash))hashes.add(event.hash);});
      await session.send('Runtime.enable');await session.send('Debugger.enable');await blank.goto('about:blank',{timeout:3000});
      await session.detach();return hashes.size<=16?hashes:new Set<string>();
    }finally{await context.close().catch(()=>{});}
  })().catch(()=>new Set<string>());
  tooling.set(browser,pending);return pending;
}
const snapshotSchema=z.object({url:z.string().max(8192),firstScript:z.boolean(),metas:z.array(z.object({kind:z.enum(['enforce','report-only']),content:z.string().max(8191),inHead:z.boolean(),beforeFirst:z.boolean()}).strict()).max(16)}).strict();
type Snapshot=z.infer<typeof snapshotSchema>;
/** Browser metadata only: initial paused-frame capture, final isolated-world read. */
function captureMetaDocument(){
  const first=document.scripts[0],metas=[...document.querySelectorAll('meta[http-equiv]')].filter(m=>/^(?:content-security-policy|content-security-policy-report-only)$/i.test(m.getAttribute('http-equiv')?.trim()??''));
  return {url:location.href,firstScript:Boolean(first),metas:metas.slice(0,17).map(m=>({kind:m.getAttribute('http-equiv')!.trim().toLowerCase()==='content-security-policy'?'enforce':'report-only',content:(m.getAttribute('content')??'').slice(0,8193),inHead:Boolean(document.head?.contains(m)),beforeFirst:Boolean(first&&(m.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING))}))};
}
function metaMutation(records:MutationRecord[]){
  const relevant=(value:string|null)=>/^(?:content-security-policy|content-security-policy-report-only)$/i.test(value?.trim()??'');
  const policyNode=(node:Node)=>node.nodeType===1&&(node.nodeName==='META'&&relevant((node as Element).getAttribute('http-equiv'))||[...(node as Element).querySelectorAll('meta[http-equiv]')].some(m=>relevant(m.getAttribute('http-equiv'))));
  if(records.length>4096)return true;
  return records.some(r=>r.type==='attributes'?r.target.nodeName==='META'&&(relevant((r.target as Element).getAttribute('http-equiv'))||r.attributeName==='http-equiv'&&relevant(r.oldValue)):[...r.addedNodes,...r.removedNodes].some(policyNode));
}
const unknown=(mutated=false):MetaPolicySummary=>({version:metaPolicyVersion,status:'needs-review',policyCount:0,mutated});
export async function summarizeMetaPolicy(first:unknown,final:unknown,mutated:boolean):Promise<MetaPolicySummary>{
  const a=snapshotSchema.safeParse(first),b=snapshotSchema.safeParse(final);
  if(!a.success||!b.success||Buffer.byteLength(JSON.stringify(a.data))>32768||Buffer.byteLength(JSON.stringify(b.data))>32768)return unknown(mutated);
  const identityHash=await contentHash(a.data),result:Omit<MetaPolicySummary,'status'>={version:metaPolicyVersion,policyCount:a.data.metas.length,identityHash,mutated};
  if(mutated||identityHash!==await contentHash(b.data)||!a.data.firstScript)return {...result,status:'needs-review'};
  if(!a.data.metas.length)return {...result,status:'absent'};
  const supported=a.data.metas.every(m=>m.kind==='enforce'&&m.inHead&&m.beforeFirst);
  const restrictions=a.data.metas.map(m=>parseScriptPolicySources(m.content));
  if(!supported||restrictions.includes(undefined))return {...result,status:'needs-review'};
  return {...result,status:'early-supported',beforeScripts:true,restricted:restrictions.includes(true),nonceContext:a.data.metas.some(m=>scriptPolicyUsesNonce(m.content))};
}
export const sourceMetaPolicy=(page:Page)=>remembered.get(page);
export async function metaPolicyStillMatches(page:Page,summary:MetaPolicySummary){
  if(!summary.identityHash)return false;
  try{const snapshot=await page.locator('html').evaluate(captureMetaDocument,undefined,{timeout:2000});return await contentHash(snapshot)===summary.identityHash;}catch{return false;}
}

/** Pause at the first supported application statement, capture metadata and a
 * private observer, then resume. Post-load DOM order alone is never timing proof. */
export async function observeMetaPolicy(page:Page,target:string){
  let session:CDPSession|undefined,breakpoint:string|undefined,world:number|undefined,worldScript:string|undefined,observerHandle:string|undefined,first:Snapshot|undefined;
  let captured=false,unsupported=false,closed=false,navigated=false,working:Promise<void>=Promise.resolve();
  const key='__vylnt_meta_'+randomUUID().replaceAll('-',''),expression='('+captureMetaDocument.toString()+')()';
  const worldName='VYLNT meta-policy '+key;
  const mutation='('+metaMutation.toString()+')';
  const scripts=new Map<string,{url:string;context:number;sourceURL:boolean;hash:string}>(),contexts=new Map<number,{main:boolean;frame:string}>(),pendingApplication=new Set<string>();
  async function cleanup(){
    if(closed)return;closed=true;
    if(session){
      if(observerHandle){await session.send('Runtime.callFunctionOn',{objectId:observerHandle,functionDeclaration:'function(){this.close();}',returnByValue:true,silent:true}).catch(()=>{});await session.send('Runtime.releaseObject',{objectId:observerHandle}).catch(()=>{});}
      if(breakpoint)await session.send('EventBreakpoints.removeInstrumentationBreakpoint',{eventName:breakpoint}).catch(()=>{});
      if(worldScript)await session.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:worldScript}).catch(()=>{});
      await session.send('Debugger.resume').catch(()=>{});await session.detach().catch(()=>{});
    }
    scripts.clear();contexts.clear();pendingApplication.clear();first=undefined;
  }
  try{
    const url=new URL(target);if(url.search||url.hash||url.username||url.password||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Unsupported meta-policy target');
    const trustedTooling=await toolingHashes(page);
    session=await page.context().newCDPSession(page);
    session.on('Runtime.executionContextCreated',event=>{const aux=event.context.auxData as unknown as {isDefault?:boolean;frameId?:string}|undefined;if(contexts.size>=200){unsupported=true;return;}contexts.set(event.context.id,{main:aux?.isDefault===true,frame:typeof aux?.frameId==='string'?aux.frameId:''});if(event.context.name===worldName)world=event.context.id;});
    session.on('Runtime.executionContextDestroyed',event=>{contexts.delete(event.executionContextId);if(world===event.executionContextId)world=undefined;});
    session.on('Debugger.scriptParsed',event=>{if(scripts.size>=200){unsupported=true;return;}scripts.set(event.scriptId,{url:event.url,context:event.executionContextId,sourceURL:event.hasSourceURL===true,hash:event.hash});
      if(navigated&&!captured&&contexts.get(event.executionContextId)?.main&&!(event.url===''&&!event.hasSourceURL&&trustedTooling.has(event.hash)))pendingApplication.add(event.scriptId);
    });
    await session.send('Page.enable');await session.send('Runtime.enable');await session.send('Debugger.enable');
    const {frameTree}=await session.send('Page.getFrameTree'),mainFrame=frameTree.frame.id;
    ({identifier:worldScript}=await session.send('Page.addScriptToEvaluateOnNewDocument',{source:'void 0;',worldName}));
    session.on('Page.frameNavigated',event=>{if(event.frame.id===mainFrame){if(event.frame.url===target)navigated=true;else if(navigated)unsupported=true;}});
    session.on('Debugger.paused',event=>{
      working=working.then(async()=>{
        if(!session||closed)return;
        const script=scripts.get(event.data?.scriptId??event.callFrames[0]?.location.scriptId),context=script&&contexts.get(script.context);
        const pauseTimer=setTimeout(()=>{unsupported=true;void session?.send('Debugger.resume').catch(()=>{});},1500);
        try{
          if(!context?.main||context.frame!==mainFrame)return;
          if(!navigated)return;
          if(script?.url===''&&!script.sourceURL&&trustedTooling.has(script.hash))return;
          if(captured)return;captured=true;
          if(event.data?.eventName!=='instrumentation:scriptFirstStatement'||!script||script.sourceURL||new URL(script.url).origin!==url.origin){unsupported=true;return;}
          if(pendingApplication.size>1){unsupported=true;return;}
          if(!world)throw Error('Meta world unavailable');
          // Disable instrumentation before evaluating observer code: otherwise
          // that evaluation creates a nested pause behind this paused handler.
          if(breakpoint){await session.send('EventBreakpoints.removeInstrumentationBreakpoint',{eventName:breakpoint});breakpoint=undefined;}
          const setup=`(()=>{const state={mutated:false,count:0,changed:${mutation},observer:new MutationObserver(records=>{state.count+=records.length;if(state.count>4096||state.changed(records)){state.mutated=true;state.observer.disconnect();}})};state.observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['http-equiv','content'],attributeOldValue:true});return {initial:JSON.stringify(${expression}),inspect(){const pending=state.observer.takeRecords();state.count+=pending.length;if(state.count>4096||state.changed(pending))state.mutated=true;return state.mutated;},close(){state.observer.disconnect();}};})()`;
          const response=await session.send('Debugger.evaluateOnCallFrame',{callFrameId:event.callFrames[0].callFrameId,expression:setup,returnByValue:false,silent:true});
          observerHandle=response.result.objectId;
          if(response.exceptionDetails||!observerHandle)throw Error('Meta snapshot failed');
          const properties=await session.send('Runtime.getProperties',{objectId:observerHandle,ownProperties:true});
          const initial=properties.result.find(p=>p.name==='initial')?.value?.value;
          if(typeof initial!=='string'||initial.length>32768)throw Error('Meta snapshot failed');first=snapshotSchema.parse(JSON.parse(initial));
          if(first.url!==target)unsupported=true;
        }catch{unsupported=true;}
        finally{
          clearTimeout(pauseTimer);
          if(captured&&breakpoint){await session.send('EventBreakpoints.removeInstrumentationBreakpoint',{eventName:breakpoint}).catch(()=>{});breakpoint=undefined;}
          await session.send('Debugger.resume').catch(()=>{});
        }
      }).catch(()=>{unsupported=true;void cleanup();});
    });
    await session.send('EventBreakpoints.setInstrumentationBreakpoint',{eventName:'scriptFirstStatement'});breakpoint='scriptFirstStatement';
  }catch{unsupported=true;await cleanup();}
  return {
    async finish():Promise<MetaPolicySummary>{
      let summary=unknown();
      try{
        await working;
        if(!unsupported&&session&&world&&first&&observerHandle){
          const changed=await session.send('Runtime.callFunctionOn',{objectId:observerHandle,functionDeclaration:'function(){return this.inspect();}',returnByValue:true,silent:true});
          const response=await session.send('Runtime.evaluate',{contextId:world,expression,returnByValue:true,disableBreaks:true,timeout:1000});
          if(!response.exceptionDetails&&!changed.exceptionDetails&&typeof changed.result.value==='boolean')summary=await summarizeMetaPolicy(first,response.result.value,changed.result.value);
        }
      }catch{summary=unknown();}
      finally{await cleanup();}
      remembered.set(page,Object.freeze(summary));return summary;
    },
    close:cleanup,
  };
}
