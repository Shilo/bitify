// PAID. Submits each case at most once (retained response => skipped). Secret only via env.
// Responses are sanitized: image base64 moves to PNG files; validation echoes of input are dropped.
import fs from 'node:fs';
import path from 'node:path';
import { api, initMcp, rpc, sha } from '../../palette-service-research/api-common.mjs';
import { CASES, REJECTED } from './cases.mjs';
const dir = import.meta.dirname, fx = n => fs.readFileSync(path.join(dir, 'fixtures', n)), out = path.join(dir, 'service');
fs.mkdirSync(out, { recursive: true });
const json = (n, v) => fs.writeFileSync(path.join(out, n), JSON.stringify(v, null, 2) + '\n');
const b64 = s => Buffer.from(String(s).replace(/^data:[^,]*,/, ''), 'base64');
const strip = v => JSON.parse(JSON.stringify(v, (k, x) => k === 'input' || (k === 'base64' && typeof x === 'string') || (k === 'data' && typeof x === 'string' && x.length > 200) ? `[omitted ${String(x).length} chars]` : typeof x === 'string' && /https?:\/\//.test(x) ? x.replace(/https?:\/\/\S+/g, '[url omitted]') : x));
if (!process.env.PIXELLAB_SECRET) throw Error('Missing PIXELLAB_SECRET');
const balance = async () => { const b = await api('/balance'); return { at: new Date().toISOString(), status: b.status, credits: b.result.credits, subscriptionGenerations: b.result.subscription?.generations }; };
json(`balance-pre-live-${Date.now()}.json`, await balance());

for (const c of CASES.filter(c => !c.mcp)) {
  const file = `response-${c.id}.json`;
  if (fs.existsSync(path.join(out, file))) { console.log('retained', c.id); continue; }
  const body = { images: c.inputs.map(n => ({ base64: fx(n).toString('base64') })), ...(c.count ? { num_colors: c.count } : {}), ...(c.target ? { palette_image: { base64: fx(c.target).toString('base64') } } : {}), dithering: c.dither ?? 'none', ...(c.dither ? { dithering_strength: c.strength } : {}) };
  const r = await api('/reduce-colors', body);
  if (r.status === 200) {
    r.result.images.forEach((im, i) => fs.writeFileSync(path.join(out, `service-${c.id}-${i}.png`), b64(im.base64)));
    if (r.result.palette_image?.base64) fs.writeFileSync(path.join(out, `service-${c.id}-palette.png`), b64(r.result.palette_image.base64));
  }
  json(file, { at: new Date().toISOString(), endpoint: 'POST /v2/reduce-colors', authorization: '[redacted]', request: { inputs: c.inputs.map(n => ({ file: n, pngSha256: sha(fx(n)) })), num_colors: body.num_colors ?? null, palette_image: c.target ? { file: c.target, pngSha256: sha(fx(c.target)) } : null, dithering: body.dithering, dithering_strength: body.dithering_strength ?? null }, status: r.status, ms: r.ms, result: strip(r.result) });
  console.log(c.id, r.status, r.ms, JSON.stringify(r.result.usage ?? r.result.detail ?? '').slice(0, 200));
  if ([401, 402, 429].includes(r.status)) throw Error('Stopping on account/limit status');
}

for (const rej of REJECTED) {
  const file = `rejected-${rej.id}.json`;
  if (fs.existsSync(path.join(out, file))) continue;
  const r = await api('/reduce-colors', { images: [{ base64: fx('tiny-2x2.png').toString('base64') }], ...rej.body });
  json(file, { at: new Date().toISOString(), authorization: '[redacted]', request: rej.body, status: r.status, ms: r.ms, errors: (r.result.detail ?? []).map(({ input, ...e }) => e), other: r.status === 200 ? { usage: r.result.usage } : undefined });
  console.log(rej.id, r.status, JSON.stringify((r.result.detail ?? []).map(e => e.msg)));
}

for (const c of CASES.filter(c => c.mcp)) {
  const file = `mcp-${c.id}.json`;
  if (fs.existsSync(path.join(out, file))) { console.log('retained', c.id); continue; }
  const start = performance.now();
  await initMcp();
  const sub = await rpc('tools/call', { name: 'reduce_colors', arguments: { images_base64: c.inputs.map(n => fx(n).toString('base64')), num_colors: c.count, dithering: 'none' } }, 3);
  const text = sub.data?.result?.content?.filter(v => v.type === 'text').map(v => v.text).join('\n') ?? '';
  const job = sub.data?.result?.structuredContent?.job_id ?? text.match(/job_id:\s*([\w-]+)/)?.[1];
  const record = { at: new Date().toISOString(), surface: 'MCP tools/call reduce_colors', authorization: '[redacted]', request: { inputs: c.inputs.map(n => ({ file: n, pngSha256: sha(fx(n)) })), num_colors: c.count, dithering: 'none' }, submitStatus: sub.status, submitText: text.replace(/https?:\/\/\S+/g, '[url omitted]').slice(0, 600), job, polls: [] };
  if (job) for (let i = 0; i < 12; i++) {
    const res = await rpc('tools/call', { name: 'get_image', arguments: { job_id: job } }, 4 + i);
    const images = res.data?.result?.content?.filter(v => v.type === 'image') ?? [];
    record.polls.push({ at: Math.round(performance.now() - start), images: images.length, isError: !!res.data?.result?.isError });
    if (images.length) { images.forEach((im, k) => fs.writeFileSync(path.join(out, `service-${c.id}-${k}.png`), b64(im.data))); const s = res.data.result.structuredContent ?? {}; record.result = strip({ status: s.status, frames: s.frames, charged_generations: s.charged_generations, n_colors: s.n_colors, asset_status: s.asset?.status, text: res.data.result.content.filter(v => v.type === 'text').map(v => v.text).join('\n').replace(/https?:\/\/\S+/g, '[url omitted]').slice(0, 800) }); break; }
    if (res.data?.result?.isError) break;
    await new Promise(r => setTimeout(r, 4000));
  }
  record.elapsedMs = Math.round(performance.now() - start);
  json(file, record);
  console.log(c.id, 'MCP', record.job ? 'job' : 'no job', record.polls.at(-1), record.result?.charged_generations);
}
json('balance-after.json', await balance());
console.log('balance after', JSON.parse(fs.readFileSync(path.join(out, 'balance-after.json'))).subscriptionGenerations);
