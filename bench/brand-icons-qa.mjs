// npm run build && node bench/brand-icons-qa.mjs
// Playwright/sharp can be supplied with PLAYWRIGHT_MODULE / SHARP_MODULE.
// ENGINE=edge|firefox|webkit limits a rerun; defaults to all three engines.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
const engineNames = ['edge', 'firefox', 'webkit'];
assert(!process.env.ENGINE || engineNames.includes(process.env.ENGINE),
  `Unsupported ENGINE "${process.env.ENGINE}"; choose ${engineNames.join(', ')} or leave it unset.`);
const require = createRequire(import.meta.url);
const bundled = 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
function dependency(name, override) { try { return require(override ?? name); } catch { return require(bundled + name); } }
const playwright = dependency('playwright', process.env.PLAYWRIGHT_MODULE), sharp = dependency('sharp', process.env.SHARP_MODULE);
const root = resolve('dist'), output = resolve('.tmp/brand-icons-qa');
mkdirSync(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const requests = [];
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  requests.push(path);
  if (path.startsWith('/colorfetti/')) path = path.slice('/colorfetti'.length);
  const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const results = { cases: [], assetRenders: [], faviconRequests: [], limits: ['Browser engine tests do not prove native Safari chrome or physical iOS/Android launcher installation behavior.', 'Reported color preference cannot identify every custom browser tab-bar background.'] };
const delayedDarkPng = 'data:image/png;base64,' + readFileSync('src/assets/logo-dark.png').toString('base64');
const fixture = await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 37, g: 89, b: 149, alpha: 1 } } }).png().toBuffer();
const themeRGB = theme => theme === 'dark' ? [255, 253, 249, 255] : [32, 32, 32, 255];

