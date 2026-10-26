import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
const {values}=parseArgs({options:{repo:{type:'string'},code:{type:'string'},api:{type:'string',default:'http://127.0.0.1:4318'}}});
try {
  if (!values.repo || !values.code) throw Error('Use --repo <repository root> --code <one-time dashboard pairing code> [--api <local API origin>]');
  const url=new URL(values.api!);
  if (url.protocol!=='http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.username || url.password || url.pathname!=='/' || url.search || url.hash) throw Error('Use a plain loopback HTTP API origin');
  const response=await fetch(new URL('/api/project-pairings/claim',url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:values.code,path:resolve(values.repo)}),signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Error('Registration failed. Check the API, repository root and one-time pairing code.');
  const project=await response.json();
  console.log(`Registered local project ${project.id}. Return to the dashboard Projects section to start a fresh scan.`);
} catch(error) { console.error(error instanceof Error?error.message:'Project registration failed');process.exitCode=2; }
