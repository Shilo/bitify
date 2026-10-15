// Free refresh only: public schemas/docs, authenticated MCP tools/list and balance.
// No reductions. Secret is read from env by api-common and never written.
import fs from 'node:fs';
import path from 'node:path';
import { api, initMcp, rpc, sha } from '../../palette-service-research/api-common.mjs';
const dir = import.meta.dirname, out = path.join(dir, 'probe');
fs.mkdirSync(out, { recursive: true });
const json = (n, v) => fs.writeFileSync(path.join(out, n), JSON.stringify(v, null, 2) + '\n');
const retained = p => JSON.parse(fs.readFileSync(path.join(dir, '../../..', p)));

const pages = {
  'openapi.json': 'https://api.pixellab.ai/v2/openapi.json',
  'llms.txt': 'https://api.pixellab.ai/v2/llms.txt',
  'v2-docs.html': 'https://api.pixellab.ai/v2/docs',
  'mcp-docs.html': 'https://api.pixellab.ai/mcp/docs',
  'docs-reduce-colors.html': 'https://www.pixellab.ai/docs/tools/reduce-colors',
  'docs-color.html': 'https://www.pixellab.ai/docs/options/color',
  'docs-dithering.html': 'https://www.pixellab.ai/docs/options/dithering',
  'mcp-page.html': 'https://www.pixellab.ai/mcp',
};
const fetched = {};
for (const [name, url] of Object.entries(pages)) {
  try { const r = await fetch(url); const t = await r.text(); fs.writeFileSync(path.join(out, name), t); fetched[name] = { url, status: r.status, bytes: t.length, sha256: sha(Buffer.from(t)) }; }
  catch (e) { fetched[name] = { url, error: String(e) }; }
}
const text = n => fs.existsSync(path.join(out, n)) ? fs.readFileSync(path.join(out, n), 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '';
const hits = (t, re) => [...t.matchAll(re)].map(m => t.slice(Math.max(0, m.index - 120), m.index + 160));

const schema = JSON.parse(fs.readFileSync(path.join(out, 'openapi.json')));
const paths = Object.keys(schema.paths).sort();
const reduce = schema.paths['/reduce-colors'];
const reqRef = reduce.post.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
const req = schema.components.schemas[reqRef];
const oldReq = retained('bench/palette-handoff-service-review/live-public-contract.json').models.ReduceColorsRequest;
const oldTarget = retained('bench/palette-handoff-service-review/live-public-contract.json').models.TargetPalette;
// Every request field anywhere in the schema whose name/description mentions smart/recolor/palette.
const fieldHits = [];
for (const [name, model] of Object.entries(schema.components.schemas)) for (const [field, spec] of Object.entries(model.properties ?? {})) {
  const s = JSON.stringify(spec);
  if (/smart|recolou?r|palette|quantiz/i.test(field + ' ' + s)) fieldHits.push({ model: name, field, smart: /smart/i.test(field + s), recolor: /recolou?r/i.test(s) });
}
const smartModels = Object.entries(schema.components.schemas).filter(([, m]) => /smart/i.test(JSON.stringify(m))).map(([n]) => n);
// Which routes accept a model that (transitively) contains smart.
const refsOf = (node, acc = new Set()) => { if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) { if (k === '$ref') { const n = v.split('/').at(-1); if (!acc.has(n)) { acc.add(n); refsOf(schema.components.schemas[n], acc); } } else refsOf(v, acc); } return acc; };
const smartRoutes = [];
for (const [p, ops] of Object.entries(schema.paths)) for (const [verb, op] of Object.entries(ops)) { const refs = refsOf(op.requestBody ?? {}); const hit = [...refs].filter(r => smartModels.includes(r)); if (hit.length) smartRoutes.push({ path: p, verb, via: hit }); }
const recolorPaths = paths.filter(p => /recolou?r|palette|quantiz|reduce|inpaint|repaint|color/i.test(p));

