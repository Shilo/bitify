// RESEARCH ONLY. Loopback static server for browser-check.html on port 5360.
// Usage: node bench/keep-real-art-study/serve.mjs [browserCasesDir]
// (default bench/keep-real-art-study/results/browser). Android: adb reverse tcp:5360 tcp:5360.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const casesDir = path.resolve(process.argv[2] ?? path.join(here, 'results/browser'));
const allowed = [/^\/bench\/keep-real-art-study\/(browser-check\.(html|js)|pipeline\.js)$/, /^\/bench\/keep-alpha-weighting-spike\/palette-(generated|limit)\.candidate\.js$/, /^\/bench\/keep-real-art-study\/candidates\/palette-(generated|limit)\.candidate\.js$/, /^\/src\/lib\/[a-z0-9-]+\.js$/];
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/report') {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 8 * 1024 * 1024) throw new Error('Report too large'); }
      JSON.parse(body);
      const file = `receipt-${String(url.searchParams.get('device') ?? 'browser').replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'browser'}.json`;
      await fs.writeFile(path.join(casesDir, file), body); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ saved: file })); return;
    }
    let file;
    if (url.pathname === '/') file = path.join(here, 'browser-check.html');
    else if (/^\/cases\/(cases\.json|u\d+-f\d+\.rgba\.gz)$/.test(url.pathname)) file = path.join(casesDir, path.basename(url.pathname));
    else if (allowed.some(r => r.test(url.pathname))) file = path.join(root, url.pathname);
    else { res.writeHead(403).end(); return; }
    const bytes = await fs.readFile(file);
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store'); res.end(bytes);
  } catch (error) { res.writeHead(404).end(String(error.message)); }
}).listen(5360, '127.0.0.1', () => console.log(`Keep real-art parity http://127.0.0.1:5360/?device=desktop (cases: ${casesDir})`));
