// Loopback-only research harness; no application settings or authenticated calls.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), port = Number(process.argv[2] ?? 5306);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif' };
const ownedFiles = new Set(['device.html', 'core.mjs', 'palette-limit.candidate.js', 'device-input.json']);
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'POST' && url.pathname === '/report') {
      const device = url.searchParams.get('device');
      if (!['codex', 'android'].includes(device)) throw new Error('Unknown owned device report');
      let text = '';
      for await (const chunk of request) { text += chunk; if (text.length > 2 * 1024 * 1024) throw new Error('Report too large'); }
      const report = JSON.parse(text);
      await fs.writeFile(path.join(import.meta.dirname, `${device}-results.json`), JSON.stringify(report, null, 2) + '\n');
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('{"saved":true}'); return;
    }
    const relative = url.pathname === '/' ? '/bench/important-colors-spike/device.html' : decodeURIComponent(url.pathname), file = path.resolve(root, '.' + relative);
    if (!file.startsWith(root + path.sep)) throw new Error('Out of scope');
    const coreModule = /^\/src\/lib\/[A-Za-z0-9-]+\.js$/.test(relative);
    const ownedResearch = relative.startsWith('/bench/important-colors-spike/') && ownedFiles.has(relative.slice('/bench/important-colors-spike/'.length));
    if (!coreModule && !ownedResearch) throw new Error('File is not an owned harness dependency');
    const body = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(body);
  } catch (error) { response.writeHead(400, { 'Content-Type': 'text/plain' }); response.end(error.message); }
});
server.listen(port, '127.0.0.1', () => console.log(`Owned research harness http://127.0.0.1:${port}/`));