const restDiff = {
  at: new Date().toISOString(), fetched, totalPaths: paths.length, paths, recolorRelatedPaths: recolorPaths,
  reduceColors: { requestModel: reqRef, fields: Object.keys(req.properties), previousFields: Object.keys(oldReq.properties),
    added: Object.keys(req.properties).filter(k => !oldReq.properties[k]), removed: Object.keys(oldReq.properties).filter(k => !req.properties[k]),
    changed: Object.keys(req.properties).filter(k => oldReq.properties[k] && JSON.stringify(oldReq.properties[k]) !== JSON.stringify(req.properties[k])),
    additionalProperties: req.additionalProperties, description: reduce.post.description },
  targetPalette: { current: schema.components.schemas.TargetPalette ?? null, changedFromRetained: JSON.stringify(schema.components.schemas.TargetPalette) !== JSON.stringify(oldTarget) },
  smartModels, smartRoutes, paletteFieldHits: fieldHits,
  docsMentions: Object.fromEntries(Object.keys(pages).filter(n => n !== 'openapi.json').map(n => [n, { smart: hits(text(n), /smart/gi).slice(0, 8), recolor: hits(text(n), /recolou?r/gi).slice(0, 6) }])),
};
json('rest-diff.json', restDiff);
console.log('REST paths', paths.length, 'reduce fields', restDiff.reduceColors.fields, 'added', restDiff.reduceColors.added, 'removed', restDiff.reduceColors.removed, 'changed', restDiff.reduceColors.changed);
console.log('smart models', smartModels, 'routes', smartRoutes.map(r => r.path));
console.log('recolor-ish paths', recolorPaths);

if (!process.env.PIXELLAB_SECRET) throw Error('Missing PIXELLAB_SECRET');
const balance = await api('/balance');
if (!fs.existsSync(path.join(dir, 'balance-before.json'))) fs.writeFileSync(path.join(dir, 'balance-before.json'), JSON.stringify({ at: new Date().toISOString(), status: balance.status, credits: balance.result.credits, subscriptionGenerations: balance.result.subscription?.generations }, null, 2));
console.log('balance', balance.status, balance.result.credits, balance.result.subscription?.generations);

const init = await initMcp();
const listed = await rpc('tools/list', {}, 2);
const tools = listed.data?.result?.tools ?? [];
const relevantRe = /smart|recolou?r|palette|reduce|quantiz|inpaint|repaint|workbench/i;
const relevant = tools.filter(t => relevantRe.test(t.name + ' ' + (t.description ?? '') + ' ' + JSON.stringify(t.inputSchema ?? {})));
const prevRelevant = retained('bench/palette-handoff-service-review/live-mcp-contract.json');
json('mcp-tools.json', { at: new Date().toISOString(), initStatus: init.status, server: init.data?.result?.serverInfo, listStatus: listed.status, total: tools.length, previousTotal: prevRelevant.total_tools, names: tools.map(t => t.name).sort(),
  smartMentions: tools.filter(t => /smart/i.test(JSON.stringify(t))).map(t => ({ name: t.name, excerpts: hits(JSON.stringify(t), /smart/gi).slice(0, 4) })),
  relevant: relevant.map(t => ({ name: t.name, keys: Object.keys(t.inputSchema?.properties ?? {}) })),
  reduceColors: tools.find(t => t.name === 'reduce_colors') ?? null,
  reduceColorsChanged: JSON.stringify(tools.find(t => t.name === 'reduce_colors')?.inputSchema) !== JSON.stringify(prevRelevant.tools.find(t => t.name === 'reduce_colors')?.inputSchema),
  createImageProChanged: JSON.stringify(tools.find(t => t.name === 'create_image_pro')?.inputSchema) !== JSON.stringify(prevRelevant.tools.find(t => t.name === 'create_image_pro')?.inputSchema) });
console.log('MCP', listed.status, 'tools', tools.length, 'smart mentions', tools.filter(t => /smart/i.test(JSON.stringify(t))).map(t => t.name));
console.log('relevant', relevant.map(t => t.name));
