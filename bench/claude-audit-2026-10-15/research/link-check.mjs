// Resolve every relative markdown link/image in the owned research docs; report missing targets.
import fs from 'node:fs';
import path from 'node:path';
const docs = process.argv.slice(2);
const missing = []; let total = 0;
for (const doc of docs) {
  const lines = fs.readFileSync(doc, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|#)/.test(url)) continue;
      total++;
      const target = path.resolve(path.dirname(doc), decodeURIComponent(url.split('#')[0]));
      if (!fs.existsSync(target)) missing.push(`${doc}:${i + 1} -> ${url}`);
    }
  });
}
console.log(JSON.stringify({ docs: docs.length, relativeLinks: total, missing }, null, 1));
