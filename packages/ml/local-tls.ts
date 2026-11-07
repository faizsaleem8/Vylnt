import {X509Certificate,createPrivateKey,createPublicKey} from 'node:crypto';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';

export interface LocalTlsManifest {version:1;directory:string;sha256:string;thumbprint:string;validTo:string;scope:'localhost-only-leaf';}
export function inspectLocalLeaf(cert:Buffer,key:Buffer,scope:'localhost'|'resource-fixture'='localhost'){
  const x=new X509Certificate(cert);
  const san=scope==='resource-fixture'?'DNS:vylnt-resource.test':'DNS:localhost, IP Address:127.0.0.1';
  if(x.ca||!x.verify(x.publicKey)||x.subject!==x.issuer||x.subjectAltName!==san)throw Error(scope==='localhost'?'Expected a self-signed localhost-only leaf certificate':'Expected a self-signed named fixture leaf certificate');
  if(Date.now()<Date.parse(x.validFrom)||Date.now()>=Date.parse(x.validTo)||Date.parse(x.validTo)-Date.parse(x.validFrom)>3*86400000)throw Error('Local leaf is expired or outside its short validity bound');
  if(!createPublicKey(createPrivateKey(key)).export({type:'spki',format:'der'}).equals(x.publicKey.export({type:'spki',format:'der'})))throw Error('Local TLS key does not match');
  return {sha256:x.fingerprint256.replaceAll(':','').toLowerCase(),thumbprint:x.fingerprint.replaceAll(':',''),validTo:x.validTo};
}
export async function readNamedFixtureTls(){
  const directory=await realpath(process.env.HOME??'');
  if(!/^\/tmp\/vylnt-upgrade\.[A-Za-z0-9]+$/.test(directory))throw Error('Use the isolated Linux trust helper');
  const cert=await readFile(join(directory,'leaf.pem')),key=await readFile(join(directory,'leaf-key.pem'));
  return {cert,key,directory,manifest:inspectLocalLeaf(cert,key,'resource-fixture')};
}
export async function readPreparedLocalTls(root='.local/ml-local-tls'){
  const privateRoot=await realpath('.local'),base=await realpath(root);
  if(!base.startsWith(privateRoot+sep))throw Error('Local TLS files must stay inside .local');
  const metadata=await lstat(join(base,'active.json'));if(!metadata.isFile()||metadata.isSymbolicLink()||metadata.size>4096)throw Error('Invalid TLS manifest');
  const m:LocalTlsManifest=JSON.parse(await readFile(join(base,'active.json'),'utf8'));
  if(m.version!==1||m.scope!=='localhost-only-leaf'||!/^[a-f0-9-]{36}$/.test(m.directory)||!/^[a-f0-9]{64}$/.test(m.sha256)||!/^[A-F0-9]{40}$/.test(m.thumbprint))throw Error('Invalid TLS manifest');
  const directory=await realpath(join(base,m.directory));if(!directory.startsWith(base+sep))throw Error('Local TLS directory escapes its registration');
  async function bounded(name:string){const path=join(directory,name),stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384)throw Error('Invalid local TLS file');return readFile(path);}
  const cert=await bounded('cert.pem'),key=await bounded('key.pem'),der=await bounded('cert.cer'),details=inspectLocalLeaf(cert,key);
  if(details.sha256!==m.sha256||details.thumbprint!==m.thumbprint||details.validTo!==m.validTo||!new X509Certificate(cert).raw.equals(der))throw Error('Local TLS registration changed');
  return {manifest:m,directory,cert,key};
}
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
export function localLeafCommands(directory:string,thumbprint:string){
  if(!/^[A-F0-9]{40}$/.test(thumbprint))throw Error('Invalid certificate thumbprint');
  const cert=quote(resolve(directory,'cert.cer'));
  return {trust:`$certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(${cert})\nif ($certificate.Thumbprint -ne '${thumbprint}') { throw 'Certificate identity changed' }\nImport-Certificate -FilePath ${cert} -CertStoreLocation 'Cert:\\CurrentUser\\Root'`,
    remove:`$store = [System.Security.Cryptography.X509Certificates.X509Store]::new('Root','CurrentUser')\ntry {\n$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)\n$matches = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,'${thumbprint}',$false)\nforeach ($certificate in $matches) { $store.Remove($certificate) }\n} finally { $store.Close() }`};
}
