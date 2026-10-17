import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const [native, label, revision = '7ed49fd'] = process.argv.slice(2);
const root = import.meta.dirname;
const dir = path.join(root, label);
await mkdir(dir, { recursive: true });
const bytes = await readFile(native);
const files = native.endsWith('.zip') ? unzipSync(bytes) : { [label]: bytes };
const manifest = JSON.parse(await readFile(path.join(root, '../practical-workloads-2026-10-16/manifest.json')));
const receipts = [];
for (const [name, data] of Object.entries(files)) {
  const id = manifest.records.find(r => name.startsWith(r.id))?.id;
  if (!id) throw Error(`Unexpected output ${name}`);
  const target = path.join(dir, name);
  await writeFile(target, data);
  receipts.push(JSON.parse(execFileSync(process.execPath, [path.join(root, '../practical-workloads-2026-10-16/verify-native.mjs'), id, target], { encoding: 'utf8' })));
}
await writeFile(path.join(root, `codex-${label}.json`), JSON.stringify({ source: `${revision} isolated build; actual Codex Browser file chooser and native Save`, receipts }, null, 2) + '\n');
console.log(JSON.stringify({ entries: receipts.length, frames: receipts.reduce((s,r)=>s+r.frames,0), mismatches: 0 }));
