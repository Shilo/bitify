import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { animationFixture } from '../animation-fixture.mjs';

// From the repository root: npm run build, then node bench/image-drop/server.mjs.
// Open the printed URL and run the three browser check buttons. No extra packages.
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/fixture/animation.gif') return res.writeHead(200, { 'content-type': 'image/gif', 'cache-control': 'no-store' }).end(animationFixture());
  const file = path === '/' ? 'bench/image-drop/qa.html' : path.startsWith('/app/') ? join('dist', path.slice(5) || 'index.html') : path.startsWith('/fixture/') ? join('src/assets', path.slice(9)) : null;
  if (!file) return res.writeHead(404).end();
  try { res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
server.listen(5181, '127.0.0.1', () => console.log('Drop review checks: http://127.0.0.1:5181/'));
