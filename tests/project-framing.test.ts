import { it,expect } from 'vitest';
import { createReport } from '../packages/core';
import { mergeFramedWrite,measureFraming } from '../apps/cli/project-framing';
const report=createReport(crypto.randomUUID(),{url:'http://127.0.0.1/',scannedAt:'2026-10-28T00:00:00Z',headers:{},cookies:[],resources:[],scripts:[],domCollected:true});
it('rejects unscoped origins, credentials and invalid producer identity before browser access',async()=>{
  for(const url of ['https://example.invalid/','http://user:password@127.0.0.1/','ftp://127.0.0.1/','https://127.0.0.1/'])await expect(measureFraming({} as never,{...report,observation:{...report.observation,url}},{identityHash:'a'.repeat(64),check:async()=>true})).rejects.toThrow(/loopback/);
  await expect(measureFraming({} as never,report,{identityHash:'bad',check:async()=>true})).rejects.toThrow(/identity/);
});
it('honors pre-cancellation without starting the local parent server',async()=>{
  const abort=new AbortController();abort.abort();await expect(measureFraming({} as never,report,{identityHash:'a'.repeat(64),check:async()=>true},abort.signal)).rejects.toThrow();
});

it('rejects arbitrary write paths and synthetic receipts before recording sensitivity',async()=>{
  for(const writePath of ['https://example.invalid/write','//example.invalid/write','/write?q=1','/write#fragment']){
    await expect(measureFraming({} as never,report,{identityHash:'a'.repeat(64),writePath,check:async()=>true})).rejects.toThrow(/path/);
  }
  for(const path of ['//127.0.0.1/landing','https://127.0.0.1/landing','/landing?private=value','/landing#fragment','/../landing']){
    await expect(measureFraming({} as never,report,{identityHash:'a'.repeat(64),writePath:'/write',
      writeRedirectPaths:[path,'/landing','/landing'],check:async()=>true})).rejects.toThrow(/destinations/);
  }
  expect(()=>mergeFramedWrite({} as never,{version:'vylnt-framing-v1',scanId:report.scanId,originalScanHash:'a'.repeat(64),checkIdentity:'a'.repeat(64),sameOrigin:'embedded',crossOrigin:'embedded',repeatedCrossOrigin:'embedded',coverage:'complete',witnessHash:'a'.repeat(64)})).toThrow(/receipt/);
});
