import {build} from 'esbuild';
import {randomUUID} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const bundle=resolve('.local','native-etherpad-'+randomUUID()+'.mjs');
try{
  await build({entryPoints:['scripts/native-etherpad-smoke.mjs'],outfile:bundle,bundle:true,platform:'node',format:'esm',packages:'external',target:'node24'});
  await import(pathToFileURL(bundle).href);
}finally{await rm(bundle,{force:true});}
