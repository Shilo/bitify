// Bounded paid black-box test: 18 tiny requests, 14 valid at 0.1 subscription generations each.
import fs from 'node:fs';
import { png, decode, image, metrics, api, sha, initMcp, rpc } from './api-common.mjs';
const out = import.meta.dirname;
const fixture = (name, w, h, fn) => { const b = png(w, h, fn); fs.writeFileSync(`${out}/api-input-${name}.png`, b); return b; };
const gradient = fixture('gradient', 64, 32, (x, y) => { const v = Math.round(x * 255 / 63); return [v, v, v, 255]; });
const alpha = fixture('alpha', 16, 16, (x, y) => [x < 8 ? 200 : 30, x < 8 ? 40 : 160, 60, [0, 1, 64, 127, 128, 192, 254, 255][y >> 1]]);
const low = fixture('low-color', 16, 16, (x, y) => x < 8 ? [200, 40, 60, 255] : [30, 160, 60, 255]);
const shifted = fixture('shifted-frame', 64, 32, (x, y) => { const v = Math.round(((x + 8) % 64) * 255 / 63); return [v, v, v, 255]; });
const palette = fixture('target', 4, 1, x => [[8,24,32,255],[52,104,86,255],[136,192,112,255],[224,248,208,255]][x]);
const bw = fixture('bw', 2, 1, x => [255*x,255*x,255*x,255]);
const cases = [
  ['auto', { images: [image(gradient)] }], ['auto-repeat', { images: [image(gradient)] }],
  ['count8', { images: [image(gradient)], num_colors: 8 }],
  ['count2', { images: [image(gradient)], num_colors: 2 }],
  ['target', { images: [image(gradient)], palette_image: image(palette) }],
  ...['2x2', '4x4', '8x8'].map(d => ['bw-'+d, { images: [image(gradient)], palette_image: image(bw), dithering: d, dithering_strength: 5 }]),
  ['bw-none', { images: [image(gradient)], palette_image: image(bw), dithering: 'none' }],
  ['bw-strength0', { images: [image(gradient)], palette_image: image(bw), dithering: '4x4', dithering_strength: 0 }],
  ['bw-strength10', { images: [image(gradient)], palette_image: image(bw), dithering: '4x4', dithering_strength: 10 }],
  ['alpha8', { images: [image(alpha)], num_colors: 8 }],
  ['low-count8', { images: [image(low)], num_colors: 8 }],
  ['shared', { images: [image(gradient), image(shifted)], num_colors: 8 }],
  ['conflict', { images: [image(gradient)], palette_image: image(palette), num_colors: 2 }],
  ['count1-invalid', { images: [image(low)], num_colors: 1 }],
  ['mixed-size-invalid', { images: [image(low), image(gradient)], num_colors: 8 }],
  ['extra-smart-invalid', { images: [image(gradient)], palette_image: image(palette), smart: true }],
];
const all = [];
for (const [name, body] of cases) {
  const r = await api('/reduce-colors', body);
  const req = { ...body, images: body.images.map(x => ({ input_png_sha256: sha(Buffer.from(x.base64,'base64')) })), ...(body.palette_image ? { palette_image: { input_png_sha256: sha(Buffer.from(body.palette_image.base64, 'base64')) } } : {}) };
  const evidence = { name, request: req, status: r.status, ms: r.ms };
  if (r.status === 200) {
    evidence.n_colors = r.result.n_colors; evidence.usage = r.result.usage;
    evidence.images = r.result.images.map((im,i) => { const b=Buffer.from(im.base64.replace(/^data:[^,]*,/,''),'base64');fs.writeFileSync(`${out}/api-output-${name}-${i}.png`,b);return metrics(decode(b)); });
    const b=Buffer.from(r.result.palette.base64.replace(/^data:[^,]*,/,''),'base64');fs.writeFileSync(`${out}/api-palette-${name}.png`,b);evidence.palette=metrics(decode(b));
  } else evidence.error = r.result;
  all.push(evidence); fs.writeFileSync(`${out}/api-results.json`,JSON.stringify(all,null,2)); console.log(name,r.status,r.ms,evidence.n_colors,evidence.images?.map(x=>x.visible_colors).join(','),evidence.error?JSON.stringify(evidence.error):'');
  if ([401,402,429].includes(r.status)) break;
}
await initMcp();
const d = await rpc('tools/call', { name: 'pixelart_workbench', arguments: { argv: ['describe','cli'], notes: 'Research palette and color reduction controls available to improve a local pixel art palette application.' } },2);
fs.writeFileSync(`${out}/api-workbench-description.json`,JSON.stringify(d,null,2));console.log('Workbench describe:',d.status);
const m = await rpc('tools/call', { name:'reduce_colors', arguments:{ images_base64:[gradient.toString('base64')],num_colors:8,dithering:'4x4',dithering_strength:5 } },3);
fs.writeFileSync(`${out}/api-mcp-reduce-response.json`,JSON.stringify(m,null,2));console.log('MCP reduction:',m.status,JSON.stringify(m.data).slice(0,1200));
