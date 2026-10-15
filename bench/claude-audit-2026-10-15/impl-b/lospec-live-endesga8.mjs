// One live request: canonical ENDESGA 8 JSON, redirect:'error' like the app; records headers relevant to CORS/MIME.
// Run: node bench/claude-audit-2026-10-15/impl-b/lospec-live-endesga8.mjs
const r = await fetch('https://lospec.com/palette-list/endesga-8.json', { redirect: 'error', headers: { Origin: 'http://localhost:5345' } });
const text = await r.text();
const h = Object.fromEntries(['content-type', 'content-length', 'access-control-allow-origin', 'content-encoding', 'cache-control'].map(k => [k, r.headers.get(k)]));
const body = JSON.parse(text);
const app = ['#fdfdf8','#d32734','#da7d22','#e6da29','#28c641','#2d93dd','#7b53ad','#1b1c33'];
const live = body.colors.map(c => '#' + c.toLowerCase());
console.log(JSON.stringify({ status: r.status, redirected: r.redirected, headers: h, bytes: text.length, name: body.name, author: body.author, colors: body.colors, exactOrderedMatch: JSON.stringify(live) === JSON.stringify(app) }, null, 1));
