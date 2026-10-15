// Only the built app is exposed. No profile, source tree or user data route.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.mp4':'video/mp4' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') { response.writeHead(302, { Location:'/colorfetti/' }).end(); return; }
    if (!url.pathname.startsWith('/colorfetti/')) throw new Error('Unavailable route');
    const relativeUrl = decodeURIComponent(url.pathname.slice('/colorfetti/'.length)) || 'index.html';
    const file = path.resolve(root, relativeUrl), relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unavailable route');
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type':mime[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-store' }).end(bytes);
  } catch { if (!response.headersSent) response.writeHead(404); response.end(); }
}).listen(5328, '127.0.0.1', () => console.log('Owned built app http://127.0.0.1:5328/colorfetti/'));