async function helpPixels(page, theme) {
  await page.waitForFunction(expected => {
    const image = document.querySelector('.help-logo');
    if (!image?.complete || !image.naturalWidth) return false;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 60;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 60, 60);
    const frame = [...ctx.getImageData(0, 0, 1, 1).data], gap = ctx.getImageData(44, 0, 1, 1).data[3];
    return frame.every((v, i) => v === expected[i]) && gap === 0;
  }, themeRGB(theme));
}
async function openHelp(page) {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.locator('dialog.help[open]').waitFor();
}
async function toggleTheme(page, target) {
  if (await page.locator('dialog.help[open]').count()) await page.locator('dialog.help button[aria-label="Close"]').click();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: `${target === 'dark' ? 'Dark' : 'Light'} mode`, exact: true }).click();
  await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, target);
}
async function favicons(page, system, base) {
  const hrefs = await page.locator('link[rel=icon]').evaluateAll(nodes => nodes.map(n => n.href));
  const names = system === 'dark' ? ['favicon-dark.ico', 'favicon-dark-32x32.png', 'favicon-dark.svg'] : ['favicon.ico', 'favicon-32x32.png', 'favicon-light.svg'];
  assert.deepEqual(hrefs, names.map(name => origin + base + name + '?v=2'));
  for (const href of hrefs) assert.equal((await page.request.get(href)).status(), 200);
}
async function demoPixels(page, theme) {
  try { await page.waitForFunction(expected => {
    const canvas = document.querySelector('.grid.awaiting-images .art canvas');
    if (canvas?.width !== 60 || canvas.height !== 60) return false;
    const ctx = canvas.getContext('2d'), first = [...ctx.getImageData(0, 0, 1, 1).data];
    return first.every((v, i) => v === expected[i]) && ctx.getImageData(44, 0, 1, 1).data[3] === 0;
  }, themeRGB(theme), { timeout: 10000 }); } catch (error) {
    console.log('Demo diagnostic', await page.evaluate(() => {
      const c = document.querySelector('.grid.awaiting-images .art canvas');
      return { theme: document.documentElement.dataset.theme, toggle: document.querySelector('.view-toggle')?.getAttribute('aria-pressed'), width: c?.width, first: c ? [...c.getContext('2d').getImageData(0, 0, 1, 1).data] : null, text: document.body.innerText.slice(0, 220) };
    }));
    await page.screenshot({ path: resolve(output, 'failure.png') });
    throw error;
  }
}
try {
  const engines = [['edge', playwright.chromium, { executablePath: process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' }], ['firefox', playwright.firefox, {}], ['webkit', playwright.webkit, {}]];
  for (const [name, engine, options] of engines) {
    if (process.env.ENGINE && process.env.ENGINE !== name) continue;
    const browser = await engine.launch({ ...options, headless: true });
    try {
      for (const system of ['light', 'dark']) for (const phone of [false, true]) {
        const base = phone ? '/colorfetti/' : '/';
        const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1365, height: 900 }, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1, colorScheme: system });
        const page = await context.newPage(), errors = [], badAssets = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(origin)) badAssets.push(r.url()); });
        // Confirm source loading occurred; pending-load overlap has a separate gated case below.
        await context.addInitScript(darkPng => {
          const actual = window.fetch.bind(window);
          window.__darkLogoLoads = 0;
          window.fetch = async (input, options) => {
            const response = await actual(input, options);
            if (String(input) === darkPng) { window.__darkLogoLoads++; await new Promise(r => setTimeout(r, 150)); }
            return response;
          };
        }, delayedDarkPng);
        await page.goto(origin + base);
        await page.locator('dialog.help[open]').waitFor();
        assert.equal(await page.title(), 'Colorfetti');
        assert.equal(await page.locator('.help header p').textContent(), 'Throw your pixels a palette party. Recolor images and animations.');
        await helpPixels(page, system); await favicons(page, system, base);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: resolve(output, `${name}-${phone ? 'phone' : 'desktop'}-${system}-help.png`) });
        await page.locator('dialog.help button[aria-label="Close"]').click();
        // Original comparison displays source artwork, independent of Auto quantization.
        await page.locator('.view-toggle').click();
        await demoPixels(page, system);
        await page.locator('.view-toggle').click();
        await demoPixels(page, system);
        assert.equal(await page.locator('.view-toggle').getAttribute('aria-pressed'), 'true');
        const override = system === 'dark' ? 'light' : 'dark';
        await toggleTheme(page, override); await openHelp(page); await helpPixels(page, override);
        await favicons(page, system, base); // app preference does not choose tab artwork
        await page.locator('dialog.help button[aria-label="Close"]').click();
        await demoPixels(page, override);
        for (const target of [system, override, system]) await toggleTheme(page, target);
        await demoPixels(page, system);
        assert.equal(await page.locator('.view-toggle').getAttribute('aria-pressed'), 'true', 'Rapid theme switches must paint the converted Auto demo');
        assert((await page.evaluate(() => window.__darkLogoLoads)) > 0, 'The theme-race test must exercise the delayed dark image');
        await page.emulateMedia({ colorScheme: override });
        await page.waitForFunction(target => new URL(document.querySelector('link[rel=icon][type="image/svg+xml"]').href).pathname.endsWith(`favicon-${target}.svg`), override);
        await favicons(page, override, base);
        // Reload keeps the saved app preference while favicon selection follows the browser.
        const savedTheme = await page.locator('html').getAttribute('data-theme');
        await page.reload();
        await page.waitForFunction(t => document.documentElement.dataset.theme === t, savedTheme);
        await openHelp(page); await helpPixels(page, savedTheme);
        await favicons(page, override, base);
        await page.locator('dialog.help button[aria-label="Close"]').click();
        await page.locator('input[type=file][multiple]').setInputFiles({ name: 'theme-independent.png', mimeType: 'image/png', buffer: fixture });
        await page.waitForFunction(() => document.querySelector('.grid:not(.awaiting-images) .tile canvas')?.width === 2);
        if (await page.locator('.view-toggle').getAttribute('aria-pressed') === 'true') await page.locator('.view-toggle').click();
        const pixels = () => page.evaluate(() => [...document.querySelector('.grid:not(.awaiting-images) .tile canvas').getContext('2d').getImageData(0, 0, 2, 2).data]);
        const before = await pixels();
        assert.deepEqual(before, Array(4).fill([37, 89, 149, 255]).flat());
        await toggleTheme(page, savedTheme === 'dark' ? 'light' : 'dark');
        assert.deepEqual(await pixels(), before, 'Changing UI theme must not change imported originals');
        const manifestURL = await page.locator('link[rel=manifest]').getAttribute('href');
        const manifestAddress = new URL(manifestURL, page.url()), manifest = await (await page.request.get(manifestAddress.href)).json();
        assert.equal(new URL(manifest.start_url, manifestAddress).pathname, base);
        for (const icon of manifest.icons) assert.equal((await page.request.get(new URL(icon.src, manifestAddress).href)).status(), 200);
        for (const href of await page.locator('link[rel="apple-touch-icon"],link[rel="mask-icon"]').evaluateAll(nodes => nodes.map(n => n.href))) assert.equal((await page.request.get(href)).status(), 200);
        assert.deepEqual(errors, []); assert.deepEqual(badAssets, []);
        results.cases.push({ engine: name, system, viewport: phone ? 'phone' : 'desktop', base, passed: true });
        console.log(`PASS ${name} ${phone ? 'phone' : 'desktop'} ${system}: transparent Help/demo, overrides, rapid switch, live favicon preference, reload, imported pixels, manifest and platform URLs`);
        await context.close();
      }
      // Hold decoding explicitly while the user picks several themes. Publishing
      // must choose the latest theme, not the one present when requests began.
      const bootContext = await browser.newContext({ colorScheme: 'light', viewport: { width: 1365, height: 900 } });
      await bootContext.addInitScript(darkPng => {
        const actual = window.fetch.bind(window);
        window.fetch = async (input, options) => {
          const response = await actual(input, options);
          if (String(input) === darkPng) await new Promise(resolve => { window.__releaseDarkLogo = resolve; });
          return response;
        };
      }, delayedDarkPng);
      const bootPage = await bootContext.newPage(), bootErrors = [];
      bootPage.on('pageerror', e => bootErrors.push(e.message));
      await bootPage.goto(origin);
      await bootPage.locator('dialog.help[open]').waitFor();
      await bootPage.waitForFunction(() => typeof window.__releaseDarkLogo === 'function');
      for (const target of ['dark', 'light', 'dark']) await toggleTheme(bootPage, target);
      assert.equal(await bootPage.locator('.grid.awaiting-images .art canvas').count(), 0, 'Demo must still be waiting on the gated decode');
      await openHelp(bootPage); await helpPixels(bootPage, 'dark');
      await bootPage.locator('dialog.help button[aria-label="Close"]').click();
      await bootPage.evaluate(() => window.__releaseDarkLogo());
      await demoPixels(bootPage, 'dark');
      assert.equal(await bootPage.locator('.view-toggle').getAttribute('aria-pressed'), 'true');
      await favicons(bootPage, 'light', '/');
      // Legacy source reanalysis must preserve the demo's source identity; only
      // changing the theme artwork should recreate its tile/cache lifecycle.
      await bootPage.getByRole('button', { name: 'Palette', exact: true }).click();
      await bootPage.getByRole('group', { name: 'Color system', exact: true }).getByRole('button', { name: '1-bit', exact: true }).click();
      await bootPage.keyboard.press('Escape');
      await bootPage.getByRole('button', { name: 'Style', exact: true }).click();
      await bootPage.getByRole('button', { name: 'More settings', exact: true }).click();
      await bootPage.evaluate(() => window.__demoTile = document.querySelector('.grid.awaiting-images .tile'));
      await bootPage.getByRole('group', { name: 'Brightness', exact: true }).getByRole('button', { name: 'Value', exact: true }).click();
      await bootPage.waitForFunction(() => JSON.parse(localStorage.getItem('colorfetti')).settings.cutout.source === 'value');
      await bootPage.waitForFunction(() => document.querySelector('.grid.awaiting-images .art canvas')?.width === 60);
      assert(await bootPage.evaluate(() => window.__demoTile === document.querySelector('.grid.awaiting-images .tile')));
      await bootPage.keyboard.press('Escape');
      await toggleTheme(bootPage, 'light');
      await bootPage.waitForFunction(() => document.querySelector('.grid.awaiting-images .art canvas')?.width === 60);
      assert(await bootPage.evaluate(() => window.__demoTile !== document.querySelector('.grid.awaiting-images .tile')));
      await bootPage.locator('.view-toggle').click(); await demoPixels(bootPage, 'light');
      await bootPage.getByRole('button', { name: 'Palette', exact: true }).click();
      await bootPage.getByRole('group', { name: 'Color system', exact: true }).getByRole('button', { name: 'Palette', exact: true }).click();
      await bootPage.keyboard.press('Escape');
      await demoPixels(bootPage, 'light');
      assert.equal(await bootPage.locator('.view-toggle').getAttribute('aria-pressed'), 'true');
      assert.deepEqual(bootErrors, []);
      results.cases.push({ engine: name, scenario: 'gated startup theme changes, converted Auto and 1-bit source reanalysis', passed: true });
      console.log(`PASS ${name}: pending-decode theme changes, converted Auto and 1-bit reanalysis/source identity`);
      await bootContext.close();
      // Render both actual SVGs in the engine; verify bounds/alpha via an independent canvas.
      const page = await browser.newPage(); await page.goto(origin);
      const files = ['favicon-light.svg', 'favicon-dark.svg', 'favicon-16x16.png', 'favicon-dark-16x16.png', 'favicon-32x32.png', 'favicon-dark-32x32.png'];
      for (const file of files) {
        const stats = await page.evaluate(async url => {
          const image = new Image(); image.src = url; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 60;
          const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0, 60, 60);
          const rgba = ctx.getImageData(0, 0, 60, 60).data;
          return { first: [...rgba.slice(0, 4)], transparent: [...rgba].some((v, i) => i % 4 === 3 && v === 0) };
        }, origin + '/' + file);
        assert.deepEqual(stats.first, themeRGB(file.includes('dark') ? 'dark' : 'light')); assert(stats.transparent);
      }
      results.assetRenders.push({ engine: name, files, passed: true });
      await page.close();
    } finally { await browser.close(); }
  }
  results.faviconRequests = [...new Set(requests.filter(path => path.includes('favicon')))];
  assert(results.cases.length > 0 && results.assetRenders.length > 0, 'Browser QA must run cases and render assets');
  results.passed = true;
  writeFileSync(resolve(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`PASS ${results.cases.length} browser/theme/viewport cases and ${results.assetRenders.length} independent engine asset-render sets`);
} catch (error) {
  results.failure = error.stack; writeFileSync(resolve(output, 'results.json'), JSON.stringify(results, null, 2)); throw error;
} finally { await new Promise(r => server.close(r)); }
