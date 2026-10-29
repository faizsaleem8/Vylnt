import { afterEach, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { inspectProject } from '../apps/server/project-inspection';
import { gateConfigSchema } from '../apps/cli/gate-config';
const dirs:string[]=[];
afterEach(async()=>{for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true});});
async function inspect(source:string,untracked?:string){
  const root=await mkdtemp(join(tmpdir(),'vylnt-inspection-'));dirs.push(root);
  const execute=promisify(execFile),git=(args:string[])=>execute('git',args,{cwd:root,windowsHide:true});
  await git(['init','-q']);await writeFile(join(root,'server.mjs'),source);await git(['add','server.mjs']);if(untracked)await writeFile(join(root,'untracked.mjs'),untracked);
  return inspectProject({app:root,checkout:root,commit:'a'.repeat(40),configHash:'b'.repeat(64),config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/']}),signal:new AbortController().signal});
}
it('inventories explicit Express syntax without persisting values, source, filenames or purpose',async()=>{
  const source="import express from 'express'; import session from 'express-session'; const app=express(); app.use(session({secret:'PRIVATE_SECRET'}));app.get('/',(req,res)=>{res.set('X-Frame-Options','DENY');res.cookie('session','PRIVATE_VALUE');});";
  const result=await inspect(source,source);
  expect(result).toMatchObject({framework:'express',coverage:'complete',headerOperations:1,cookieOperations:1,sessionMiddlewareRegistrations:1});expect(result.sourceHashes).toHaveLength(1);
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|server\.mjs|res\.cookie|cookieAuthDependency/);
});
it('does not treat similarly named arbitrary code as an Express response adapter',async()=>{
  expect(await inspect("const app=factory();app.get('/',(req,res)=>res.cookie('session','value'));" )).toMatchObject({framework:'unsupported',cookieOperations:0});
});
it('recognizes a bounded exported Express initializer while retaining partial inventory coverage',async()=>{
  const result=await inspect("var express=require('express');var session=require('express-session');var app;module.exports.initialize=function(config){app=express();app.use(session({secret:'PRIVATE'}));app.get('/',(req,res)=>res.cookie('session','PRIVATE_VALUE'));};module.exports.getInstance=function(){if(!app)throw Error('not initialized');return app;};");
  expect(result).toMatchObject({framework:'express',coverage:'partial',cookieOperations:1,sessionMiddlewareRegistrations:1});expect(JSON.stringify(result)).not.toMatch(/PRIVATE|initialize|session\('/);
});
it.each([
    "var express=require('express');var app;exports.init=function(express){app=express();};",
    "var express=require('express');var app;exports.init=function(){var express=other;app=express();};",
    "var express=require('express');var app;exports.init=function(){app=express();app=other();};",
    "var express=require('express');var app;exports.init=function(){if(enabled)app=express();};",
    "var express=require('express');var app;express=other;exports.init=function(){app=express();};",
    "var express=require('express');var app;exports.init=function(){app=express();};app++;",
    "var express=require('express');var express=other;var app;exports.init=function(){app=express();};",
    "var express=require('express');var {express}=other;var app;exports.init=function(){app=express();};",
    "var require=other;var express=require('express');var app;exports.init=function(){app=express();};",
    "var express=require('express');require=other;var app;exports.init=function(){app=express();};",
    "var express=require('express');var module={exports:{}};var app;module.exports.init=function(){app=express();};",
  ])('does not resolve shadowed, reassigned or conditional exported initializer %#',async source=>{
  expect((await inspect(source)).framework).toBe('unsupported');
});
it('marks nested scopes and oversized files incomplete instead of fabricating static resolution',async()=>{
  expect(await inspect("const express=require('express');const app=express();app.get('/',(req,res)=>{function another(res){res.cookie('name','value');}});")).toMatchObject({framework:'express',coverage:'partial',cookieOperations:0});
  expect(await inspect('//'+ 'x'.repeat(65536))).toMatchObject({framework:'unsupported',coverage:'partial',sourceHashes:[]});
});
