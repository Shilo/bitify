# Bitify App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Bitify, a browser app that redraws pixel art images in two user-chosen colors, as a Vite + Svelte 5 single-page app.

**Architecture:** All conversion logic is a pure, DOM-free module (`src/lib/bitify.js`) that turns pixels into a one-byte-per-pixel mask and the mask into two-color pixels. `App.svelte` holds all state and passes it down; `Tile.svelte` derives a mask per image and repaints when the mask or a color changes; `Dock.svelte` edits the settings through bindable props. All styling is one global stylesheet carried over from the approved prototype.

**Tech Stack:** Vite 8, Svelte 5 (runes, no SvelteKit), plain JavaScript, Vitest 4, fflate.

**Spec:** [docs/superpowers/specs/2026-10-06-bitify-app-design.md](../specs/2026-10-06-bitify-app-design.md). Visual reference: [docs/superpowers/specs/2026-10-06-bitify-prototype.html](../specs/2026-10-06-bitify-prototype.html) (open it in a real browser; file previews that do not run scripts show nothing).

Every code block in this plan was built and run in a throwaway copy before the plan was written: the 25 unit tests pass, `vite build` succeeds with no warnings at Task 5's state and at the final state, and both browser check scripts returned exactly the results listed under them.

## Global Constraints

- Work on the `bitify-app` branch. Never push.
- **One commit per task**, made at the end of that task, containing only that task's files. This is a direct instruction from the user.
- End every commit message with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`, `$bindable`); events are attributes (`onclick`). No SvelteKit, no stores, no `export let`, no `on:` directives.
- Plain JavaScript. No TypeScript.
- Dependencies are limited to `fflate` (runtime) and `vite`, `svelte`, `@sveltejs/vite-plugin-svelte`, `vitest` (development). Add nothing else.
- `src/lib/bitify.js` must stay free of DOM access so it runs under Vitest's default Node environment.
- All CSS lives in `src/app.css` as global rules. Components have no `<style>` blocks. Do not add a global `box-sizing: border-box` reset; the approved prototype had none and sizes depend on that.
- User-facing text is copied exactly as written in this plan. American spelling ("color").
- Defaults: first color `#f6dfa4`, second color `#0b0a0c`, style `lines`, threshold Auto, wall showing bitified images.
- A pixel is empty when its alpha is below 128. Output pixels are fully opaque or fully transparent.
- Saved files are named `<name without extension>-1bit.png`; the zip is `bitify.zip`.
- The interface must work at desktop width and at 375px wide with a coarse pointer, with no horizontal page scroll.
- The log line `no Svelte config found ... using default configuration` from the Svelte plugin is expected. Do not add a `svelte.config.js`.

## Review Focus

Inputs the spec implies but does not spell out, most likely first. Each is pinned by a check in the task named.

1. **A batch that mixes images with files that are not images** (a `.txt`, a corrupt PNG). The images load, the rest are skipped, and a message says how many. Pinned in Task 5, Step 7 (`tiles: 2` and the skip message after dropping two images and a text file).
2. **The same file added twice, and awkward names** (no extension, several dots, a name that is only an extension, a path separator). Every output name is unique and valid. Pinned in Task 4's `outNames` tests, and Task 5 Step 7 drops two files with the same name.
3. **Semi-transparent pixels** such as anti-aliased sprite edges. Alpha 127 is empty, alpha 128 is solid; nothing is left half-transparent. Pinned in Task 2's `treats alpha below 128 as empty` test.
4. **An image with no solid pixels at all** (fully transparent, or a blank canvas). Analysis and every style return without error, and the result is all empty. Pinned in Task 2's and Task 3's `survives an image with no solid pixels` tests.
5. **A large, non-square image** such as a 300×200 scene. Every style returns a mask of the right size with empty pixels exactly where the source is empty, which catches swapped width and height. Pinned in Task 2's and Task 3's large-image tests.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.claude/launch.json` | Project shell and dev server config | 1 |
| `src/main.js` | Mounts the app | 1, 5 |
| `src/lib/bitify.js` | Pure conversion: `analyze`, `mask`, `colorize`, `otsu`, `hexToRgb` | 2, 3 |
| `src/lib/bitify.test.js` | Unit tests for the conversion | 2, 3 |
| `src/lib/save.js` | Output names, zip, PNG encoding, downloads | 4 |
| `src/lib/save.test.js` | Unit tests for names and zip | 4 |
| `src/app.css` | Every style rule | 5, 6 |
| `src/PixelIcon.svelte` | A 7×7 one-bit icon | 5 |
| `src/Pixels.svelte` | A canvas that shows an `ImageData` | 5 |
| `src/Tile.svelte` | One image on the wall | 5 |
| `src/App.svelte` | State, top bar, wall, empty state, drop, paste, keys, messages | 1, 5, 6 |
| `src/Dock.svelte` | The dock and its two panels | 6 |

## Running the app for browser checks

Tasks 5 and 6 end with a check in a real browser.

- In Claude Code: call `preview_start` with the name `bitify` (defined in `.claude/launch.json` in Task 1). It opens `http://localhost:5173`.
- Otherwise: run `npm run dev` and open `http://localhost:5173`.

The check scripts are run in the page with the browser's JavaScript tool (or pasted into the DevTools console). They simulate a file drop, and they record saves instead of downloading, so no file leaves the browser. Reload the page before each run.

---

### Task 1: Project shell

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.claude/launch.json`, `src/main.js`, `src/App.svelte`
- Generated: `package-lock.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run dev`, `npm run build`, `npm test`; a mount point `<div id="app">`; the preview configuration named `bitify`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bitify",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Install the toolchain**

Run: `npm install -D vite svelte @sveltejs/vite-plugin-svelte vitest`
Expected: exits 0 and adds a `devDependencies` block to `package.json`. Versions at the time of writing: vite 8.3, svelte 5.57, @sveltejs/vite-plugin-svelte 7.3, vitest 4.1. Node 20.19 or newer is required.

- [ ] **Step 3: Create `vite.config.js`**

```js
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Bitify</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2' shape-rendering='crispEdges'><rect width='2' height='2' fill='%230b0a0c'/><rect width='1' height='1' fill='%23f6dfa4'/><rect x='1' y='1' width='1' height='1' fill='%23f6dfa4'/></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=Schibsted+Grotesk:wght@400..700&display=swap" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 6: Create `src/main.js`**

```js
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
```

- [ ] **Step 7: Create a placeholder `src/App.svelte`**

```svelte
<h1>Bitify</h1>
```

- [ ] **Step 8: Create `.claude/launch.json`**

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "bitify",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    }
  ]
}
```

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: ends with `✓ built in …` and lists `dist/index.html` and one `dist/assets/index-*.js`. No warnings other than the expected `no Svelte config found` line.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html .gitignore .claude/launch.json src/main.js src/App.svelte
git commit -m "chore: set up Vite and Svelte project" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Conversion core and the brightness styles

**Files:**
- Create: `src/lib/bitify.js`
- Test: `src/lib/bitify.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `hexToRgb(hex: '#rrggbb'): [r, g, b]`
  - `otsu(hist: number[256], fallback: number): number`
  - `analyze({ width, height, data: Uint8ClampedArray }): { w, h, data, lum: Uint8Array, hasAlpha: boolean, auto: number }`. Accepts a real `ImageData` or any object of that shape.
  - `mask(img, style, threshold = null): Uint8Array`, one byte per pixel: `0` empty, `1` first color, `2` second color. `style` is one of `'solid' | 'checker' | 'bayer' | 'atkinson' | 'silhouette'` in this task; `'lines'` arrives in Task 3. `threshold` `null` means Auto.
  - `colorize(mask: Uint8Array, first: '#rrggbb', second: '#rrggbb'): Uint8ClampedArray` of RGBA, four bytes per mask byte.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/bitify.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { analyze, mask, colorize, otsu, hexToRgb } from './bitify.js';

// Builds an analysed image from rows of characters. Each character maps to [r, g, b] or
// [r, g, b, a] in `pal`; a character that is not in `pal` is an empty (transparent) pixel.
function image(rows, pal) {
  const h = rows.length, w = rows[0].length, data = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = pal[ch];
    if (c) data.set([c[0], c[1], c[2], c[3] ?? 255], (y * w + x) * 4);
  }));
  return analyze({ width: w, height: h, data });
}
const grey = v => [v, v, v];
// Renders a mask as rows of text: ' ' empty, '#' first color, '.' second color.
const show = (m, w) =>
  Array.from({ length: m.length / w }, (_, y) => [...m.slice(y * w, (y + 1) * w)].map(v => ' #.'[v]).join(''));
const count = (m, v) => m.filter(x => x === v).length;

