import { it,expect } from 'vitest';
import { createReport } from '../packages/core';
import { measureFraming } from '../apps/cli/project-framing';
const report=createReport(crypto.randomUUID(),{url:'http://127.0.0.1/',scannedAt:'2026-10-28T00:00:00Z',headers:{},cookies:[],resources:[],scripts:[],domCollected:true});
it('rejects unscoped origins, credentials and invalid producer identity before browser access',async()=>{
  for(const url of ['https://example.invalid/','http://user:password@127.0.0.1/','ftp://127.0.0.1/','https://127.0.0.1/'])await expect(measureFraming({} as never,{...report,observation:{...report.observation,url}},{identityHash:'a'.repeat(64),check:async()=>true})).rejects.toThrow(/loopback/);
  await expect(measureFraming({} as never,report,{identityHash:'bad',check:async()=>true})).rejects.toThrow(/identity/);
});
it('honors pre-cancellation without starting the local parent server',async()=>{
  const abort=new AbortController();abort.abort();await expect(measureFraming({} as never,report,{identityHash:'a'.repeat(64),check:async()=>true},abort.signal)).rejects.toThrow();
});
