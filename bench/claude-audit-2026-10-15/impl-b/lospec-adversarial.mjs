// Impl-B audit: adversarial Lospec URL parsing, UI routing and bounded fetch.
// Expectations are written by hand (independent oracle), not derived from the module.
// Run: node bench/claude-audit-2026-10-15/impl-b/lospec-adversarial.mjs
const root = new URL('../../../src/lib/', import.meta.url);
const { lospecReference, looksLikeLospecReference, canonicalLospecUrl } = await import(new URL('palette-lospec-url.js', root));
const { fetchLospecPalette, LOSPEC_MAX_BYTES } = await import(new URL('palette-lospec.js', root));
const { parsePaletteText } = await import(new URL('palette-import.js', root));
const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, ...(detail === undefined ? {} : { detail }) });
const slugOf = v => { try { return lospecReference(v).slug; } catch { return null; } };

// --- URL parsing (accept: canonical slug; reject: everything else) ---
const accept = {
  'HTTPS://LOSPEC.COM/PALETTE-LIST/SLSO8': 'slso8', 'https://lospec.com/palette-list/slso8/': 'slso8',
  'https://lospec.com/palette-list/slso8.json': 'slso8', 'http://lospec.com/palette-list/slso8': 'slso8',
  'https://lospec.com/palette-list/slso8?a=b#c': 'slso8', '  https://lospec.com/palette-list/1bit-monitor-glow  ': '1bit-monitor-glow',
};
for (const [input, slug] of Object.entries(accept)) check('accept ' + input.trim(), slugOf(input) === slug, slugOf(input));
const reject = ['https://lospec.com/palette-list/ſlso8', 'https://lospec.com/palette-list/Kelvin', 'https://lospec.com/palette-list/sl%73o8',
  'https://lospec.com/palette-list/slso8\nhttps://evil.test', 'https://lospec.com/palette-list/slso8/../../x', 'https://lospec.com/palette-list/-slso8',
  'https://lospec.com/palette-list/slso8-', 'https://lospec.com@evil.test/palette-list/slso8', 'https://evil.test/#https://lospec.com/palette-list/slso8',
  'https://lospec.com/palette-list/slso8 extra', 'https://lospec.com/palette-list/', '//lospec.com/palette-list/slso8', 'https://lospec.com/palette-list/slso8\u0000'];
for (const input of reject) check('reject ' + JSON.stringify(input), slugOf(input) === null && canonicalLospecUrl(input) === null);

// --- UI routing consistency (PaletteImport: lospecInput => importLospec => lospecReference(text)) ---
// Finding B-1: the router claims a scheme-less link but the parser rejects it.
for (const input of ['lospec.com/palette-list/slso8', 'www.lospec.com/palette-list/slso8']) {
  check('routed scheme-less link is importable: ' + input, !looksLikeLospecReference(input) || slugOf(input) !== null,
    { routedToLospec: looksLikeLospecReference(input), parsedSlug: slugOf(input) });
}
// Finding B-2: pasted GPL text with a URL in a comment parses locally but is routed to Lospec and fails.
const gpl = 'GIMP Palette\nName: Example\n#Description: from https://example.test/palette\n#Colors: 2\n0 0 0\tblack\n255 255 255\twhite';
let local = null; try { local = parsePaletteText(gpl); } catch (e) { local = e.message; }
check('GPL text with URL comment stays on local text path', !looksLikeLospecReference(gpl), { routedToLospec: looksLikeLospecReference(gpl), localParse: local, lospecParse: slugOf(gpl) });

// --- bounded fetch ---
const json = (text, headers = { 'content-type': 'application/json' }, status = 200) => new Response(text, { status, headers });
const stream = (chunks, { hang = false } = {}) => new ReadableStream({
  async pull(c) { if (chunks.length) c.enqueue(chunks.shift()); else if (!hang) c.close(); else await new Promise(() => {}); },
});
async function outcome(promise) { try { return { ok: await promise }; } catch (e) { return { error: e.message, name: e.name }; } }
const valid = JSON.stringify({ name: 'X', author: 'Y', colors: ['000000', 'ffffff'] });

