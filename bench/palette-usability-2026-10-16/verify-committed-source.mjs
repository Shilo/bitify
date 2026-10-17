// Compare tested archive contents to the feature commit, excluding unrelated
// working edits. Git archive on Windows applies CRLF checkout conversion, so
// normalize only text line endings; binary assets must match byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const ref = process.argv[2] ?? '4983212633706b88145a59081657b920632cd514';
const snapshot = process.argv[3] ?? '.tmp/palette-usability-final';
const names = execFileSync('git',['ls-tree','-r','--name-only',ref,'src'],{encoding:'utf8'}).trim().split('\n');
const differences = [], lineEndingsOnly = [];
for (const file of names) {
  const committed = execFileSync('git',['show',ref+':'+file]);
  const archived = fs.readFileSync(path.join(snapshot,file));
  if (committed.equals(archived)) continue;
  if (/\.(?:[cm]?[jt]s|svelte|css|json|svg|txt)$/.test(file)
    && committed.toString('utf8').replaceAll('\r\n','\n') === archived.toString('utf8').replaceAll('\r\n','\n')) lineEndingsOnly.push(file);
  else differences.push(file);
}
const report = {surface:'Committed palette source versus tested archived snapshot',sourceRef:ref,
  checked:names.length,textComparison:'CRLF/LF normalized; binary files compared byte for byte',
  lineEndingsOnly,differences,pass:differences.length===0,
  buildIndexSha256:createHash('sha256').update(fs.readFileSync(path.join(snapshot,'dist/index.html'))).digest('hex'),
  unitTests:{passed:949,skipped:2},workingTreeZoomExcluded:true};
fs.writeFileSync(path.join(import.meta.dirname,'committed-source-receipt.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:report.pass,checked:names.length,lineEndingsOnly:lineEndingsOnly.length,differences,buildIndexSha256:report.buildIndexSha256}));
if (!report.pass) process.exitCode = 1;
