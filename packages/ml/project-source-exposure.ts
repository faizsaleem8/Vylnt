import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {z} from 'zod';

const digest=z.string().regex(/^[a-f0-9]{64}$/);
const prototype=z.object({version:z.literal(1),role:z.literal('development-prototype-exposure'),
  familyId:z.string().min(1),repository:z.string().regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/),
  repositoryId:z.number().int().positive().optional(),revision:z.string().regex(/^[a-f0-9]{40}$/),
  excludeFromFutureHoldout:z.literal(true),qualificationClaimed:z.literal(false),
  sourceSha256:z.record(z.string(),digest).optional()});
export type NativeExposure=z.infer<typeof prototype>;

/** Public source identities only. Never read prototype accounts, cookies or keys. */
export async function readNativeProjectExposures(directory=resolve('ml/applications/native')){
  const names=(await readdir(directory)).filter(name=>name.endsWith('.source.json')).sort();
  // Removing a known exposure must fail closed, not make its family fresh again.
  if(!names.includes('jingo.source.json')||!names.includes('tabinator.source.json')||names.length>200)throw Error('Native development exposure inventory is missing or exceeds its budget');
  const records:NativeExposure[]=[];
  for(const name of names){
    const path=resolve(directory,name),info=await lstat(path);
    if(!info.isFile()||info.isSymbolicLink()||info.size>64*1024)throw Error('Native exposure record is not a bounded regular file');
    const bytes=await readFile(path);if(bytes.length>64*1024)throw Error('Native exposure record exceeds its budget');
    records.push(prototype.parse(JSON.parse(bytes.toString('utf8'))));
  }
  if(new Set(records.map(record=>record.repository.toLowerCase())).size!==records.length)throw Error('Repeated native exposure repository');
  return records;
}

interface ProposedFamily {familyId:string;repository:string;repositoryId:number;securityImplementationHashes:string[];revisions:{commit:string;sourceHashes:string[]}[]}
/** Detection of known development reuse complements the historical numeric
 * registry. It is not a certificate of independence for unknown repositories. */
export function assertFreshNativeSources(families:ProposedFamily[],records:NativeExposure[]){
  for(const family of families)for(const record of records){
    const implementations=new Set(Object.entries(record.sourceSha256??{}).filter(([path])=>/\.(?:[cm]?[jt]s|sql)$/.test(path)).map(([,hash])=>hash));
    const overlap=family.familyId.toLowerCase()===record.familyId.toLowerCase()
      ||family.repository.toLowerCase()===record.repository.toLowerCase()
      ||record.repositoryId!==undefined&&family.repositoryId===record.repositoryId
      ||family.revisions.some(revision=>revision.commit===record.revision||revision.sourceHashes.some(hash=>implementations.has(hash)))
      ||family.securityImplementationHashes.some(hash=>implementations.has(hash));
    if(overlap)throw Error('Holdout reuses a development-exposed native application: '+record.repository);
  }
}
