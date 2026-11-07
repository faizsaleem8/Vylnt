// Preparation and read-only review only. Never installs/removes certificate trust.
import {build} from 'esbuild';
import {mkdir,readFile,writeFile,access,rm,realpath} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {randomUUID,X509Certificate} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
const action=process.argv[2];if(!['prepare','review'].includes(action)||process.argv.length!==3)throw Error('Use ml:projects:tls -- prepare|review. No trust store is modified.');
await mkdir('.local',{recursive:true});const compiled=resolve('.local/local-tls-'+randomUUID()+'.mjs');
await build({entryPoints:['packages/ml/local-tls.ts'],outfile:compiled,bundle:true,format:'esm',platform:'node',packages:'external'});
try{
  const M=await import(pathToFileURL(compiled).href),base=resolve('.local/ml-local-tls');
  if(action==='prepare'){
    await mkdir(base,{recursive:true});const actualBase=await realpath(base),privateRoot=await realpath('.local');
    if(!actualBase.startsWith(privateRoot+sep))throw Error('TLS preparation directory escapes .local');
    let present=true;try{await access(join(base,'active.json'));}catch(error){if(error.code!=='ENOENT')throw error;present=false;}
    if(!present){
      const id=randomUUID(),directory=join(base,id);await mkdir(directory,{mode:0o700});
      try{
      await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem'),'-subj','/CN=VYLNT localhost development',
        '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-addext','basicConstraints=critical,CA:FALSE','-addext','keyUsage=critical,digitalSignature,keyEncipherment','-addext','extendedKeyUsage=serverAuth'],
        {windowsHide:true,timeout:15000,env:{...process.env,MSYS_NO_PATHCONV:'1'}});
      const cert=await readFile(join(directory,'cert.pem')),key=await readFile(join(directory,'key.pem')),details=M.inspectLocalLeaf(cert,key);
      await writeFile(join(directory,'cert.cer'),new X509Certificate(cert).raw,{flag:'wx',mode:0o600});
      await writeFile(join(base,'active.json'),JSON.stringify({version:1,directory:id,scope:'localhost-only-leaf',...details},null,2),{flag:'wx',mode:0o600});
      }catch(error){
        const checked=await realpath(directory);if(!checked.startsWith(actualBase+sep))throw Error('Unexpected certificate cleanup target');
        await rm(checked,{recursive:true,force:true});throw error;
      }
    }
  }
  const prepared=await M.readPreparedLocalTls(),commands=M.localLeafCommands(prepared.directory,prepared.manifest.thumbprint);
  console.log(JSON.stringify({certificate:prepared.manifest,publicCertificate:join(prepared.directory,'cert.cer'),trustStoreChanged:false,...commands},null,2));
}finally{await rm(compiled,{force:true});}