describe('analyze', () => {
  it('records size, brightness and whether any pixel is empty', () => {
    const img = image(['a b'], { a: grey(255), b: grey(0) });
    expect([img.w, img.h, img.hasAlpha]).toEqual([3, 1, true]);
    expect([...img.lum]).toEqual([255, 0, 0]);
    expect(image(['ab'], { a: grey(255), b: grey(0) }).hasAlpha).toBe(false);
  });

  it('treats alpha below 128 as empty and 128 or more as solid', () => {
    const img = image(['ab'], { a: [200, 200, 200, 127], b: [200, 200, 200, 128] });
    expect(show(mask(img, 'silhouette'), 2)).toEqual([' #']);
  });

  it('picks an auto threshold between two brightness groups', () => {
    const img = image(['aabb'], { a: grey(50), b: grey(200) });
    expect(img.auto).toBeGreaterThanOrEqual(50);
    expect(img.auto).toBeLessThan(200);
  });

  it('survives an image with no solid pixels', () => {
    const img = image(['  ', '  '], {});
    expect(img.auto).toBe(127);
    for (const style of ['solid', 'checker', 'bayer', 'atkinson', 'silhouette']) {
      expect(show(mask(img, style), 2)).toEqual(['  ', '  ']);
    }
  });
});

describe('otsu', () => {
  it('returns the fallback for an empty histogram', () => {
    expect(otsu(new Array(256).fill(0), 42)).toBe(42);
  });
});

describe('mask', () => {
  it('solid: brighter than the threshold is second color, the rest first', () => {
    const img = image(['abc'], { a: grey(0), b: grey(100), c: grey(200) });
    expect(show(mask(img, 'solid', 100), 3)).toEqual(['##.']);
  });

  it('solid: uses the auto threshold when none is given', () => {
    const img = image(['aabb'], { a: grey(50), b: grey(200) });
    expect(show(mask(img, 'solid'), 4)).toEqual(['##..']);
  });

  it('checker: a mid-tone becomes a checkerboard, extremes stay flat', () => {
    const mid = image(['aaaa', 'aaaa'], { a: grey(128) });
    expect(show(mask(mid, 'checker', 128), 4)).toEqual(['.#.#', '#.#.']);
    const light = image(['aaaa', 'aaaa'], { a: grey(250) });
    expect(show(mask(light, 'checker', 128), 4)).toEqual(['....', '....']);
    const dark = image(['aaaa', 'aaaa'], { a: grey(5) });
    expect(show(mask(dark, 'checker', 128), 4)).toEqual(['####', '####']);
  });

  it('bayer: a mid-tone lights exactly half of each 4x4 cell', () => {
    const img = image(['aaaa', 'aaaa', 'aaaa', 'aaaa'], { a: grey(128) });
    expect(count(mask(img, 'bayer', 128), 2)).toBe(8);
  });

  it('atkinson: flat white and black stay flat, a mid-tone mixes both colors', () => {
    const rows = Array(8).fill('aaaaaaaa');
    expect(count(mask(image(rows, { a: grey(255) }), 'atkinson', 128), 2)).toBe(64);
    expect(count(mask(image(rows, { a: grey(0) }), 'atkinson', 128), 1)).toBe(64);
    const light = count(mask(image(rows, { a: grey(128) }), 'atkinson', 128), 2);
    expect(light).toBeGreaterThan(16);
    expect(light).toBeLessThan(48);
  });

  it('silhouette: every solid pixel is first color', () => {
    const img = image([' a ', 'bcb'], { a: grey(255), b: grey(0), c: grey(128) });
    expect(show(mask(img, 'silhouette'), 3)).toEqual([' # ', '###']);
  });

  it('keeps empty pixels empty and fills the rest, on a large non-square image', () => {
    const w = 300, h = 200, data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i++) data[i] = (i * 2654435761) >>> 24;
    const img = analyze({ width: w, height: h, data });
    for (const style of ['solid', 'checker', 'bayer', 'atkinson', 'silhouette']) {
      const m = mask(img, style);
      expect(m.length).toBe(w * h);
      expect(m.every((v, p) => (v === 0) === (data[p * 4 + 3] < 128))).toBe(true);
    }
  });
});

