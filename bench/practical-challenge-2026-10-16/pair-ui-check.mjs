import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { PRESETS } from '../../src/lib/presets.js';
import { sharp, sha } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
const report = { scope: 'Independent Edge compositing, native-input DOM hit targets, reactive idle and baseline export comparison; OS color-picker UI is not claimed.', checks: [], errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, colorScheme: 'light' });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack));
  await page.addInitScript(() => {
    globalThis.__inkPaints = 0;
    for (const method of ['fill', 'fillRect']) {
      const old = CanvasRenderingContext2D.prototype[method];
      CanvasRenderingContext2D.prototype[method] = function (...args) { if (this.canvas.matches('.palette-preview,.sw>canvas')) __inkPaints++; return old.apply(this, args); };
    }
  });
  const setting = { family: 'two-color', first: '#000000', second: '#ffffff', style: 'solid', theme: 'light' };
  async function start(url) {
    await page.goto(url); await page.locator('button[aria-label="Palette"]').waitFor(); await page.evaluate(s => { localStorage.setItem('colorfetti', JSON.stringify(s)); localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti-welcomed', '1'); }, setting); await page.reload();
    await page.locator('button[aria-label="Palette"]').click();
  }
  await start('http://127.0.0.1:5343/');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setAutoDarkModeOverride', { enabled: true });
  await page.evaluate(() => { const e = document.createElement('div'); e.id = 'forced-dark-sentinel'; Object.assign(e.style, { position: 'fixed', top: '0', left: '0', width: '20px', height: '20px', background: '#ffffff', zIndex: '999999' }); document.body.append(e); });
  async function pixelShot() {
    const bytes = await page.screenshot();
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { bytes, pixel: (x, y) => '#' + [...data.subarray((Math.floor(y) * info.width + Math.floor(x)) * 4, (Math.floor(y) * info.width + Math.floor(x)) * 4 + 3)].map(n => n.toString(16).padStart(2, '0')).join('') };
  }
  await page.waitForTimeout(100);
  const sentinel = (await pixelShot()).pixel(10, 10);
  assert.notEqual(sentinel, '#ffffff', 'Forced-dark test must actually repaint unprotected CSS');
  for (const preset of PRESETS) {
    await page.locator(`.palette-choice[aria-label="${preset.name}"]`).click();
    await page.waitForTimeout(40);
    const boxes = await page.locator(`.palette-choice[aria-label="${preset.name}"] .palette-preview`).evaluateAll(ns => ns.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    assert.equal(boxes.length, 1);
    const box = boxes[0], shot = await pixelShot();
    assert.equal(shot.pixel(box.x + box.width * .3, box.y + box.height * .3), preset.dark.toLowerCase(), preset.name + ' first');
    assert.equal(shot.pixel(box.x + box.width * .7, box.y + box.height * .7), preset.light.toLowerCase(), preset.name + ' second');
    const swatches = await page.locator('.dock .sw').evaluateAll(ns => ns.map(n => { const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, inputHit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.tagName === 'INPUT' }; }));
    assert.deepEqual(swatches.map(p => shot.pixel(p.x, p.y)), [preset.dark.toLowerCase(), preset.light.toLowerCase()]);
    assert(swatches.every(s => s.inputHit));
    report.checks.push({ palette: preset.name, pairAndCurrentExact: true, nativeInputsRetainHitTargets: true });
  }
  await page.locator('.palette-choice[aria-label="Glow"]').click();
  await page.locator('.palette-transparency button').nth(1).click();
  assert.equal(await page.locator('.sw.none').count(), 1); assert.equal(await page.locator('.sw.none canvas').count(), 0);
  await page.getByRole('button', { name: 'Swap colors', exact: true }).click();
  assert.match(await page.locator('.sw').nth(1).getAttribute('class'), /none/);
  const input = page.locator('.sw input').nth(1);
  await input.evaluate(n => { n.value = '#ff00ff'; n.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.locator('.sw.none').count(), 0); assert.equal(await input.inputValue(), '#ff00ff');
  await page.waitForTimeout(200);
  const paints = await page.evaluate(() => __inkPaints); await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => __inkPaints), paints, 'Settled palette UI must not redraw continually');
  report.forcedDarkSentinel = sentinel; report.idlePalettePaints = 0;
  await writeFile(new URL('pair-ui-forced-dark.png', import.meta.url), (await pixelShot()).bytes);
  await cdp.send('Emulation.setAutoDarkModeOverride', { enabled: false });
  const outputs = [];
  for (const url of ['http://127.0.0.1:5342/', 'http://127.0.0.1:5343/']) {
    await start(url); await page.locator('button[aria-label="Palette"]').click();
    await page.locator('input[type=file]').first().setInputFiles('bench/practical-workloads-2026-10-16/fixtures/dungeon-wizard.png');
    await page.locator('.grid figure .art canvas').waitFor();
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save image', exact: true }).click();
    const download = await pending, bytes = await readFile(await download.path()); outputs.push({ url, sha256: sha(bytes) });
  }
  assert.equal(outputs[0].sha256, outputs[1].sha256); report.baselineCandidatePng = outputs;
  const ordinary = [];
  for (const [version, url] of [['baseline', 'http://127.0.0.1:5342/'], ['candidate', 'http://127.0.0.1:5343/']]) {
    for (const theme of ['light', 'dark']) {
      const nativeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
      const ordinaryPage = await nativeContext.newPage();
      await ordinaryPage.addInitScript(s => { localStorage.setItem('colorfetti', JSON.stringify(s)); localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti-welcomed', '1'); }, { ...setting, theme });
      await ordinaryPage.goto(url);
      await ordinaryPage.locator('button[aria-label="Palette"]').click();
      assert.equal(await ordinaryPage.evaluate(() => document.documentElement.dataset.theme), theme);
      await ordinaryPage.waitForTimeout(200);
      const bytes = await ordinaryPage.screenshot(), { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const pixel = (x, y) => '#' + [...data.subarray((Math.floor(y) * info.width + Math.floor(x)) * 4, (Math.floor(y) * info.width + Math.floor(x)) * 4 + 3)].map(n => n.toString(16).padStart(2, '0')).join('');
      const geometry = await ordinaryPage.locator('.dock .sw').evaluateAll(ns => ns.map(n => { const r = n.getBoundingClientRect(), input = n.querySelector('input').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, inputWidth: input.width, inputHeight: input.height, shadow: getComputedStyle(n).boxShadow }; }));
      assert.deepEqual(geometry.map(r => pixel(r.x + r.width / 2, r.y + r.height / 2)), ['#000000', '#ffffff']);
      await writeFile(new URL(`pair-ui-${version}-${theme}.png`, import.meta.url), bytes);
      ordinary.push({ version, theme, geometry });
      await nativeContext.close();
    }
  }
  for (const theme of ['light', 'dark']) assert.deepEqual(ordinary.find(r => r.version === 'baseline' && r.theme === theme).geometry, ordinary.find(r => r.version === 'candidate' && r.theme === theme).geometry);
  report.ordinaryLightDarkGeometry = ordinary;
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(new URL('pair-ui-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n'); await browser.close();
}
console.log(JSON.stringify(report));