// Streamed oversize with no content-length.
{
  const big = new Uint8Array(LOSPEC_MAX_BYTES / 4).fill(32); let pulled = 0;
  const body = new ReadableStream({ pull(c) { pulled++; c.enqueue(big.slice()); } }); // infinite
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => new Response(body, { headers: { 'content-type': 'application/json' } }) }));
  check('infinite stream stops at 64 KiB bound', /64 KiB/.test(r.error) && pulled <= 6, { ...r, pulled });
}
// Lying small content-length but huge body.
{
  const big = new Uint8Array(LOSPEC_MAX_BYTES + 1).fill(32);
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => new Response(stream([big]), { headers: { 'content-type': 'application/json', 'content-length': '10' } }) }));
  check('lying content-length still bounded', /64 KiB/.test(r.error), r);
}
// Declared huge content-length rejected before reading.
{
  let read = 0; const body = new ReadableStream({ pull(c) { read++; c.enqueue(new Uint8Array(1)); } });
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => new Response(body, { headers: { 'content-type': 'application/json', 'content-length': String(LOSPEC_MAX_BYTES + 1) } }) }));
  check('declared oversize rejected without reading', /64 KiB/.test(r.error) && read <= 1, { ...r, read });
}
// Exactly 64 KiB with valid JSON padded by whitespace: accepted.
{
  const text = valid + ' '.repeat(LOSPEC_MAX_BYTES - valid.length);
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => json(text) }));
  check('exact 64 KiB boundary accepted', r.ok?.colors?.length === 2, r.error);
}
// Abort mid-stream: user cancel => AbortError, never timeout/other message.
{
  const controller = new AbortController(); let canceled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"colors":')); }, pull() { return new Promise(() => {}); }, cancel() { canceled = true; } });
  const p = outcome(fetchLospecPalette('slso8', { signal: controller.signal, fetcher: async () => new Response(body, { headers: { 'content-type': 'application/json' } }) }));
  setTimeout(() => controller.abort(), 20);
  const r = await p;
  check('mid-stream user abort rejects AbortError and cancels body', r.name === 'AbortError' && canceled, { ...r, canceled });
}
// Timeout during stalled body read.
{
  let canceled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{')); }, pull() { return new Promise(() => {}); }, cancel() { canceled = true; } });
  const t0 = Date.now();
  const r = await outcome(fetchLospecPalette('slso8', { timeoutMs: 50, fetcher: async () => new Response(body, { headers: { 'content-type': 'application/json' } }) }));
  check('stalled body times out and cancels', /timed out/.test(r.error) && canceled && Date.now() - t0 < 2000, { ...r, canceled, ms: Date.now() - t0 });
}
// Fetcher rejecting with TypeError (network/CORS/redirect:error).
{
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => { throw new TypeError('Failed to fetch'); } }));
  check('network TypeError gets friendly message', /Could not reach Lospec/.test(r.error), r);
}
// Malformed responses.
const malformed = {
  'html mime': json(valid, { 'content-type': 'text/html' }), 'invalid utf8': new Response(new Uint8Array([0x7b, 0xff, 0x7d]), { headers: { 'content-type': 'application/json' } }),
  'truncated json': json('{"colors":["000000"'), 'colors object': json('{"colors":{"0":"000000"}}'), 'colors with alpha': json('{"colors":["000000ff"]}'),
  'empty body': json(''), 'array root': json('[]'), 'null root': json('null'), '257 colors': json(JSON.stringify({ colors: Array.from({ length: 257 }, (_, i) => i.toString(16).padStart(6, '0')) })),
  '500': json(valid, {}, 500), '404': json(valid, {}, 404), '429': json(valid, {}, 429),
};
for (const [name, response] of Object.entries(malformed)) {
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => response }));
  check('malformed rejected: ' + name, !!r.error && r.name !== 'AbortError', r);
}
// Allowed odd-but-valid: BOM, octet-stream, no content-type.
for (const [name, response] of Object.entries({ bom: json('﻿' + valid), octet: json(valid, { 'content-type': 'application/octet-stream; charset=utf-8' }), 'no type': new Response(new TextEncoder().encode(valid)) })) {
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => response }));
  check('accepted: ' + name, r.ok?.colors?.length === 2, r.error);
}
// Hostile metadata: bidi override / C1 controls survive into name (display-only).
{
  const r = await outcome(fetchLospecPalette('slso8', { fetcher: async () => json(JSON.stringify({ name: 'evil‮gnp.exe\u0085', author: '\u{1F600}'.repeat(100), colors: ['000000'] })) }));
  const credit = r.ok?.source?.credit ?? '';
  check('name has no bidi/C1 controls (informational)', !/[\u0080-\u009f‪-‮⁦-⁩]/.test(r.ok?.name ?? ''), { name: JSON.stringify(r.ok?.name), creditUnits: credit.length });
}
// Fetcher argument contract.
{
  let args; await fetchLospecPalette('https://lospec.com/palette-list/SLSO8.json?x', { fetcher: async (...a) => { args = a; return json(valid); } });
  check('only canonical JSON URL fetched with omit/no-referrer/redirect:error', args[0] === 'https://lospec.com/palette-list/slso8.json' && args[1].credentials === 'omit' && args[1].redirect === 'error' && args[1].referrerPolicy === 'no-referrer');
}
const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed }, null, 1));
