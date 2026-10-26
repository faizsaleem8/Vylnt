import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { canonicalJson } from '../core/integrity';
import { parseSubmission } from '../core/validation';
import { evidenceFeatureNames4, prepareProjectContexts, projectRules, verifyProjectEvidence, type ProjectPublicKey } from '../core/project-evidence';

const digest = z.string().regex(/^[a-f0-9]{64}$/), commit = z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/);
const sha = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const label = z.enum(['change-warranted','contextual','needs-review']);
export const projectSourceLockSchema = z.object({
  version:z.literal('vylnt-project-development-v1'), experiment:z.string().uuid(),
  assessmentPolicyHash:digest, harnessHash:digest,
  families:z.array(z.object({
    // Keep the existing private family identity; never replace it with a display name.
    familyId:z.string().min(1).max(256), repositoryId:z.number().int().positive(),
    repository:z.string().regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    partition:z.enum(['train','validation']), license:z.enum(['MIT','ISC','Apache-2.0','BSD-2-Clause','BSD-3-Clause']), licenseHash:digest,
    securityImplementationHashes:z.array(digest).min(1).max(100),
    revisions:z.array(z.object({commit,sourceHashes:z.array(digest).min(1).max(200)}).strict()).min(1).max(100),
    adapterHash:digest,oracleHash:digest,
  }).strict()).max(12),
}).strict();
export const projectOracleSchema = z.object({version:z.literal('vylnt-project-oracle-v1'),
  familyId:z.string(),scanHash:digest,evidenceHash:digest,commit,configHash:digest,adapterHash:digest,
  harnessHash:digest,sourceLockHash:digest,oracleHash:digest,scenarioHash:digest,category:z.enum(projectRules),findingId:z.string(),
  label,passed:z.literal(true),
}).strict();
type SourceLock = z.infer<typeof projectSourceLockSchema>;
type Exposure = {families:string[];variants:string[]};
type Input = {report:unknown;seal:unknown;oracle:unknown};
type Row = {family:string;variant:string;sequence:number[][];category:typeof projectRules[number];severity:string;
  label:z.infer<typeof label>;uncertain:boolean;evidenceRecord:string;scenario:string};

/** Developer-only preparation. Labels/oracles never enter the numeric tensor.
 * Source independence and oracle correctness still require checked source manifests;
 * hashes verify identity, not the truth of a developer's scenario specification. */
