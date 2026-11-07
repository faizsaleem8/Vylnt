import {build} from 'esbuild';
import {randomUUID,createHash,createHmac} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {parseArgs} from 'node:util';
const {positionals,values}=parseArgs({allowPositionals:true,options:{output:{type:'string'},registration:{type:'string'},'material-parent':{type:'string'},family:{type:'string'},hsts:{type:'boolean'}}});
const modulePath=resolve('.local','native-development-'+randomUUID()+'.mjs');
try{
  await build({entryPoints:['scripts/ml-native-development.ts'],outfile:modulePath,bundle:true,platform:'node',format:'esm',packages:'external'});
  await import(pathToFileURL(modulePath).href);
  if(positionals[0]==='prepare'){
    // Only reached after successful source, signature, split and oracle checks.
    const read=(dir,name)=>readFile(resolve(dir,name+'.json'),'utf8');
    const registration=JSON.parse(await read(values.registration,'registration'));
    const names=['dataset','split','audit','collection'];
    const fileHashes=Object.fromEntries(await Promise.all(names.map(async name=>[name,createHash('sha256').update(await read(values.output,name)).digest('hex')])));
    const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
    const signed=JSON.stringify([registration.registrationHash,...names.map(name=>fileHashes[name])]);
    const auth=createHmac('sha256',key).update('prepared-native-datasets:'+signed).digest('hex');
    await writeFile(resolve(values.output,'registration.json'),JSON.stringify({version:'vylnt-native-prepared-v1',registration,fileHashes,auth},null,2),{flag:'wx',mode:0o600});
  }
}finally{await rm(modulePath,{force:true});}
