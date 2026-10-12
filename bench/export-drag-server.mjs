// Local, read-only built-app/fixture host for manual native drag tests.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist'), fixtures = resolve('.tmp/export-drag-qa');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json' };
export function dragTestServer() {
  return createServer((req, res) => {
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const base = path.startsWith('/fixtures/') ? fixtures : root;
    const relative = path.startsWith('/fixtures/') ? path.slice(10) : path === '/' ? 'index.html' : path.slice(1);
    const file = resolve(base, relative);
    if (!file.startsWith(base + sep)) { res.writeHead(403).end(); return; }
    let bytes;
    try { bytes = readFileSync(file); }
    catch { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  });
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const server = dragTestServer();
  server.listen(5184, '127.0.0.1', () => console.log('Manual drag prototype: http://127.0.0.1:5184/?dragExport=1'));
}
