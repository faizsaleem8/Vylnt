import {beforeAll,afterAll,it,expect} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {generateKeyPairSync,X509Certificate} from 'node:crypto';
import {inspectLocalLeaf,readPreparedLocalTls,localLeafCommands} from '../packages/ml/local-tls';
let root:string,cert:Buffer,key:Buffer,ca:Buffer,caKey:Buffer;
beforeAll(async()=>{
  const parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});root=await mkdtemp(join(parent,'local-tls-unit-'));
  for(const name of ['leaf','ca'])await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',join(root,name+'.key'),'-out',join(root,name+'.pem'),'-subj','/CN=local test',
    '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-addext','basicConstraints=critical,CA:'+(name==='ca'?'TRUE':'FALSE')],{windowsHide:true,timeout:15000,env:{...process.env,MSYS_NO_PATHCONV:'1'}});
  cert=await readFile(join(root,'leaf.pem'));key=await readFile(join(root,'leaf.key'));ca=await readFile(join(root,'ca.pem'));caKey=await readFile(join(root,'ca.key'));
},30000);
afterAll(async()=>{if(root)await rm(root,{recursive:true,force:true});});
it('accepts only a short-lived localhost leaf and returns public identity metadata',()=>{
  const details=inspectLocalLeaf(cert,key);expect(details.sha256).toMatch(/^[a-f0-9]{64}$/);expect(details.thumbprint).toMatch(/^[A-F0-9]{40}$/);
  expect(JSON.stringify(details)).not.toContain('PRIVATE KEY');
});
it('refuses an issuing CA, malformed certificates and a different private key',()=>{
  expect(()=>inspectLocalLeaf(ca,caKey)).toThrow('localhost-only leaf');expect(()=>inspectLocalLeaf(Buffer.from('invalid'),key)).toThrow();
  const other=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'});expect(()=>inspectLocalLeaf(cert,Buffer.from(other))).toThrow('does not match');
});
it('verifies the saved manifest, public DER identity and private-key binding',async()=>{
  const directory='11111111-1111-4111-8111-111111111111',target=join(root,directory);await mkdir(target);
  await writeFile(join(target,'cert.pem'),cert);await writeFile(join(target,'key.pem'),key);await writeFile(join(target,'cert.cer'),new X509Certificate(cert).raw);
  const manifest={version:1,directory,scope:'localhost-only-leaf',...inspectLocalLeaf(cert,key)};await writeFile(join(root,'active.json'),JSON.stringify(manifest));
  expect((await readPreparedLocalTls(root)).manifest.sha256).toBe(manifest.sha256);
  await writeFile(join(target,'cert.cer'),new X509Certificate(ca).raw);await expect(readPreparedLocalTls(root)).rejects.toThrow('registration changed');
});
it('quotes paths and restricts removal to the exact certificate identity',()=>{
  const commands=localLeafCommands("C:/a'b",'A'.repeat(40));expect(commands.trust).toContain("a''b");expect(commands.remove).toContain('FindByThumbprint');
  expect(commands.remove).toContain('A'.repeat(40));expect(commands.remove).not.toContain('Remove-Item -Recurse');
  expect(()=>localLeafCommands('.',"invalid; command")).toThrow();
});
