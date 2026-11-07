import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';


export async function loadPreferenceSource({pinnedObjects=false}={}){
  const revision='ffbdb191ac9eeb0d6e19a91db0c9fea4b476e49b';
  const source=await realpath('.local/ml-native-expansion/homeinventory');
  const parent=await realpath('.local');
  const destination=resolve(parent,'native-preference-homeinventory');
  assert.ok(source.startsWith(parent+sep));
  const execute=promisify(execFile);
  const git=async args=>(await execute('git',args,{cwd:source,windowsHide:true,timeout:10000,maxBuffer:2*1024*1024})).stdout.trim();
  const sha=data=>createHash('sha256').update(data).digest('hex');
  const blob=data=>createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
  assert.equal(await git(['rev-parse','HEAD']),revision);
  const entries=(await git(['ls-tree','-rz','--full-tree','HEAD'])).split('\0').filter(Boolean).map(entry=>{
    const match=entry.match(/^100(?:644|755) blob ([a-f0-9]{40})\t(.+)$/s);
    assert.ok(match,'Pinned regular source files required');
    return {expected:match[1],file:match[2]};
  });
  assert.ok(entries.length>0&&entries.length<=1000);
  const objectBytes=pinnedObjects?execFileSync('git',['cat-file','--batch'],{cwd:source,
    input:entries.map(({expected})=>expected).join('\n')+'\n',windowsHide:true,timeout:120000,maxBuffer:129*1024*1024}):undefined;
  let offset=0;
  const verified=[];
  let total=0;
  for(const {expected,file} of entries){
    const path=resolve(source,file),within=relative(source,path);
    assert.ok(!isAbsolute(within)&&within!=='..'&&!within.startsWith('..'+sep));
    let bytes;
    if(objectBytes){
      const end=objectBytes.indexOf(10,offset);
      assert.ok(end>=offset);
      const metadata=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(objectBytes.toString('ascii',offset,end));
      assert.ok(metadata?.[1]===expected,'Pinned object identity differs');
      const length=Number(metadata[2]);
      assert.ok(length<=8*1024*1024&&end+1+length<objectBytes.length);
      bytes=objectBytes.subarray(end+1,end+1+length);
      offset=end+1+length;
      assert.equal(objectBytes[offset++],10);
    }else{
      const info=await lstat(path);
      assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.size<=8*1024*1024);
      assert.ok((await realpath(path)).startsWith(source+sep));
      bytes=await readFile(path);
    }
    let canonical=bytes;
    if(!objectBytes&&blob(bytes)!==expected){
      const text=bytes.toString('utf8');
      assert.ok(!bytes.includes(0)&&Buffer.from(text).equals(bytes));
      canonical=Buffer.from(text.replaceAll('\r\n','\n'));
    }
    assert.equal(blob(canonical),expected,'Source differs from the pinned revision');
    total+=canonical.length;
    assert.ok(total<=128*1024*1024,'Native source exceeds its dedicated budget');
    assert.ok(!file.split('/').some(p=>p==='node_modules'||p==='.git')&&!/(?:^|\/)\.env$/.test(file));
    verified.push({file,bytes:canonical});
  }
  if(objectBytes)assert.equal(offset,objectBytes.length);
  const bytes=file=>{const entry=verified.find(e=>e.file===file);assert.ok(entry,file);return entry.bytes;};
  assert.match(bytes('LICENSE').toString(),/MIT License[\s\S]*Permission is hereby granted/);
  const paths=['LICENSE','package-lock.json','client/package-lock.json','server.js','app.js','database.js',
    'middleware/auth.js','routes/auth.js','config/i18n.js','utils/protectedFields.js','utils/runtimePaths.js',
    'client/src/i18n.ts','client/src/components/LanguageSwitcher.tsx','client/src/utils/languageSupport.ts'];
  const meta={version:1,role:'development-prototype-exposure',familyId:'upstream:asdteke/homeinventory',
    repository:'https://github.com/asdteke/HomeInventory',repositoryId:1184688688,revision,license:'MIT',
    licenseGitBlob:await git(['rev-parse','HEAD:LICENSE']),dependencyLockSha256:sha(bytes('package-lock.json')),
    clientDependencyLockSha256:sha(bytes('client/package-lock.json')),
    sourceSha256:Object.fromEntries(paths.map(file=>[file,sha(bytes(file))])),
    scope:'Native localization and authentication controls. Controlled readability and matching-name variants are development prototypes; training and qualification require separate gates.',
    excludeFromFutureHoldout:true,qualificationClaimed:false,
    sourceBytePolicy:'Exact Git blobs or hash-confirmed CRLF normalization. At most 1,000 files, 8 MiB/file, 128 MiB total.'};
  return {verified,source,destination,meta,total};

}
