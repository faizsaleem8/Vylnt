import {build} from 'esbuild';
import {randomUUID} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const module=resolve('.local','material-development-'+randomUUID()+'.mjs');
try{
  await build({entryPoints:['scripts/ml-material-development.ts'],outfile:module,bundle:true,platform:'node',format:'esm',packages:'external'});
  await import(pathToFileURL(module).href);
}finally{await rm(module,{force:true});}
