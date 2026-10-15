// Reuse the existing independent harness, changing only its artifact destination.
// No app/QA assertions, browser sandbox flags or network behavior are modified.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const original=new URL('../palette-improvements-qa.mjs',import.meta.url);
let source=fs.readFileSync(original,'utf8');
const from="path.resolve('bench/palette-improvements-review')";
if(source.split(from).length!==2)throw Error('Expected one output destination');
const record={sourceHarness:original.pathname,sourceHarnessSha256:createHash('sha256').update(source).digest('hex'),changes:['artifact destination','createRequire base URL retained for in-memory module']};
fs.writeFileSync(new URL('./edge-harness-record.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
source=source.replace(from,"path.resolve('bench/palette-follow-up-review')").replace('createRequire(import.meta.url)','createRequire('+JSON.stringify(original.href)+')');
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
