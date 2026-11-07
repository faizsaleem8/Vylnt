import {writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {loadPreferenceSource} from './native-preference-source.mjs';
const {verified,destination,meta,total}=await loadPreferenceSource();
await mkdir(destination);
for(const entry of verified){
  const path=join(destination,entry.file);
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path,entry.bytes,{flag:'wx'});
}
await writeFile('ml/applications/native/homeinventory.source.json',JSON.stringify(meta,null,2)+'\n',{flag:'wx'});
await writeFile(join(destination,'vylnt-source-receipt.json'),JSON.stringify({
  version:1,revision,files:verified.length,bytes:total,locks:[meta.dependencyLockSha256,meta.clientDependencyLockSha256],
  eligibleForTraining:false,modelPredictions:0
},null,2)+'\n',{flag:'wx'});
console.log('Verified and staged '+verified.length+' source files ('+total+' bytes). No dependencies or application code executed.');
