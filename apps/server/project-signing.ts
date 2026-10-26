import { generateKeyPairSync, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { canonicalJson, contentHash } from '../../packages/core/integrity';
import { projectEvidenceSchema, type ProjectEvidence, type ProjectPublicKey, type SealedProjectEvidence } from '../../packages/core/project-evidence';
import { replaceFile } from './replace-file';
import { randomUUID } from 'node:crypto';

const keySchema = z.object({version:z.literal(1),privateKey:z.string().max(4096),spki:z.string().max(256),keyId:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const publicKeysSchema=z.array(z.object({spki:z.string().max(256),keyId:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).max(32);
export class ProjectSigner {
  private constructor(private data: z.infer<typeof keySchema>,readonly trustedKeys:readonly ProjectPublicKey[]) {}
  static async open(root: string) {
    await mkdir(root,{recursive:true});
    const path = join(root,'signing-key.json');
    try { await readFile(path); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const pair = generateKeyPairSync('ed25519');
      const spki = pair.publicKey.export({type:'spki',format:'der'}).toString('base64');
      const data = {version:1,spki,keyId:await contentHash({algorithm:'Ed25519',spki}),privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}).toString()};
      try { await writeFile(path,JSON.stringify(data),{flag:'wx',mode:0o600}); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
    }
    const data = keySchema.parse(JSON.parse(await readFile(path,'utf8')));
    if (data.keyId !== await contentHash({algorithm:'Ed25519',spki:data.spki}) || createPublicKey(createPrivateKey(data.privateKey)).export({type:'spki',format:'der'}).toString('base64') !== data.spki) throw Error('Invalid project signing identity');
    const archive=join(root,'trusted-public-keys.json');let keys:ProjectPublicKey[]=[];
    try{keys=publicKeysSchema.parse(JSON.parse(await readFile(archive,'utf8')));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    for(const key of keys)if(key.keyId!==await contentHash({algorithm:'Ed25519',spki:key.spki})||createPublicKey({key:Buffer.from(key.spki,'base64'),format:'der',type:'spki'}).asymmetricKeyType!=='ed25519')throw Error('Invalid archived project key');
    if(new Set(keys.map(k=>k.keyId)).size!==keys.length)throw Error('Repeated archived project key');
    if(!keys.some(key=>key.keyId===data.keyId)){
      keys.push({keyId:data.keyId,spki:data.spki});publicKeysSchema.parse(keys);
      const temporary=archive+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(keys),{flag:'wx',mode:0o600});await replaceFile(temporary,archive);
    }
    return new ProjectSigner(data,keys);
  }
  get publicKey(): ProjectPublicKey { return {keyId:this.data.keyId,spki:this.data.spki}; }
  seal(input: ProjectEvidence): SealedProjectEvidence {
    const evidence = projectEvidenceSchema.parse(input);
    return {version:'vylnt-project-seal-v1',evidence,keyId:this.data.keyId,signature:sign(null,Buffer.from(canonicalJson(evidence)),this.data.privateKey).toString('base64')};
  }
}
