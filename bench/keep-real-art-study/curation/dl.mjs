// Usage: node dl.mjs <rawRoot> <n> <url>...  Downloads into a NEW empty <rawRoot>/<n>/ and appends a ledger row.
// Refuses an existing directory and anything over 60 MB. Downloads are data only; nothing is executed.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const [root, n, ...urls] = process.argv.slice(2);
const dir = path.join(root, n);
await fs.mkdir(dir, { recursive: false });
const ledger = new URL('./downloads.jsonl', import.meta.url);
for (const url of urls) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) { console.log('FAIL', res.status, url); continue; }
  const len = +res.headers.get('content-length') || 0;
  if (len > 60e6) { console.log('SKIP too big', len, url); await res.body?.cancel(); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const name = decodeURIComponent(new URL(res.url).pathname.split('/').pop()).replace(/[^\w.\- ]/g, '_');
  await fs.writeFile(path.join(dir, name), buf);
  const row = { n, url, finalUrl: res.url, file: path.join(dir, name), bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), retrieved: new Date().toISOString() };
  await fs.appendFile(ledger, JSON.stringify(row) + '\n');
  console.log(n, buf.length, name);
}
