import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { instrumentation, palette } from '../practical-workloads-2026-10-16/workflows.mjs';
import { decode, nearest, compare, contract, sha } from '../claude-audit-2026-10-15/device/audit-lib.mjs';

export async function autoCheck(page, { baseURL = 'http://127.0.0.1:5342/', save, output = path.join(import.meta.dirname, 'auto-desktop') } = {}) {
  await mkdir(output, { recursive: true });
  const errors = [];
  const onError = e => errors.push(e.stack);
  page.on('pageerror', onError);
  await page.addInitScript(instrumentation);
  await page.goto(baseURL);
  await page.evaluate(() => {
    localStorage.setItem('colorfetti-help-seen', '1');
    localStorage.setItem('colorfetti-welcomed', '1');
    localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'generated-32', theme: 'dark' }));
  });
  await page.reload(); await page.bringToFront();
  async function rail(open) {
    const toggle = page.locator('button[aria-label="Palette"]');
    if ((await toggle.getAttribute('aria-expanded') === 'true') !== open) await toggle.click();
    await page.waitForFunction(expected => (document.querySelector('button[aria-label="Palette"]')?.getAttribute('aria-expanded') === 'true') === expected, open);
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(v => [v.name, v.value]));
  const fixture = path.resolve(import.meta.dirname, '../practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png');
  const fileBytes = await readFile(fixture);
  await page.evaluate(base64 => { globalThis.__ownedAutoFile = new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'kenney-sheet-2048.png', { type: 'image/png' }); }, fileBytes.toString('base64'));
  const before = await metrics(), start = await page.evaluate(() => performance.now());
  await page.evaluate(() => { const dt = new DataTransfer(); dt.items.add(__ownedAutoFile); const input = document.querySelector('input[type=file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); delete globalThis.__ownedAutoFile; });
  await page.locator('.grid figure .caption-preview').filter({ hasText: 'kenney-sheet-2048.png' }).waitFor();
  await rail(true);
  await page.getByRole('button', { name: 'Edit palette', exact: true }).waitFor();
  await page.waitForFunction(t => {
    const edit = document.querySelector('button[aria-label="Edit palette"]');
    return edit && !edit.disabled && !document.querySelector('.palette-source-status')?.textContent.includes('Updating')
      && document.querySelector('.grid figure .art canvas')?.__paintAt >= t;
  }, start, { timeout: 120000 });
  // A rail-close layout change requires a fresh paint. Some phone layouts keep
  // the same sampling dimensions: there, editor publication and native Save are
  // the acceptance gates; do not wait for a needless conversion or claim one.
  const publishedMarker = await page.evaluate(() => performance.now());
  const priorSize = await page.locator('.grid figure .art canvas').evaluate(c => [c.width, c.height]);
  await rail(false);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const closedSize = await page.locator('.grid figure .art canvas').evaluate(c => [c.width, c.height]);
  const sampledDimensionsChanged = priorSize.some((v, i) => v !== closedSize[i]);
  if (sampledDimensionsChanged) await page.waitForFunction(t => document.querySelector('.grid figure .art canvas')?.__paintAt >= t, publishedMarker, { timeout: 120000 });
  const after = await metrics();
  await rail(true);
  await page.getByRole('button', { name: 'Edit palette', exact: true }).click();
  const editor = page.locator('dialog.palette-import-modal'); await editor.waitFor();
  const colors = [];
  for (;;) {
    colors.push(...await editor.locator('.palette-review-grid button').evaluateAll(ns => ns.map(n => n.getAttribute('aria-label').split(' ').at(-1).toLowerCase())));
    const next = editor.getByRole('button', { name: 'Next', exact: true });
    if (!await next.count() || !await next.isEnabled()) break;
    await next.click();
  }
  assert(colors.length && colors.length <= 64); assert.equal(new Set(colors).size, colors.length);
  await page.getByRole('button', { name: 'Close palette editor', exact: true }).click();
  await rail(false);
  const source = await decode(fileBytes), exports = [];
  async function check(label, selected) {
    const bytes = await save(page, () => page.getByRole('button', { name: 'Save image', exact: true }).click(), { name: 'kenney-sheet-2048-palette.png', label, kind: 'auto2048' });
    const actual = await decode(bytes); assert.equal(actual.w, 2048); assert.equal(actual.h, 2048);
    const expected = nearest(source.frames[0], selected).data, result = compare(actual.frames[0], expected), membership = contract(actual.frames[0], source.frames[0], selected);
    assert.equal(result.rgbMismatch, 0); assert.equal(result.alphaMismatch, 0); assert.equal(membership.offPalette, 0); assert.equal(membership.alphaWrong, 0);
    await writeFile(path.join(output, label + '.png'), bytes);
    exports.push({ label, width: actual.w, height: actual.h, rgbMismatch: result.rgbMismatch, alphaMismatch: result.alphaMismatch, sha256: sha(bytes) });
  }
  await check('auto', colors);
  await rail(true);
  const marker = await page.evaluate(() => performance.now());
  await page.getByRole('button', { name: 'Resurrect 64', exact: true }).click();
  await rail(false);
  await page.waitForFunction(t => document.querySelector('.grid figure .art canvas')?.__paintAt >= t, marker);
  await check('res64', palette);
  await page.screenshot({ path: path.join(output, 'wall.png') });
  assert.deepEqual(errors, []);
  const report = { commit: '62dc29c', baseURL, sourceSha256: sha(fileBytes), palette: colors, sampledDimensionsChanged, freshPostPublicationPaintRequired: sampledDimensionsChanged, importAndAutoCPUms: (after.TaskDuration - before.TaskDuration) * 1000,
    exports, errors, notes: ['One bounded 2048px sparse CC0 sheet, Auto then Resurrect64; source file transfer excluded from timing.', 'Auto palette extracted from editable draft in original order; Save verified by independent scalar nearest+Sharp decode, not an independent generation-quality oracle.', 'Auto stage ends after editor publication and rail-close layout; a new paint is required only if sampling dimensions changed. Without that change, timing does not prove a new post-publication wall paint.', 'One timing, not a speedup comparison or memory bound.'] };
  await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  await cdp.detach(); page.off('pageerror', onError);
  return report;
}
