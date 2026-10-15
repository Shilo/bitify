import zlib from 'node:zlib';
import crypto from 'node:crypto';
export const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function crc(b) { let c = 0xffffffff; for (const x of b) { c ^= x; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type), n = Buffer.alloc(4), c = Buffer.alloc(4); n.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([n, t, data, c]); }
export function png(w, h, pixel) {
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(w); hdr.writeUInt32BE(h, 4); hdr[8] = 8; hdr[9] = 6;
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) Buffer.from(pixel(x, y)).copy(rows, y * (w * 4 + 1) + 1 + x * 4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', hdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
export function decode(pngData) {
  const b = Buffer.isBuffer(pngData) ? pngData : Buffer.from(pngData.replace(/^data:[^,]*,/, ''), 'base64');
  let w, h, depth, type, palette, trans, compressed = [];
  for (let at = 8; at < b.length;) { const n = b.readUInt32BE(at), t = b.toString('ascii', at + 4, at + 8), d = b.subarray(at + 8, at + 8 + n); at += n + 12;
    if (t === 'IHDR') { w = d.readUInt32BE(); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; if (d[12]) throw new Error('Interlaced PNG unsupported'); }
    if (t === 'PLTE') palette = d; if (t === 'tRNS') trans = d; if (t === 'IDAT') compressed.push(d);
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!channels || depth > 8) throw new Error(`Unsupported PNG ${depth}/${type}`);
  const stride = Math.ceil(w * channels * depth / 8), bpp = Math.max(1, Math.ceil(channels * depth / 8)), raw = zlib.inflateSync(Buffer.concat(compressed));
  const data = Buffer.alloc(w * h * 4), previous = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))), filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? row[i - bpp] : 0, up = previous[i], c = i >= bpp ? previous[i - bpp] : 0;
      let p = 0; if (filter === 1) p = a; if (filter === 2) p = up; if (filter === 3) p = Math.floor((a + up) / 2);
      if (filter === 4) { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      row[i] = (row[i] + p) & 255;
    }
    for (let x = 0; x < w; x++) { const at = (y * w + x) * 4, ix = x * channels;
      if (type === 6 || type === 2) { data[at] = row[ix]; data[at + 1] = row[ix + 1]; data[at + 2] = row[ix + 2]; data[at + 3] = type === 6 ? row[ix + 3] : 255; }
      else if (type === 3) { const idx = depth === 8 ? row[x] : (row[Math.floor(x * depth / 8)] >>> (8 - depth - x * depth % 8)) & ((1 << depth) - 1); data[at] = palette[idx * 3]; data[at + 1] = palette[idx * 3 + 1]; data[at + 2] = palette[idx * 3 + 2]; data[at + 3] = trans?.[idx] ?? 255; }
      else { const v = row[ix]; data[at] = data[at + 1] = data[at + 2] = v; data[at + 3] = type === 4 ? row[ix + 1] : 255; }
    }
    row.copy(previous);
  }
  return { width: w, height: h, data, depth, type };
}
export const image = b => ({ base64: b.toString('base64') });
export function metrics(im) {
  const colors = new Map(), alphas = new Map(); let transparent = 0;
  for (let i = 0; i < im.data.length; i += 4) { const a = im.data[i + 3]; alphas.set(a, (alphas.get(a) || 0) + 1); if (!a) { transparent++; continue; } const c = '#' + im.data.subarray(i, i + 3).toString('hex'); colors.set(c, (colors.get(c) || 0) + 1); }
  return { width: im.width, height: im.height, visible_colors: colors.size, transparent_pixels: transparent, alpha_histogram: Object.fromEntries(alphas), color_histogram: Object.fromEntries([...colors].sort((a, b) => b[1] - a[1])), rgba_sha256: sha(im.data) };
}
export async function api(endpoint, body) {
  const secret = process.env.PIXELLAB_SECRET; if (!secret) throw new Error('Missing PIXELLAB_SECRET');
  const start = performance.now(); const r = await fetch('https://api.pixellab.ai/v2' + endpoint, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await r.json(); return { status: r.status, ms: Math.round(performance.now() - start), result };
}
let session;
export async function rpc(method, params, id = 1) {
  const secret = process.env.PIXELLAB_SECRET; if (!secret) throw new Error('Missing PIXELLAB_SECRET');
  const r = await fetch('https://api.pixellab.ai/mcp', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(session ? { 'Mcp-Session-Id': session } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', method, params, id }) });
  if (r.headers.get('mcp-session-id')) session = r.headers.get('mcp-session-id');
  const raw = await r.text(); let data; try { data = JSON.parse(raw); } catch { data = raw.split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6))).at(-1); }
  return { status: r.status, data };
}
export const initMcp = () => rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'colorfetti-palette-research', version: '1.0' } });
