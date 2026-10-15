// Impl-B audit: copyOne promise ownership across rejection timings and platform failures.
// Run: node bench/claude-audit-2026-10-15/impl-b/clipboard-timing.mjs
const { copyOne } = await import(new URL('../../../src/lib/save.js', import.meta.url));
const unhandled = []; process.on('unhandledRejection', e => unhandled.push(String(e?.message ?? e)));
const tick = ms => new Promise(r => setTimeout(r, ms));
const out = [];
const timings = {
  'already-rejected': () => Promise.reject(new Error('pre')),
  'microtask': () => Promise.resolve().then(() => { throw new Error('micro'); }),
  'macrotask': () => tick(5).then(() => { throw new Error('macro'); }),
  'thenable': () => ({ then(_, reject) { setTimeout(() => reject(new Error('thenable')), 5); } }),
  'resolves': () => tick(5).then(() => new Blob(['x'])),
};
const platforms = {
  'no-clipboard': () => ({ nav: {}, Item: class {} }),
  'item-throws': () => ({ nav: { clipboard: { write: async () => {} } }, Item: class { constructor() { throw new TypeError('item'); } } }),
  'write-sync-throws': () => ({ nav: { clipboard: { write() { throw new DOMException('no', 'NotAllowedError'); } } }, Item: class {} }),
  'write-rejects-early': () => ({ nav: { clipboard: { write: () => Promise.reject(new DOMException('no', 'NotAllowedError')) } }, Item: class {} }),
  'write-consumes': () => ({ nav: { clipboard: { write: async items => { await items[0].v; } } }, Item: class { constructor(v) { this.v = v['image/png']; } } }),
  'write-ignores-item': () => ({ nav: { clipboard: { write: async () => {} } }, Item: class {} }),
};
for (const [t, make] of Object.entries(timings)) for (const [p, plat] of Object.entries(platforms)) {
  const { nav, Item } = plat();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: nav }); globalThis.ClipboardItem = Item;
  const before = unhandled.length; let result;
  try { await copyOne(make()); result = 'resolved'; } catch (e) { result = 'rejected:' + e.name; }
  await tick(20);
  out.push({ timing: t, platform: p, result, unhandled: unhandled.slice(before) });
}
const bad = out.filter(o => o.unhandled.length);
// A copy that silently "succeeds" while the PNG failed would be a false success message.
const falseSuccess = out.filter(o => o.timing !== 'resolves' && o.result === 'resolved');
console.log(JSON.stringify({ cases: out.length, unhandledCases: bad, falseSuccess }, null, 1));