describe('colorize', () => {
  it('reads #rrggbb', () => {
    expect(hexToRgb('#f6dfa4')).toEqual([246, 223, 164]);
  });

  it('paints first and second color opaque and leaves empty pixels transparent', () => {
    expect([...colorize(Uint8Array.of(0, 1, 2), '#ff0000', '#0000ff')]).toEqual([0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 255, 255]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. The file cannot be loaded because `./bitify.js` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/bitify.js`:

```js
// 1-bit conversion. No DOM: everything works on plain typed arrays, so it runs in tests.

const ALPHA_CUT = 128; // alpha below this is an empty pixel
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Otsu's method: the value that best splits a 256-bin histogram into two groups.
// Returns `fallback` when there is nothing to split.
export function otsu(hist, fallback) {
  let n = 0, sum = 0;
  for (let i = 0; i < 256; i++) { n += hist[i]; sum += i * hist[i]; }
  let sumB = 0, wB = 0, best = 0, t = fallback;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const v = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (v > best) { best = v; t = i; }
  }
  return t;
}

// Takes an ImageData-shaped object. Done once per image; `mask` reuses the result.
export function analyze({ width: w, height: h, data }) {
  const lum = new Uint8Array(w * h), hist = new Array(256).fill(0);
  let hasAlpha = false;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (data[i + 3] < ALPHA_CUT) { hasAlpha = true; continue; }
    lum[p] = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    hist[lum[p]]++;
  }
  return { w, h, data, lum, hasAlpha, auto: otsu(hist, 127) };
}

// One byte per pixel: 0 empty, 1 first color (dark pixels), 2 second color (light pixels).
// `threshold` null means Auto.
export function mask(img, style, threshold = null) {
  const { w, h, lum, data } = img, m = new Uint8Array(w * h);
  const t = threshold ?? img.auto;
  const solid = p => data[p * 4 + 3] >= ALPHA_CUT;

  if (style === 'atkinson') {
    const v = Float32Array.from(lum, x => x + 128 - t);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      const on = v[p] > 128, e = (v[p] - (on ? 255 : 0)) / 8;
      m[p] = on ? 2 : 1;
      if (x + 1 < w) v[p + 1] += e;
      if (x + 2 < w) v[p + 2] += e;
      if (y + 1 < h) {
        if (x > 0) v[p + w - 1] += e;
        v[p + w] += e;
        if (x + 1 < w) v[p + w + 1] += e;
      }
      if (y + 2 < h) v[p + 2 * w] += e;
    }
    return m;
  }

  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
    if (!solid(p)) continue;
    let cut = t;
    if (style === 'checker') cut += (x + y) % 2 ? 40 : -40;
    else if (style === 'bayer') cut += ((BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 192;
    m[p] = style === 'silhouette' ? 1 : lum[p] > cut ? 2 : 1;
  }
  return m;
}

// Turns a mask into RGBA pixels. Colors are '#rrggbb'.
export function colorize(m, first, second) {
  const c = [null, hexToRgb(first), hexToRgb(second)], out = new Uint8ClampedArray(m.length * 4);
  for (let p = 0, i = 0; p < m.length; p++, i += 4) {
    if (!m[p]) continue;
    const k = c[m[p]];
    out[i] = k[0]; out[i + 1] = k[1]; out[i + 2] = k[2]; out[i + 3] = 255;
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `Test Files  1 passed (1)` and `Tests  14 passed (14)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bitify.js src/lib/bitify.test.js
git commit -m "feat: add 1-bit conversion core with brightness styles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The Lines style

Lines is the default style and the reason the app exists: it outlines each part of a sprite, not only its silhouette. A pixel becomes a line when it touches empty space, or when it sits on the darker side of a color change stronger than the threshold.

**Files:**
- Modify: `src/lib/bitify.js` (whole file replaced)
- Test: `src/lib/bitify.test.js` (tests appended)

**Interfaces:**
- Consumes: everything Task 2 produced.
- Produces:
  - `analyze(...)` additionally returns `autoLine: number`, the Auto threshold for Lines.
  - `mask(img, 'lines', threshold = null)`. With `threshold` `null` it uses `img.autoLine`; the other styles keep using `img.auto`.

- [ ] **Step 1: Write the failing tests**

Append to the end of `src/lib/bitify.test.js` (the imports and the `image`, `grey` and `show` helpers at the top of the file are reused):

```js
describe('lines', () => {
  // A 7x7 body on a transparent canvas, with a 3x3 part in its middle.
  const sprite = part => image([
    '         ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    '         ',
  ], { a: grey(200), b: grey(part) });

  it('outlines an inner part as well as the silhouette', () => {
    expect(show(mask(sprite(60), 'lines', 50), 9)).toEqual([
      '         ',
      ' ####### ',
      ' #.....# ',
      ' #.###.# ',
      ' #.#.#.# ',
      ' #.###.# ',
      ' #.....# ',
      ' ####### ',
      '         ',
    ]);
  });

  it('ignores a shading step that is not stronger than the threshold', () => {
    expect(show(mask(sprite(180), 'lines', 50), 9)).toEqual([
      '         ',
      ' ####### ',
      ' #.....# ',
      ' #.....# ',
      ' #.....# ',
      ' #.....# ',
      ' #.....# ',
      ' ####### ',
      '         ',
    ]);
  });

  it('draws a one-pixel boundary between two colors of equal brightness', () => {
    const img = image(['rrgg'], { r: [255, 0, 0], g: grey(54) });
    expect([...img.lum]).toEqual([54, 54, 54, 54]);
    expect(show(mask(img, 'lines', 50), 4)).toEqual(['.#..']);
  });

  it('frames an image only when it has empty pixels', () => {
    const flat = image(['aaa', 'aaa', 'aaa'], { a: grey(200) });
    expect(show(mask(flat, 'lines', 50), 3)).toEqual(['...', '...', '...']);
    const cut = image([' aa', 'aaa', 'aaa'], { a: grey(200) });
    expect(show(mask(cut, 'lines', 50), 3)).toEqual([' ##', '#.#', '###']);
  });

  it('auto separates part boundaries from soft shading', () => {
    const img = image(['abcd'], { a: grey(200), b: grey(180), c: grey(160), d: grey(10) });
    expect(img.autoLine).toBeGreaterThanOrEqual(20);
    expect(img.autoLine).toBeLessThan(150);
    expect(show(mask(img, 'lines'), 4)).toEqual(['...#']);
  });

  it('survives an image with no solid pixels, and a large non-square one', () => {
    const none = image(['  ', '  '], {});
    expect(none.autoLine).toBe(0);
    expect(show(mask(none, 'lines'), 2)).toEqual(['  ', '  ']);

    const w = 300, h = 200, data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i++) data[i] = (i * 2654435761) >>> 24;
    const m = mask(analyze({ width: w, height: h, data }), 'lines');
    expect(m.length).toBe(w * h);
    expect(m.every((v, p) => (v === 0) === (data[p * 4 + 3] < 128))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Tests  6 failed | 14 passed (20)`. All six failures are in the `lines` group.

- [ ] **Step 3: Write the implementation**

Replace the whole of `src/lib/bitify.js` with:

```js
// 1-bit conversion. No DOM: everything works on plain typed arrays, so it runs in tests.

const ALPHA_CUT = 128; // alpha below this is an empty pixel
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Largest of the red, green and blue differences between the pixels at byte offsets i and j.
const diff = (d, i, j) => Math.max(Math.abs(d[i] - d[j]), Math.abs(d[i + 1] - d[j + 1]), Math.abs(d[i + 2] - d[j + 2]));

// Otsu's method: the value that best splits a 256-bin histogram into two groups.
// Returns `fallback` when there is nothing to split.
export function otsu(hist, fallback) {
  let n = 0, sum = 0;
  for (let i = 0; i < 256; i++) { n += hist[i]; sum += i * hist[i]; }
  let sumB = 0, wB = 0, best = 0, t = fallback;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const v = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (v > best) { best = v; t = i; }
  }
  return t;
}

// Takes an ImageData-shaped object. Done once per image; `mask` reuses the result.
// `auto` is the Auto threshold for the brightness styles, `autoLine` the one for Lines.
export function analyze({ width: w, height: h, data }) {
  const lum = new Uint8Array(w * h), hist = new Array(256).fill(0), edges = new Array(256).fill(0);
  const solid = p => data[p * 4 + 3] >= ALPHA_CUT;
  let hasAlpha = false;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (!solid(p)) { hasAlpha = true; continue; }
    lum[p] = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    hist[lum[p]]++;
    if ((p % w) + 1 < w && solid(p + 1)) edges[diff(data, i, i + 4)]++;
    if (p + w < w * h && solid(p + w)) edges[diff(data, i, i + w * 4)]++;
  }
  edges[0] = 0; // identical neighbours are not edges
  return { w, h, data, lum, hasAlpha, auto: otsu(hist, 127), autoLine: otsu(edges, 0) };
}

// One byte per pixel: 0 empty, 1 first color (lines, dark pixels), 2 second color (fill, light pixels).
// `threshold` null means Auto.
export function mask(img, style, threshold = null) {
  const { w, h, lum, data } = img, m = new Uint8Array(w * h);
  const t = threshold ?? (style === 'lines' ? img.autoLine : img.auto);
  const solid = p => data[p * 4 + 3] >= ALPHA_CUT;

  if (style === 'lines') {
    // A pixel is a line when it touches empty space, or sits on the darker side of a color
    // change stronger than t. That outlines every part of a sprite, not only its silhouette.
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      m[p] = 2;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx, ny = y + dy, q = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
          // The canvas edge counts as empty only for sprites, so opaque scenes get no frame.
          if (img.hasAlpha) m[p] = 1;
        } else if (!solid(q)) {
          m[p] = 1;
        } else if (diff(data, p * 4, q * 4) > t && (lum[p] < lum[q] || (lum[p] === lum[q] && p < q))) {
          m[p] = 1; // on a tie the earlier pixel takes the line, so a boundary is one pixel wide
        }
      }
    }
    return m;
  }

  if (style === 'atkinson') {
    const v = Float32Array.from(lum, x => x + 128 - t);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      const on = v[p] > 128, e = (v[p] - (on ? 255 : 0)) / 8;
      m[p] = on ? 2 : 1;
      if (x + 1 < w) v[p + 1] += e;
      if (x + 2 < w) v[p + 2] += e;
      if (y + 1 < h) {
        if (x > 0) v[p + w - 1] += e;
        v[p + w] += e;
        if (x + 1 < w) v[p + w + 1] += e;
      }
      if (y + 2 < h) v[p + 2 * w] += e;
    }
    return m;
  }

  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
    if (!solid(p)) continue;
    let cut = t;
    if (style === 'checker') cut += (x + y) % 2 ? 40 : -40;
    else if (style === 'bayer') cut += ((BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 192;
    m[p] = style === 'silhouette' ? 1 : lum[p] > cut ? 2 : 1;
  }
  return m;
}

// Turns a mask into RGBA pixels. Colors are '#rrggbb'.
export function colorize(m, first, second) {
  const c = [null, hexToRgb(first), hexToRgb(second)], out = new Uint8ClampedArray(m.length * 4);
  for (let p = 0, i = 0; p < m.length; p++, i += 4) {
    if (!m[p]) continue;
    const k = c[m[p]];
    out[i] = k[0]; out[i + 1] = k[1]; out[i + 2] = k[2]; out[i + 3] = 255;
  }
  return out;
}
```

What changed from Task 2: the `NEIGHBOURS` constant and the `diff` helper are new; `analyze` also counts color differences between adjacent solid pixels and returns `autoLine`; `mask` picks `img.autoLine` as the Auto threshold for `'lines'` and has a new `'lines'` branch before the `'atkinson'` branch. Everything else is unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `Tests  20 passed (20)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bitify.js src/lib/bitify.test.js
git commit -m "feat: add Lines style that outlines sprite parts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Saving

**Files:**
- Create: `src/lib/save.js`
- Test: `src/lib/save.test.js`
- Modify: `package.json`, `package-lock.json` (adds `fflate`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `outNames(names: string[]): string[]`, the unique output file names for a list of original names, in the same order.
  - `zipBytes(names: string[], files: Uint8Array[]): Uint8Array`, a zip archive with entries stored uncompressed.
  - `saveOne(image): Promise<void>` and `saveAll(images): Promise<void>`, where an image is `{ name: string, pixels: Uint8ClampedArray, w: number, h: number }` (the original file name and the bitified RGBA pixels). Both start a browser download and reject if PNG encoding fails. They use the DOM and are checked in the browser in Tasks 5 and 6, not in unit tests.

- [ ] **Step 1: Install fflate**

Run: `npm install fflate`
Expected: exits 0 and adds `"fflate"` under `dependencies` in `package.json` (0.8.3 at the time of writing).

- [ ] **Step 2: Write the failing tests**

Create `src/lib/save.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { outNames, zipBytes } from './save.js';

describe('outNames', () => {
  it('replaces the extension with -1bit.png', () => {
    expect(outNames(['hero.png', 'my.sprite.v2.gif'])).toEqual(['hero-1bit.png', 'my.sprite.v2-1bit.png']);
  });

  it('copes with names that have no extension, no base, or a path', () => {
    expect(outNames(['sprite', '.png', 'dir/a.png'])).toEqual(['sprite-1bit.png', 'image-1bit.png', 'dir-a-1bit.png']);
  });

  it('numbers duplicates, ignoring case', () => {
    expect(outNames(['a.png', 'a.png', 'A.gif'])).toEqual(['a-1bit.png', 'a-2-1bit.png', 'A-3-1bit.png']);
  });

  it('never returns the same name twice', () => {
    const out = outNames(['a.png', 'a.png', 'a-2.png']);
    expect(new Set(out).size).toBe(3);
  });
});

describe('zipBytes', () => {
  it('makes a zip that unpacks to the same files', () => {
    const zipped = zipBytes(['x-1bit.png', 'y-1bit.png'], [Uint8Array.of(1, 2, 3), Uint8Array.of(4)]);
    const files = unzipSync(zipped);
    expect(Object.keys(files)).toEqual(['x-1bit.png', 'y-1bit.png']);
    expect([...files['x-1bit.png']]).toEqual([1, 2, 3]);
    expect([...files['y-1bit.png']]).toEqual([4]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. `src/lib/save.test.js` cannot be loaded because `./save.js` does not exist. The 20 conversion tests still pass.

- [ ] **Step 4: Write the implementation**

Create `src/lib/save.js`:

```js
import { zipSync } from 'fflate';

// Output file names for a list of original names: extension replaced by "-1bit.png",
// with -2, -3... added so no two outputs collide (case-insensitively, for Windows).
export function outNames(names) {
  const taken = new Set();
  return names.map(name => {
    const base = name.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '-') || 'image';
    let out = `${base}-1bit.png`;
    for (let i = 2; taken.has(out.toLowerCase()); i++) out = `${base}-${i}-1bit.png`;
    taken.add(out.toLowerCase());
    return out;
  });
}

// PNGs are already compressed, so entries are stored as they are.
export function zipBytes(names, files) {
  return zipSync(Object.fromEntries(names.map((name, i) => [name, files[i]])), { level: 0 });
}

function pngBlob({ pixels, w, h }) {
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  canvas.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png'));
}

function download(blob, filename) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// An image here is { name, pixels, w, h }: the original file name and its bitified RGBA pixels.
export async function saveOne(image) {
  download(await pngBlob(image), outNames([image.name])[0]);
}

export async function saveAll(images) {
  const files = [];
  for (const image of images) files.push(new Uint8Array(await (await pngBlob(image)).arrayBuffer()));
  download(new Blob([zipBytes(outNames(images.map(i => i.name)), files)], { type: 'application/zip' }), 'bitify.zip');
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: `Test Files  2 passed (2)` and `Tests  25 passed (25)`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/save.js src/lib/save.test.js
git commit -m "feat: add output naming, zip and download helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The wall

After this task the app is usable with its default settings: images can be added by drop, picker or paste, appear on the wall bitified, can be held to compare, saved one at a time, and removed. The dock arrives in Task 6.

**Files:**
- Create: `src/app.css`, `src/PixelIcon.svelte`, `src/Pixels.svelte`, `src/Tile.svelte`
- Modify: `src/main.js` (import the stylesheet), `src/App.svelte` (whole file replaced)

**Interfaces:**
- Consumes: `analyze`, `mask`, `colorize`, `hexToRgb` from `src/lib/bitify.js`; `saveOne` from `src/lib/save.js`.
- Produces:
  - `<PixelIcon name />`, where `name` is one of `save`, `x`, `swap`, `plus`, `grid`, `sliders`. Renders `<svg class="ico">`.
  - `<Pixels pixels class? />`, where `pixels` is an `ImageData`. Renders one `<canvas>` carrying the optional class.
  - `<Tile item first second style threshold flipped onsave onremove />`. `flipped` true shows the original; holding the tile shows the other version.
  - The item shape used everywhere: `{ id: number, name: string, original: ImageData, img: <result of analyze> }`.
  - CSS classes for later tasks: `.btn` (`.primary`, `.quiet`), `.ib`, `.grow`, and the `--hit` control-size token.

- [ ] **Step 1: Create `src/app.css`**

```css
/* Bitify. One screen: a wall of image tiles, with every control in a floating dock.
   Chrome is neutral so the two chosen colors are the only strong colors on screen.
   No global border-box reset: sizes match the approved prototype, which had none. */
:root {
  --bg: #ecedf1;
  --surface: #ffffff;
  --fg: #1b1c24;
  --muted: #666979;
  --line: #d5d7e0;
  --tile: #e3e5eb;
  --tile2: #d9dbe3;
  --shadow: rgba(27, 28, 36, 0.16);
  --hit: 36px; /* height of dock controls; grows on touch screens */
  --display: "Pixelify Sans", ui-monospace, "Courier New", monospace;
  --body: "Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;
  color-scheme: light;
  box-sizing: border-box;
  height: 100vh;
  height: 100dvh;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17181d;
    --surface: #22242c;
    --fg: #ecedf2;
    --muted: #9a9dae;
    --line: #343744;
    --tile: #1f2128;
    --tile2: #272a33;
    --shadow: rgba(0, 0, 0, 0.5);
    color-scheme: dark;
  }
}
@media (pointer: coarse) {
  :root { --hit: clamp(40px, 12vw, 44px); }
}

body {
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--body);
  font-size: 14px;
  line-height: 1.4;
  -webkit-tap-highlight-color: transparent;
}
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.grow { flex: 1; }

#app { flex: 1; min-height: 0; min-width: 0; position: relative; display: flex; flex-direction: column; }

/* top bar and shared controls */
.bar { display: flex; align-items: center; gap: 8px 12px; padding: 14px 16px; }
.mark { font-family: var(--display); font-size: 28px; font-weight: 600; line-height: 1; }
.count { color: var(--muted); font-size: 13px; white-space: nowrap; }
.ico { fill: currentColor; shape-rendering: crispEdges; flex: none; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--hit); min-width: var(--hit); padding: 0 14px;
  border: 1px solid var(--line); border-radius: 10px; background: transparent;
  font-weight: 600; white-space: nowrap; cursor: pointer;
}
.btn.primary { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.btn.quiet { border-color: transparent; color: var(--muted); }
.btn:disabled { opacity: 0.4; cursor: default; }
.ib {
  display: grid; place-items: center; flex: none; width: 30px; height: 30px; padding: 0;
  border: 1px solid var(--line); border-radius: 8px; background: var(--surface); cursor: pointer;
}

/* the wall */
.grid {
  flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; align-content: start;
  padding: 8px 16px 132px; /* bottom padding clears the dock */
}
.tile { position: relative; margin: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; min-width: 0; }
.art {
  grid-column: 1 / -1; position: relative; aspect-ratio: 1; max-width: 100%;
  border-radius: 10px; overflow: hidden; cursor: pointer;
  touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  background: conic-gradient(var(--tile2) 25%, var(--tile) 0 50%, var(--tile2) 0 75%, var(--tile) 0) 0 0 / 16px 16px;
}
.art canvas { position: absolute; inset: 14%; width: 72%; height: 72%; object-fit: contain; image-rendering: pixelated; }
.cap { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 8px; font-size: 13px; min-width: 0; }
.name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dim { margin-left: auto; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.acts { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.12s; }
.tile:hover .acts, .tile:focus-within .acts { opacity: 1; }
/* touch screens have no hover: the two actions sit beside the name, always visible */
@media (hover: none) {
  .acts { position: static; opacity: 1; grid-column: 2; grid-row: 2; align-self: center; }
  .acts .ib { width: 40px; height: 40px; }
  .cap { grid-column: 1; grid-row: 2; flex-direction: column; align-items: flex-start; gap: 0; align-self: center; }
  .dim { margin-left: 0; }
}

.empty { flex: 1; display: grid; place-content: center; justify-items: center; gap: 14px; padding: 24px 16px 132px; text-align: center; }
.empty h2 { margin: 0; font-family: var(--display); font-weight: 500; font-size: clamp(26px, 5vw, 44px); line-height: 1.1; text-wrap: balance; }
.empty p { margin: 0; color: var(--muted); max-width: 38ch; }

/* overlays */
.drop {
  position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; pointer-events: none;
  font-family: var(--display); font-size: clamp(28px, 7vw, 72px);
}
.drop::before { content: ""; position: absolute; inset: 16px; border: 4px dashed currentColor; }
.toast {
  position: fixed; top: calc(env(safe-area-inset-top, 0px) + 64px); left: 50%; transform: translateX(-50%); z-index: 60;
  width: max-content; max-width: calc(100% - 32px); padding: 8px 14px; border-radius: 10px;
  background: var(--fg); color: var(--bg); font-size: 13px; font-weight: 600;
}

@media (max-width: 520px) {
  .count, .bar .wide { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

- [ ] **Step 2: Import the stylesheet in `src/main.js`**

Replace the whole file with:

```js
import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
```

- [ ] **Step 3: Create `src/PixelIcon.svelte`**

```svelte
<script module>
  // 7x7 one-bit glyphs. '#' is a filled pixel.
  const ICONS = {
    save: ['...#...', '...#...', '.#.#.#.', '..###..', '...#...', '.......', '#######'],
    x: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
    swap: ['....#..', '.....#.', '#######', '.......', '#######', '.#.....', '..#....'],
    plus: ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
    grid: ['###.###', '###.###', '###.###', '.......', '###.###', '###.###', '###.###'],
    sliders: ['..##...', '#######', '..##...', '.......', '....##.', '#######', '....##.'],
  };
</script>

<script>
  let { name } = $props();
  const cells = $derived(ICONS[name].flatMap((row, y) => [...row].flatMap((c, x) => (c === '#' ? [{ x, y }] : []))));
</script>

<svg class="ico" width="14" height="14" viewBox="0 0 7 7" aria-hidden="true">
  {#each cells as { x, y }}<rect {x} {y} width="1" height="1" />{/each}
</svg>
```

- [ ] **Step 4: Create `src/Pixels.svelte`**

```svelte
<script>
  // Draws an ImageData at its own pixel size. CSS scales the canvas up with hard edges.
  let { pixels, class: cls = '' } = $props();
  let canvas;

  $effect(() => {
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext('2d').putImageData(pixels, 0, 0);
  });
</script>

<canvas bind:this={canvas} class={cls}></canvas>
```

- [ ] **Step 5: Create `src/Tile.svelte`**

```svelte
<script>
  import { mask, colorize } from './lib/bitify.js';
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';

  // `flipped` true means the wall is showing originals. Holding the tile shows the other version.
  let { item, first, second, style, threshold, flipped, onsave, onremove } = $props();
  let held = $state(false);

  // The mask depends only on the image, style and threshold, so a color change reuses it.
  const m = $derived(mask(item.img, style, threshold));
  const pixels = $derived(
    flipped !== held ? item.original : new ImageData(colorize(m, first, second), item.img.w, item.img.h),
  );
</script>

<figure class="tile">
  <div
    class="art"
    role="presentation"
    onpointerdown={() => (held = true)}
    onpointerup={() => (held = false)}
    onpointerleave={() => (held = false)}
    onpointercancel={() => (held = false)}
    oncontextmenu={e => e.preventDefault()}
  >
    <Pixels {pixels} />
  </div>
  <div class="acts">
    <button class="ib" onclick={onsave} aria-label="Download {item.name}" title="Download"><PixelIcon name="save" /></button>
    <button class="ib" onclick={onremove} aria-label="Remove {item.name}" title="Remove"><PixelIcon name="x" /></button>
  </div>
  <figcaption class="cap">
    <span class="name" title={item.name}>{item.name}</span>
    <span class="dim">{item.img.w} × {item.img.h}</span>
  </figcaption>
</figure>
```

`role="presentation"` on the art box is deliberate: it carries pointer handlers but is not a control (the keyboard route to comparing is the Space key and the dock switch), and without the role Svelte reports an accessibility warning.

- [ ] **Step 6: Replace `src/App.svelte`**

```svelte
<script>
  import { analyze, mask, colorize, hexToRgb } from './lib/bitify.js';
  import { saveOne } from './lib/save.js';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';

  const touch = matchMedia('(pointer:coarse)').matches;

  let first = $state('#f6dfa4'); // lines and dark pixels
  let second = $state('#0b0a0c'); // fill and light pixels
  let style = $state('lines');
  let threshold = $state(null); // null means Auto
  let showOriginal = $state(false);
  // raw: items hold large typed arrays, and the list is only ever replaced, never mutated
  let items = $state.raw([]);
  let dragDepth = $state(0);
  let message = $state('');
  let picker;
  let nextId = 0, messageTimer;

  // Text color for the drop screen: the first color, unless it is too close to the second to read.
  const brightness = hex => {
    const [r, g, b] = hexToRgb(hex).map(v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const overlayInk = $derived.by(() => {
    const a = brightness(first), b = brightness(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 2.5 ? first : b > 0.4 ? '#000000' : '#ffffff';
  });

  function say(text) {
    message = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => (message = ''), 3200);
  }

  async function decode(file) {
    const bitmap = await createImageBitmap(file);
    const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async function addFiles(files) {
    const added = [];
    let skipped = 0;
    for (const file of files) {
      try {
        const original = await decode(file);
        added.push({ id: ++nextId, name: file.name || 'image.png', original, img: analyze(original) });
      } catch {
        skipped++;
      }
    }
    if (added.length) items = [...items, ...added];
    if (skipped) say(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Bitify reads PNG, GIF, WebP, JPEG and BMP images.`);
  }

  const bitified = item => ({
    name: item.name,
    pixels: colorize(mask(item.img, style, threshold), first, second),
    w: item.img.w,
    h: item.img.h,
  });

  async function save(item) {
    try {
      await saveOne(bitified(item));
    } catch {
      say(`${item.name} could not be saved.`);
    }
  }

  function picked(e) {
    addFiles([...e.currentTarget.files]);
    e.currentTarget.value = ''; // so picking the same file again still fires a change
  }

  const hasFiles = e => e.dataTransfer?.types.includes('Files');
  function dragenter(e) {
    if (hasFiles(e)) { e.preventDefault(); dragDepth++; }
  }
  function dragover(e) {
    if (hasFiles(e)) e.preventDefault();
  }
  function dragleave(e) {
    if (hasFiles(e)) dragDepth = Math.max(0, dragDepth - 1);
  }
  function drop(e) {
    e.preventDefault();
    dragDepth = 0;
    if (e.dataTransfer?.files.length) addFiles([...e.dataTransfer.files]);
  }
  function paste(e) {
    if (e.clipboardData?.files.length) addFiles([...e.clipboardData.files]);
  }
</script>

<svelte:window
  ondragenter={dragenter}
  ondragover={dragover}
  ondragleave={dragleave}
  ondrop={drop}
  onpaste={paste}
  onblur={() => (dragDepth = 0)}
/>

<header class="bar">
  <span class="mark">Bitify</span>
  <span class="count">{items.length} image{items.length === 1 ? '' : 's'}</span>
  <span class="grow"></span>
  {#if items.length}
    <button class="btn quiet" onclick={() => (items = [])}>Remove all</button>
  {/if}
  <button class="btn" onclick={() => picker.click()}><PixelIcon name="plus" />Add<span class="wide">images</span></button>
</header>

{#if items.length}
  <div class="grid">
    {#each items as item (item.id)}
      <Tile
        {item}
        {first}
        {second}
        {style}
        {threshold}
        flipped={showOriginal}
        onsave={() => save(item)}
        onremove={() => (items = items.filter(i => i !== item))}
      />
    {/each}
  </div>
{:else}
  <div class="empty">
    <h2>{touch ? 'Add pixel art' : 'Drop pixel art anywhere'}</h2>
    <p>Each image is redrawn in your two colors. Add as many as you like.</p>
    <button class="btn primary" onclick={() => picker.click()}>Choose images</button>
  </div>
{/if}

{#if dragDepth > 0}
  <div class="drop" style:background={second} style:color={overlayInk}>Drop to bitify</div>
{/if}
<div class="toast" role="status" hidden={!message}>{message}</div>
<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={picked} />
```

Notes for the implementer:
- `items` is `$state.raw`, so always assign a new array (`items = [...items, x]`); `items.push(x)` would not update the page.
- Ids come from a counter, not `crypto.randomUUID()`, because that function is unavailable when the dev server is opened from a phone over plain `http://` on the local network.
- `showOriginal` is not changeable yet; Task 6 binds it to the dock.

- [ ] **Step 7: Build, test, and check in the browser**

Run: `npm run build`
Expected: `✓ built in …` with no warnings other than the expected `no Svelte config found` line.

Run: `npm test`
Expected: `Tests  25 passed (25)`.

Start the app (see "Running the app for browser checks"), reload the page, and run this script in it:

```js
const wait = ms => new Promise(r => setTimeout(r, ms));
// Image encoding can be slow while the browser pane is in the background, so poll instead of guessing.
const until = async ready => { for (let i = 0; i < 100 && !ready(); i++) await wait(100); };
// A 16x16 test sprite: dark 10x10 block, red 8x8 inside it, white 3x3 inside that.
const sprite = () => new Promise(r => {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = '#2b1b2e'; x.fillRect(3, 3, 10, 10);
  x.fillStyle = '#d8343f'; x.fillRect(4, 4, 8, 8);
  x.fillStyle = '#fff6e5'; x.fillRect(6, 6, 3, 3);
  c.toBlob(r, 'image/png');
});
// Drop two copies of it and one file that is not an image.
const dt = new DataTransfer();
dt.items.add(new File([await sprite()], 'block.png', { type: 'image/png' }));
dt.items.add(new File([await sprite()], 'block.png', { type: 'image/png' }));
dt.items.add(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
await wait(500);

// Record saves instead of downloading them.
const saved = [], realClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function () { if (this.download) saved.push({ name: this.download, href: this.href }); else realClick.call(this); };
const head = async href => [...new Uint8Array(await (await fetch(href)).arrayBuffer()).slice(0, 4)].join(',');
const px = (x, y) => [...document.querySelector('.art canvas').getContext('2d').getImageData(x, y, 1, 1).data].join(',');

const out = { tiles: document.querySelectorAll('.tile').length, message: document.querySelector('.toast').textContent };
out.outline = px(3, 3);
out.fill = px(5, 5);
out.innerLine = px(5, 6);
out.empty = px(0, 0);
const art = document.querySelector('.art');
art.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' })); await wait(100);
out.whileHeld = px(3, 3);
art.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' })); await wait(100);
out.afterRelease = px(3, 3);
document.querySelector('.tile .ib[title="Download"]').click(); await until(() => saved.length);
out.savedName = saved[0]?.name;
out.savedHead = saved[0] && (await head(saved[0].href));
document.querySelector('.tile .ib[title="Remove"]').click(); await wait(100);
out.tilesAfterRemove = document.querySelectorAll('.tile').length;
[...document.querySelectorAll('.bar .btn')].find(b => b.textContent.trim() === 'Remove all').click(); await wait(100);
out.emptyHeading = document.querySelector('.empty h2')?.textContent;
out.pageFits = document.documentElement.scrollWidth === innerWidth;
HTMLAnchorElement.prototype.click = realClick;
out
```

Expected result, exactly:

```json
{
  "tiles": 2,
  "message": "1 file skipped. Bitify reads PNG, GIF, WebP, JPEG and BMP images.",
  "outline": "246,223,164,255",
  "fill": "11,10,12,255",
  "innerLine": "246,223,164,255",
  "empty": "0,0,0,0",
  "whileHeld": "43,27,46,255",
  "afterRelease": "246,223,164,255",
  "savedName": "block-1bit.png",
  "savedHead": "137,80,78,71",
  "tilesAfterRemove": 1,
  "emptyHeading": "Drop pixel art anywhere",
  "pageFits": true
}
```

What each value proves: two images loaded and the text file was skipped with a message; the sprite's outline and the ring around its inner part are the first color while its body is the second (Lines works); empty pixels stay transparent; holding shows the original; the saved file is named correctly and is a PNG; removing one and removing all work; the page does not scroll sideways. Key order in the output may differ.

Then check by eye, comparing against the prototype: the "Bitify" wordmark in a pixel font top-left, "Add images" top-right, tiles on a faint checkerboard with hard pixel edges, and Download and Remove buttons appearing in a tile's top-right corner on hover. The browser console must show no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app.css src/main.js src/PixelIcon.svelte src/Pixels.svelte src/Tile.svelte src/App.svelte
git commit -m "feat: add the image wall with drop, paste, compare, save and remove" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The dock

**Files:**
- Create: `src/Dock.svelte`
- Modify: `src/app.css` (rules appended), `src/App.svelte` (whole file replaced)

**Interfaces:**
- Consumes: `analyze`, `mask`, `colorize` from `src/lib/bitify.js`; `saveAll` from `src/lib/save.js`; `<Pixels>`, `<PixelIcon>`; the `.btn`, `.ib` classes and `--hit` token from Task 5.
- Produces: `<Dock bind:first bind:second bind:style bind:threshold bind:showOriginal count onsaveall />`. The five bound props are two-way; `count` is the number of images (Download all is disabled at zero); `onsaveall` is called when Download all is pressed.

- [ ] **Step 1: Append the dock rules to `src/app.css`**

Add to the end of the file:

```css
/* the dock */
.dock {
  position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%);
  width: max-content; max-width: calc(100% - 32px);
  display: flex; align-items: center; justify-content: center; gap: 10px 12px; padding: 10px 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 10px 32px var(--shadow);
}
.sep { width: 1px; height: 24px; background: var(--line); }
.btn[aria-expanded="true"], .btn.sm[aria-pressed="true"] { background: var(--tile); border-color: var(--fg); }
.btn.sm { font-size: 13px; padding: 0 12px; }
.pair { display: flex; align-items: center; gap: 4px; }
.pair .ib { width: var(--hit); height: var(--hit); border-color: transparent; background: transparent; }
.sw {
  position: relative; display: block; flex: none; width: var(--hit); height: var(--hit);
  border: 1px solid var(--line); border-radius: 9px; box-shadow: inset 0 0 0 2px var(--surface);
}
.sw input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; opacity: 0; cursor: pointer; }
.sw:focus-within { outline: 2px solid var(--fg); outline-offset: 2px; }
.seg { display: inline-flex; height: var(--hit); padding: 3px; background: var(--tile); border-radius: 10px; }
.seg button { padding: 0 12px; border: 0; border-radius: 8px; background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; }
.seg button[aria-pressed="true"] { background: var(--surface); color: var(--fg); box-shadow: 0 1px 2px var(--shadow); }

/* panels that open above the dock */
.panel {
  position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%);
  width: min(340px, calc(100vw - 32px)); max-height: calc(100vh - 230px); overflow-y: auto;
  display: flex; flex-direction: column; gap: 12px; padding: 14px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 10px 32px var(--shadow);
}
.ptitle { margin: 0; font-size: 13px; font-weight: 600; }
.presets { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.styles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.preset {
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 2px;
  border: 1px solid transparent; border-radius: 10px; background: transparent;
  color: var(--muted); font-size: 12px; cursor: pointer;
}
.preset[aria-pressed="true"] { border-color: var(--fg); color: var(--fg); }
.chip { width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 9px; }
.demo {
  width: 42px; height: 42px; border-radius: 6px; image-rendering: pixelated;
  background: conic-gradient(var(--tile2) 25%, var(--tile) 0 50%, var(--tile2) 0 75%, var(--tile) 0) 0 0 / 12px 12px;
}
.trow { display: flex; align-items: center; gap: 10px; }
#threshold { flex: 1; min-width: 0; height: var(--hit); margin: 0; accent-color: var(--fg); }
.hint { margin: 0; font-size: 12px; color: var(--muted); }

/* narrower screens: icon-only dock buttons */
@media (max-width: 800px) {
  .dock .lbl, .sep { display: none; }
  .dock .btn { padding: 0; }
}
/* phones: the dock spans the screen and the view switch gets its own row */
@media (max-width: 520px) {
  .grid, .empty { padding-bottom: 172px; }
  .dock { left: 12px; right: 12px; bottom: 12px; transform: none; width: auto; max-width: none; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 10px; }
  .seg { order: 5; flex: 1 0 100%; box-sizing: border-box; }
  .seg button { flex: 1; }
  .panel { left: 0; right: 0; width: auto; transform: none; }
}
```

- [ ] **Step 2: Create `src/Dock.svelte`**

```svelte
<script module>
  import { analyze, mask, colorize } from './lib/bitify.js';

  const PRESETS = [
    { name: 'Torch', first: '#f6dfa4', second: '#0b0a0c' },
    { name: 'Citron', first: '#262262', second: '#e6f0b4' },
    { name: 'Moss', first: '#1e3a2b', second: '#d7e8a0' },
    { name: 'Plum', first: '#3b1f3f', second: '#f6c7b6' },
    { name: 'Ember', first: '#2a1414', second: '#ff9f45' },
    { name: 'Tide', first: '#0e3b5c', second: '#bfe9e0' },
    { name: 'Rose', first: '#4a0d2b', second: '#ffd1dc' },
    { name: 'Mono', first: '#000000', second: '#ffffff' },
  ];
  const STYLES = [
    ['lines', 'Lines'],
    ['solid', 'Solid'],
    ['checker', 'Checker'],
    ['bayer', 'Bayer'],
    ['atkinson', 'Atkinson'],
    ['silhouette', 'Silhouette'],
  ];

  // A small shaded ball with a stripe, used to preview each style.
  function ball() {
    const s = 14, data = new Uint8ClampedArray(s * s * 4);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const r = Math.hypot(x - 6.5, y - 6.5);
      if (r > 7) continue;
      const shade = Math.hypot(x - 4, y - 3) * 9;
      const l = Math.round(r > 6 ? 25 : y >= 7 && y <= 9 ? 95 - shade * 0.4 : 240 - shade);
      data.set([l, l, l, 255], (y * s + x) * 4);
    }
    return analyze({ width: s, height: s, data });
  }
  const BALL = ball();
</script>

<script>
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';

  let {
    first = $bindable(),
    second = $bindable(),
    style = $bindable(),
    threshold = $bindable(), // null means Auto
    showOriginal = $bindable(),
    count,
    onsaveall,
  } = $props();

  const touch = matchMedia('(pointer:coarse)').matches;
  let panel = $state(null); // null, 'palettes' or 'advanced'
  let dock;

  const hint = $derived(
    style === 'silhouette' ? 'Silhouette ignores the threshold.'
    : threshold === null ? 'Auto picks the best value for each image.'
    : style === 'lines' ? `Color changes stronger than ${threshold} become lines.`
    : `Pixels brighter than ${threshold} turn light.`,
  );

  const toggle = name => (panel = panel === name ? null : name);
  function swap() {
    const was = first;
    first = second;
    second = was;
  }
</script>

<svelte:window
  onclick={e => { if (panel && !dock.contains(e.target)) panel = null; }}
  onkeydown={e => { if (e.key === 'Escape') panel = null; }}
/>

<div class="dock" bind:this={dock}>
  {#if panel === 'palettes'}
    <div class="panel">
      <p class="ptitle">Palettes</p>
      <div class="presets">
        {#each PRESETS as p}
          <button
            class="preset"
            aria-pressed={first === p.first && second === p.second}
            onclick={() => { first = p.first; second = p.second; }}
          >
            <span class="chip" style:background="linear-gradient(135deg, {p.first} 50%, {p.second} 50%)"></span>{p.name}
          </button>
        {/each}
      </div>
    </div>
  {:else if panel === 'advanced'}
    <div class="panel">
      <p class="ptitle">Style</p>
      <div class="presets styles">
        {#each STYLES as [key, name]}
          <button class="preset" aria-pressed={style === key} onclick={() => (style = key)}>
            <Pixels class="demo" pixels={new ImageData(colorize(mask(BALL, key), first, second), BALL.w, BALL.h)} />{name}
          </button>
        {/each}
      </div>
      <label class="ptitle" for="threshold">Threshold</label>
      <div class="trow">
        <input
          id="threshold"
          type="range"
          min="1"
          max="254"
          value={threshold ?? 128}
          oninput={e => (threshold = +e.currentTarget.value)}
        />
        <button class="btn sm" aria-pressed={threshold === null} onclick={() => (threshold = null)}>Auto</button>
      </div>
      <p class="hint">{hint}</p>
      <p class="hint">
        {touch ? 'Hold an image to see its other version.' : 'Hold an image, or hold Space, to see the other version.'}
      </p>
    </div>
  {/if}

  <div class="pair">
    <label class="sw" style:background={first} title="Color for lines and dark pixels">
      <input type="color" bind:value={first} aria-label="Color for lines and dark pixels" />
    </label>
    <button class="ib" onclick={swap} aria-label="Swap colors" title="Swap colors"><PixelIcon name="swap" /></button>
    <label class="sw" style:background={second} title="Color for fill and light pixels">
      <input type="color" bind:value={second} aria-label="Color for fill and light pixels" />
    </label>
  </div>
  <button class="btn" aria-expanded={panel === 'palettes'} aria-label="Palettes" title="Palettes" onclick={() => toggle('palettes')}>
    <PixelIcon name="grid" /><span class="lbl">Palettes</span>
  </button>
  <span class="sep"></span>
  <div class="seg" role="group" aria-label="View">
    <button aria-pressed={showOriginal} onclick={() => (showOriginal = true)}>Original</button>
    <button aria-pressed={!showOriginal} onclick={() => (showOriginal = false)}>Bitified</button>
  </div>
  <span class="sep"></span>
  <button class="btn" aria-expanded={panel === 'advanced'} aria-label="Advanced" title="Advanced" onclick={() => toggle('advanced')}>
    <PixelIcon name="sliders" /><span class="lbl">Advanced</span>
  </button>
  <button class="btn primary" disabled={!count} aria-label="Download all" title="Download all" onclick={onsaveall}>
    <PixelIcon name="save" /><span class="lbl">Download all</span>
  </button>
</div>
```

Notes for the implementer:
- A panel closes on a click outside the dock, not outside the panel, so the swatches, Swap and the view switch can be used while a panel is open.
- The style previews are `<Pixels class="demo">`; the `.demo` rule in the stylesheet sizes them.
- `aria-pressed={false}` renders as `aria-pressed="false"` in Svelte 5, which the stylesheet's `[aria-pressed="true"]` selectors rely on.

- [ ] **Step 3: Replace `src/App.svelte`**

```svelte
<script>
  import { analyze, mask, colorize, hexToRgb } from './lib/bitify.js';
  import { saveOne, saveAll } from './lib/save.js';
  import Dock from './Dock.svelte';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';

  const touch = matchMedia('(pointer:coarse)').matches;

  let first = $state('#f6dfa4'); // lines and dark pixels
  let second = $state('#0b0a0c'); // fill and light pixels
  let style = $state('lines');
  let threshold = $state(null); // null means Auto
  let showOriginal = $state(false);
  let spaceHeld = $state(false);
  // raw: items hold large typed arrays, and the list is only ever replaced, never mutated
  let items = $state.raw([]);
  let dragDepth = $state(0);
  let message = $state('');
  let picker;
  let nextId = 0, messageTimer;

  // Text color for the drop screen: the first color, unless it is too close to the second to read.
  const brightness = hex => {
    const [r, g, b] = hexToRgb(hex).map(v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const overlayInk = $derived.by(() => {
    const a = brightness(first), b = brightness(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 2.5 ? first : b > 0.4 ? '#000000' : '#ffffff';
  });

  function say(text) {
    message = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => (message = ''), 3200);
  }

  async function decode(file) {
    const bitmap = await createImageBitmap(file);
    const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async function addFiles(files) {
    const added = [];
    let skipped = 0;
    for (const file of files) {
      try {
        const original = await decode(file);
        added.push({ id: ++nextId, name: file.name || 'image.png', original, img: analyze(original) });
      } catch {
        skipped++;
      }
    }
    if (added.length) items = [...items, ...added];
    if (skipped) say(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Bitify reads PNG, GIF, WebP, JPEG and BMP images.`);
  }

  const bitified = item => ({
    name: item.name,
    pixels: colorize(mask(item.img, style, threshold), first, second),
    w: item.img.w,
    h: item.img.h,
  });

  async function save(item) {
    try {
      await saveOne(bitified(item));
    } catch {
      say(`${item.name} could not be saved.`);
    }
  }

  async function saveEverything() {
    try {
      await saveAll(items.map(bitified));
    } catch {
      say('The images could not be saved.');
    }
  }

  function picked(e) {
    addFiles([...e.currentTarget.files]);
    e.currentTarget.value = ''; // so picking the same file again still fires a change
  }

  const hasFiles = e => e.dataTransfer?.types.includes('Files');
  function dragenter(e) {
    if (hasFiles(e)) { e.preventDefault(); dragDepth++; }
  }
  function dragover(e) {
    if (hasFiles(e)) e.preventDefault();
  }
  function dragleave(e) {
    if (hasFiles(e)) dragDepth = Math.max(0, dragDepth - 1);
  }
  function drop(e) {
    e.preventDefault();
    dragDepth = 0;
    if (e.dataTransfer?.files.length) addFiles([...e.dataTransfer.files]);
  }
  function paste(e) {
    if (e.clipboardData?.files.length) addFiles([...e.clipboardData.files]);
  }

  // Holding Space flips the whole wall, except while a control has focus (Space presses it).
  const onControl = e => /^(INPUT|BUTTON|TEXTAREA|SELECT)$/.test(e.target.tagName);
  function keydown(e) {
    if (e.code === 'Space' && !onControl(e)) { e.preventDefault(); spaceHeld = true; }
  }
  function keyup(e) {
    if (e.code === 'Space') spaceHeld = false;
  }
</script>

<svelte:window
  ondragenter={dragenter}
  ondragover={dragover}
  ondragleave={dragleave}
  ondrop={drop}
  onpaste={paste}
  onkeydown={keydown}
  onkeyup={keyup}
  onblur={() => { dragDepth = 0; spaceHeld = false; }}
/>

<header class="bar">
  <span class="mark">Bitify</span>
  <span class="count">{items.length} image{items.length === 1 ? '' : 's'}</span>
  <span class="grow"></span>
  {#if items.length}
    <button class="btn quiet" onclick={() => (items = [])}>Remove all</button>
  {/if}
  <button class="btn" onclick={() => picker.click()}><PixelIcon name="plus" />Add<span class="wide">images</span></button>
</header>

{#if items.length}
  <div class="grid">
    {#each items as item (item.id)}
      <Tile
        {item}
        {first}
        {second}
        {style}
        {threshold}
        flipped={showOriginal !== spaceHeld}
        onsave={() => save(item)}
        onremove={() => (items = items.filter(i => i !== item))}
      />
    {/each}
  </div>
{:else}
  <div class="empty">
    <h2>{touch ? 'Add pixel art' : 'Drop pixel art anywhere'}</h2>
    <p>Each image is redrawn in your two colors. Add as many as you like.</p>
    <button class="btn primary" onclick={() => picker.click()}>Choose images</button>
  </div>
{/if}

<Dock bind:first bind:second bind:style bind:threshold bind:showOriginal count={items.length} onsaveall={saveEverything} />

{#if dragDepth > 0}
  <div class="drop" style:background={second} style:color={overlayInk}>Drop to bitify</div>
{/if}
<div class="toast" role="status" hidden={!message}>{message}</div>
<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={picked} />
```

What changed from Task 5: imports `saveAll` and `Dock`; adds `spaceHeld`, `saveEverything`, `onControl`, `keydown` and `keyup`; the window listens for `keydown` and `keyup` and clears `spaceHeld` on blur; tiles receive `flipped={showOriginal !== spaceHeld}`; `<Dock … />` is rendered after the wall.

- [ ] **Step 4: Build, test, and check in the browser at desktop width**

Run: `npm run build`
Expected: `✓ built in …` with no warnings other than the expected `no Svelte config found` line.

Run: `npm test`
Expected: `Tests  25 passed (25)`.

Start the app, make the browser at least 900px wide, reload, and run this script in the page:

```js
const wait = ms => new Promise(r => setTimeout(r, ms));
// Image encoding can be slow while the browser pane is in the background, so poll instead of guessing.
const until = async ready => { for (let i = 0; i < 100 && !ready(); i++) await wait(100); };
// A 16x16 test sprite: dark 10x10 block, red 8x8 inside it, white 3x3 inside that.
const sprite = () => new Promise(r => {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = '#2b1b2e'; x.fillRect(3, 3, 10, 10);
  x.fillStyle = '#d8343f'; x.fillRect(4, 4, 8, 8);
  x.fillStyle = '#fff6e5'; x.fillRect(6, 6, 3, 3);
  c.toBlob(r, 'image/png');
});
const dt = new DataTransfer();
dt.items.add(new File([await sprite()], 'block.png', { type: 'image/png' }));
dt.items.add(new File([await sprite()], 'block.png', { type: 'image/png' }));
window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
await wait(500);

const saved = [], realClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function () { if (this.download) saved.push({ name: this.download, href: this.href }); else realClick.call(this); };
const head = async href => [...new Uint8Array(await (await fetch(href)).arrayBuffer()).slice(0, 4)].join(',');
const px = (x, y) => [...document.querySelector('.art canvas').getContext('2d').getImageData(x, y, 1, 1).data].join(',');
const press = async el => { el.click(); await wait(100); };
const dockButton = label => document.querySelector(`.dock [aria-label="${label}"]`);
const choice = name => [...document.querySelectorAll('.preset')].find(b => b.textContent.trim() === name);
const out = {};

out.torchOutline = px(3, 3);
await press(dockButton('Swap colors'));
out.afterSwap = px(3, 3);
await press(dockButton('Swap colors'));

await press(dockButton('Palettes'));
out.presets = document.querySelectorAll('.preset').length;
await press(choice('Mono'));
out.monoOutline = px(3, 3);
out.monoMarked = choice('Mono').getAttribute('aria-pressed');
out.swatchStaysOpen = !!document.querySelector('.panel');

await press(dockButton('Advanced'));
out.styles = document.querySelectorAll('.styles .preset').length;
out.previews = document.querySelectorAll('canvas.demo').length;
out.autoInnerLine = px(5, 6);
const slider = document.querySelector('#threshold');
slider.value = 200; slider.dispatchEvent(new Event('input', { bubbles: true })); await wait(100);
out.manualInnerLine = px(5, 6);
out.manualHint = document.querySelector('.hint').textContent;
await press([...document.querySelectorAll('.panel .btn')].find(b => b.textContent.trim() === 'Auto'));
out.autoAgain = px(5, 6);
out.linesFill = px(5, 5);
await press(choice('Silhouette'));
out.silhouetteFill = px(5, 5);
out.silhouetteHint = document.querySelector('.hint').textContent;
await press(choice('Lines'));

window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(100);
out.panelAfterEscape = !!document.querySelector('.panel');
await press(dockButton('Palettes'));
document.querySelector('.mark').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait(100);
out.panelAfterOutsideClick = !!document.querySelector('.panel');

await press(document.querySelectorAll('.seg button')[0]);
out.original = px(3, 3);
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })); await wait(100);
out.spaceHeld = px(3, 3);
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true })); await wait(100);
out.spaceReleased = px(3, 3);
await press(document.querySelectorAll('.seg button')[1]);

await press(dockButton('Download all')); await until(() => saved.length);
out.zipName = saved[0]?.name;
out.zipHead = saved[0] && (await head(saved[0].href));

const box = s => document.querySelector(s).getBoundingClientRect();
out.pageFits = document.documentElement.scrollWidth === innerWidth;
out.dockInside = box('.dock').left >= 0 && box('.dock').right <= innerWidth;
out.switchOnOwnRow = box('.seg').top >= box('.sw').bottom;
HTMLAnchorElement.prototype.click = realClick;
out
```

Expected result at desktop width, exactly (key order may differ):

```json
{
  "torchOutline": "246,223,164,255",
  "afterSwap": "11,10,12,255",
  "presets": 8,
  "monoOutline": "0,0,0,255",
  "monoMarked": "true",
  "swatchStaysOpen": true,
  "styles": 6,
  "previews": 6,
  "autoInnerLine": "0,0,0,255",
  "manualInnerLine": "255,255,255,255",
  "manualHint": "Color changes stronger than 200 become lines.",
  "autoAgain": "0,0,0,255",
  "linesFill": "255,255,255,255",
  "silhouetteFill": "0,0,0,255",
  "silhouetteHint": "Silhouette ignores the threshold.",
  "panelAfterEscape": false,
  "panelAfterOutsideClick": false,
  "original": "43,27,46,255",
  "spaceHeld": "0,0,0,255",
  "spaceReleased": "43,27,46,255",
  "zipName": "bitify.zip",
  "zipHead": "80,75,3,4",
  "pageFits": true,
  "dockInside": true,
  "switchOnOwnRow": false
}
```

What each group proves: Swap exchanges the colors; a palette sets both colors and is marked as chosen; the panel stays open while a preset is picked; the Advanced panel has six styles each with a preview; a manual threshold of 200 removes the inner line and Auto restores it; Silhouette fills the body; Escape and a click outside the dock close the panel; the Original switch shows originals and holding Space flips back; Download all produces a zip.

- [ ] **Step 5: Check at phone width**

Set the viewport to 375×812 with touch emulation (in Claude Code: `resize_window` with preset `mobile`), reload, and run the same script.

Expected: the same values, except `"switchOnOwnRow": true`. `pageFits` and `dockInside` must still be `true`.

Then check by eye against the prototype at this width: the dock spans the screen with icon-only buttons on its first row and the Original / Bitified switch filling the second; opening Palettes shows a full-width sheet above the dock; Download and Remove sit beside each file name; the empty state (after Remove all) reads "Add pixel art". Reset the viewport to desktop afterwards. The browser console must show no errors.

- [ ] **Step 6: Commit**

```bash
git add src/Dock.svelte src/app.css src/App.svelte
git commit -m "feat: add the dock with colors, palettes, styles and download all" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the last task

Run `npm test` and `npm run build` once more on the finished branch, then use superpowers:finishing-a-development-branch to decide how the branch is integrated. Do not push without being asked.

## Changes after the final review

The whole-branch review led to four fixes, each in its own commit after Task 6. The code blocks above show the files as they were at the end of each task; the repository is the source of truth for their current contents.

- **Exact PNG export** (`src/lib/save.js`, `src/lib/save.test.js`): files are encoded by `pngBytes` straight from the pixels (fflate `zlibSync` plus a CRC32) instead of through a canvas, because Brave, Safari private browsing and Firefox's strict mode add noise to canvas readback. Adds one unit test (26 in total).
- **Space after a click** (`src/App.svelte`): a mouse or touch click no longer leaves focus on the button, and the threshold slider no longer swallows Space, so holding Space compares instead of pressing the last button again.
- **Touch hold delay** (`src/Tile.svelte`): a touch press counts as a hold only after 150 ms, so scrolling the wall does not flash tiles. Mouse presses are still instant.
- **Panel dismissal** (`src/Dock.svelte`): panels close on `pointerdown` outside the dock instead of `click`, which iOS does not always deliver for taps on plain page areas.

The two browser check scripts above were updated to match (a mouse pointer type for the hold check, a pointer press for the outside-dismiss check) and still return the listed results.