export async function prepareProjectData(inputs: Input[], source: unknown, exposure: Exposure, secret: string, trustedKeys: readonly ProjectPublicKey[]) {
  const lock=projectSourceLockSchema.parse(source);
  if(inputs.length>50000)throw Error('Project dataset input budget exceeded');
  if(secret.length<32)throw Error('Use the existing private family key (at least 32 characters)');
  for(const list of [exposure.families,exposure.variants]) if(!Array.isArray(list)||list.some(v=>!digest.safeParse(v).success))throw Error('Invalid exposure registry');
  const familyHash=(id:string)=>createHmac('sha256',secret).update('family:'+id).digest('hex');
  const repositories=new Set<number>(),urls=new Set<string>(),identities=new Set<string>(),implementations=new Set<string>(),trees=new Set<string>();
  for(const family of lock.families){
    const id=familyHash(family.familyId),url=family.repository.toLowerCase().replace(/\.git$/,'');
    if(family.familyId!=='upstream:'+url.slice('https://github.com/'.length))throw Error('Keep the canonical upstream family identity; display-name aliases are not families');
    if(identities.has(id)||repositories.has(family.repositoryId)||urls.has(url))throw Error('Repeated or renamed application family');
    if(exposure.families.includes(id))throw Error('Previously exposed family cannot enter this new development cohort');
    identities.add(id);repositories.add(family.repositoryId);urls.add(url);
    const ownImplementations=new Set(family.securityImplementationHashes);
    if([...ownImplementations].some(h=>implementations.has(h)))throw Error('Shared security implementation must remain one family');
    for(const h of ownImplementations)implementations.add(h);
    const ownTrees=new Set(family.revisions.map(r=>sha([...r.sourceHashes].sort())));
    if([...ownTrees].some(h=>trees.has(h)))throw Error('Duplicate source template cannot become a new family');
    for(const h of ownTrees)trees.add(h);
    if(new Set(family.revisions.map(r=>r.commit)).size!==family.revisions.length)throw Error('Duplicate revision');
  }
  const rows:Row[]=[],seen=new Set<string>(),scanFamilies=new Map<string,string>();
  const rejected:{reason:string;family:string;variant:string;record:string}[]=[];
  for(const input of inputs){
    if(Buffer.byteLength(canonicalJson(input.report))>512*1024)throw Error('Original scan exceeds 512 KiB');
    const original=z.object({scanId:z.string(),observation:z.unknown()}).passthrough().parse(input.report);
    const report=parseSubmission({scanId:original.scanId,observation:original.observation}),oracle=projectOracleSchema.parse(input.oracle);
    if(sha(report)!==sha(input.report))throw Error('Saved report is not a consistent sanitized rule report');
    const previous=scanFamilies.get(report.scanId);
    if(previous && previous!==oracle.familyId)throw Error('One scan cannot be assigned to different families');
    scanFamilies.set(report.scanId,oracle.familyId);
    const sealed=await verifyProjectEvidence(input.seal,report,trustedKeys);
    if(!sealed)throw Error('Invalid project provenance signature or scan binding');
    const evidence=sealed.evidence,family=lock.families.find(f=>f.familyId===oracle.familyId);
    if(!family)throw Error('Application is absent from frozen source selection');
    const revision=family.revisions.find(r=>r.commit===evidence.commit);
    if(!revision || !evidence.inspection || sha([...revision.sourceHashes].sort())!==sha([...evidence.inspection.sourceHashes].sort()))throw Error('Source revision or inspection mismatch');
    if(oracle.scanHash!==sha(report)||oracle.evidenceHash!==sha(evidence)||oracle.commit!==evidence.commit||oracle.configHash!==evidence.configHash||
      oracle.adapterHash!==family.adapterHash||oracle.adapterHash!==evidence.adapterHash||oracle.harnessHash!==lock.harnessHash||oracle.sourceLockHash!==sha(lock)||oracle.oracleHash!==family.oracleHash)throw Error('Oracle identity or same-run binding mismatch');
    const finding=report.findings.find(f=>f.id===oracle.findingId&&f.ruleId===oracle.category);
    if(!finding)throw Error('Oracle finding is not in the captured report');
    const context=prepareProjectContexts(report,evidence)(finding),variant=sha(context.sequence),opaque=familyHash(family.familyId),record=sha({evidence,oracle});
    if(exposure.variants.includes(variant)){rejected.push({reason:'previous-numeric-input',family:opaque,variant,record});continue;}
    // Repeated observations are one labelled evidence context, while conflicting
    // oracle outcomes survive below and force abstention for the whole variant.
    const key=canonicalJson([opaque,variant,oracle.label,context.requiresReview]);
    if(seen.has(key)){rejected.push({reason:'repeated-context',family:opaque,variant,record});continue;}seen.add(key);
    rows.push({family:opaque,variant,sequence:context.sequence,category:oracle.category,severity:finding.severity,
      label:oracle.label,uncertain:context.requiresReview||oracle.label==='needs-review',evidenceRecord:record,scenario:oracle.scenarioHash});
  }
  const assignments=Object.fromEntries(lock.families.map(f=>[familyHash(f.familyId),f.partition]));
  const groups=new Map<string,Row[]>();for(const row of rows){const group=groups.get(row.variant)??[];group.push(row);groups.set(row.variant,group);}
  const conflicts=new Set([...groups].filter(([,rr])=>new Set(rr.map(r=>r.label)).size>1||rr.some(r=>r.uncertain)).map(([v])=>v));
  for(const row of rows)if(conflicts.has(row.variant))row.uncertain=true;
  const crossPartition=new Set([...groups].filter(([,rr])=>new Set(rr.map(r=>assignments[r.family])).size>1).map(([v])=>v));
  const categories=Object.fromEntries(projectRules.map(category=>{
    const partitions=Object.fromEntries((['train','validation'] as const).map(part=>{
      const needed=part==='train'?30:15;
      const eligible=rows.filter(r=>r.category===category&&assignments[r.family]===part&&!r.uncertain&&!crossPartition.has(r.variant));
      const classes=Object.fromEntries((['change-warranted','contextual'] as const).map(label=>{
        const selected=eligible.filter(r=>r.label===label),contexts=new Set(selected.map(r=>r.variant)).size,families=new Set(selected.map(r=>r.family)).size;
        return[label,{contexts,families,requiredContexts:needed,ready:contexts>=needed&&families>=3}];
      }));return[part,{classes,ready:Object.values(classes).every(c=>c.ready)}];
    }));return[category,{partitions,ready:Object.values(partitions).every(p=>p.ready)}];
  }));
  const train=lock.families.filter(f=>f.partition==='train').length,validation=lock.families.filter(f=>f.partition==='validation').length;
  const ready=train===8&&validation===4&&Object.values(categories).every(c=>c.ready);
  const dataset={schemaVersion:'vylnt-evidence-v4',featureNames:[...evidenceFeatureNames4],sourceLockHash:sha(lock),examples:rows};
  return {dataset,split:{version:'vylnt-project-development-split-v1',sourceLockHash:sha(lock),families:assignments},rejected,
    audit:{version:'vylnt-project-development-audit-v1',datasetHash:sha(dataset),ready,trainFamilies:train,validationFamilies:validation,
      conflictingOrUnknownVariants:conflicts.size,crossPartitionVariants:crossPartition.size,categories,
      qualification:false,testPredictions:0,limitations:['Readiness is not qualification.','Independent source suitability and native functional coverage must be established before fitting.','Shared train/validation inputs are excluded from eligibility; all records are retained.']}};
}
