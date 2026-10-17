import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { candidate } from './candidate-transform.mjs';
const dir=path.resolve('.tmp/palette-count-candidates');await mkdir(dir,{recursive:true});
const source=(await readFile('.tmp/palette-usability-final/src/App.svelte','utf8')).replaceAll('\r\n','\n');
const label=process.argv[2]||'granular',before=path.join(dir,'before-App.svelte'),after=path.join(dir,label+'-App.svelte');await writeFile(before,source);await writeFile(after,candidate(source,label));
try{execFileSync('git',['diff','--no-index','--',before,after],{encoding:'utf8'});}catch(e){if(e.status!==1)throw e;await writeFile(path.join(import.meta.dirname,'candidate-'+label+'.patch'),e.stdout);}
