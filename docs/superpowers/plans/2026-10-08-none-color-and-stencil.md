# None Color and Stencil Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let either of the two colors be None (transparent) and add a tenth style, Stencil, so Bitify can make one-color icons with transparent cut lines.

**Architecture:** A None color is one extra piece of state, `none` (0, 1 or 2). The two colors stay hex strings; where they are drawn they pass through `inks()`, which turns a None color into `null`, and `colorize`, `pngBytes` and `encodeGif` each learn to take `null`. Stencil is one more branch of `mask` that writes 2 for the body and 1 for cuts, plus a helper that finds each sprite's outline level once per analysed image. No style looks at the colors.

**Tech Stack:** Svelte 5 with runes, plain JavaScript, Vitest, Vite. No new dependencies.

**Built, with changes.** Stencil was built differently from the steps below in three ways, found while building and in review: Cuts has an Auto and is Auto by default, a sprite that would lose half its inside or more is left whole, and Cuts goes to 254. The design spec says what was built, under "What changed while building".

**Spec:** `docs/superpowers/specs/2026-10-08-none-color-and-stencil-design.md`. Read it first. The mockup is `docs/superpowers/mockups/2026-10-08-none-color.html`.

## Global Constraints

- Read `CLAUDE.md` and, before touching `src/lib/bitify.js`, `docs/performance.md`.
- Plain JavaScript, Svelte 5 runes. No TypeScript, no new dependencies.
- All CSS goes in `src/app.css`. Components have no style blocks. There is no border-box reset.
- The loops in `src/lib/bitify.js` make nothing per pixel: no array, no object, no function.
- `docs/superpowers/specs/2026-10-06-bitify-app-design.md` (the main spec) is updated in the same commit as the code it describes.
- Match the surrounding code: its comment density, its plain wording, its long single-line statements.
- One commit per task. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not work on `main`. Use a branch or worktree. `main` may hold the owner's own staged changes to `index.html` and the main spec; never commit those.
- Interface behavior has no automated tests. Check it in a browser at desktop width and at phone width with touch emulation. After a checkout or merge, restart the dev server before trusting the preview.
- Exact words: tooltips "No color for lines and dark pixels" and "No color for fill and light pixels"; help step "Pick two colors, or a preset. One of them can be None, for a see-through image."; setting labels "Cuts", "Outline" (Keep, Trim), "Edges".
- Style order: Cutout, Solid, Stencil, Lines, Checker, Hatch, Bayer, Noise, Atkinson, Silhouette.
- Stencil defaults: Cuts 20, Outline Keep, Edges Off (0).

## Review Focus

1. A stored `none` that is not 0, 1 or 2 (a string, 3, null) must read as 0, not break the app. Test in Task 1.
2. Saving a GIF with a None color must not change the masks it was given; the wall reuses them. Test in Task 2.
3. A sprite that is all outline (one or two pixels wide) must convert without error: all second color with Keep, all first color with Trim. Test in Task 4.
4. A large image that is one sprite must not overflow or stall when its outline level is found. Test in Task 4.
5. Settings stored before Stencil existed must give Stencil its defaults. Test in Task 4.

## File Structure

| File | Responsibility in this plan |
|---|---|
| `src/lib/presets.js` | `inks()`; Stencil in `STYLES` |
| `src/lib/settings.js` | `none` in `DEFAULTS` and `restore`; `cuts`, `outline`, `edges`; Stencil's list |
| `src/lib/bitify.js` | `colorize` takes `null`; `outlineLevels`; the Stencil branch of `mask` |
| `src/lib/save.js`, `src/lib/gif.js` | `pngBytes` and `encodeGif` take `null` |
| `src/App.svelte` | `none` state, stored and reset; drawn colors to tiles and saving; help text |
| `src/Dock.svelte`, `src/app.css` | None chips, None swatch, Swap; Cuts on the strip |
| `bench/bench.mjs` | Stencil timed with the other styles |
| Docs | main spec, `docs/styles.md`, `docs/palettes.md`, `docs/performance.md`, `CLAUDE.md`, `README.md` |

---

### Task 1: `inks` and the remembered `none`

**Files:**
- Modify: `src/lib/presets.js` (after `inOrder`)
- Modify: `src/lib/settings.js:56-83`
- Test: `src/lib/presets.test.js`, `src/lib/settings.test.js`

**Interfaces:**
- Produces: `inks(first, second, none, style)` returns `[first or null, second or null]`. `none` is 0 (neither), 1 (the first color) or 2 (the second). `restore()` returns `none` beside `first` and `second`; `DEFAULTS.none` is 0.

- [ ] **Step 1: Commit the spec, plan and mockup**

```bash
git add docs/superpowers/specs/2026-10-08-none-color-and-stencil-design.md docs/superpowers/plans/2026-10-08-none-color-and-stencil.md docs/superpowers/mockups/2026-10-08-none-color.html docs/superpowers/mockups/none-color-compare.png docs/superpowers/mockups/none-color-stencil.png docs/superpowers/mockups/none-color-stencil-two.png docs/superpowers/mockups/tile-1-off.png docs/superpowers/mockups/tile-1-first.png docs/superpowers/mockups/tile-1-second.png docs/superpowers/mockups/tile-2-off.png docs/superpowers/mockups/tile-2-first.png docs/superpowers/mockups/tile-2-second.png docs/superpowers/mockups/tile-4-off.png docs/superpowers/mockups/tile-4-first.png docs/superpowers/mockups/tile-4-second.png
git commit -m "docs: spec, plan and mockup for a None color and a Stencil style

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Write the failing tests**

In `src/lib/presets.test.js`, add `inks` to the import from `./presets.js` and add at the end of the file:

```js
describe('inks', () => {
  it('gives the two colors as they are while neither is None', () => {
    expect(inks('#111111', '#eeeeee', 0, 'cutout')).toEqual(['#111111', '#eeeeee']);
  });

  it('gives null for the color that is None', () => {
    expect(inks('#111111', '#eeeeee', 1, 'cutout')).toEqual([null, '#eeeeee']);
    expect(inks('#111111', '#eeeeee', 2, 'cutout')).toEqual(['#111111', null]);
  });

  it('draws Silhouette, which has only first-color pixels, in the second color when the first is None', () => {
    expect(inks('#111111', '#eeeeee', 1, 'silhouette')).toEqual(['#eeeeee', '#eeeeee']);
    expect(inks('#111111', '#eeeeee', 2, 'silhouette')).toEqual(['#111111', null]);
  });
});
```

In `src/lib/settings.test.js`, in `'gives back what was stored'`, change the `saved` line to:

```js
    const saved = { first: '#f0f6f0', second: '#222323', none: 2, style: 'lines', settings };
```

and add inside `describe('restore', ...)`:

```js
  it('keeps which color is None only when it is 0, 1 or 2', () => {
    for (const none of [0, 1, 2]) expect(restore(JSON.stringify({ none }), styles).none).toBe(none);
    for (const none of [3, -1, '1', null, true, 1.5]) expect(restore(JSON.stringify({ none }), styles).none, JSON.stringify(none)).toBe(0);
  });
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `npx vitest run src/lib/presets.test.js src/lib/settings.test.js`
Expected: FAIL. `inks is not a function`, and `restore` results without `none`.

- [ ] **Step 4: Implement**

In `src/lib/presets.js`, after `inOrder`:

```js
// The two colors as they are drawn, [first, second], when `none` says one of them is None: 1 the
// first, 2 the second, 0 neither. A None color is null, and its pixels are left empty.
// Silhouette has only first-color pixels, so with the first color None it is drawn in the second.
export const inks = (first, second, none, style) => (none === 1 ? [style === 'silhouette' ? second : null, second] : none === 2 ? [first, null] : [first, second]);
```

In `src/lib/settings.js`, replace the comment above `THEMES`, the `DEFAULTS` line, and the two lines of `restore` shown:

```js
// What is kept between visits: the two colors and which of them is None (0 neither, 1 the first,
// 2 the second), the style, and every style's settings, and the theme where one was chosen
// (missing means the system's).
const THEMES = ['light', 'dark'];
export const DEFAULTS = { first: '#222323', second: '#f0f6f0', none: 0, style: 'cutout', settings: Object.fromEntries(Object.keys(STYLE_SETTINGS).map(style => [style, defaults(style)])) };
```

```js
  const { first, second, none, style, settings, theme } = saved && typeof saved === 'object' ? saved : {};
  return {
    first: isColor(first) ? first : DEFAULTS.first,
    second: isColor(second) ? second : DEFAULTS.second,
    none: none === 1 || none === 2 ? none : 0,
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `npm test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/presets.js src/lib/presets.test.js src/lib/settings.js src/lib/settings.test.js
git commit -m "feat: which color is None is kept between visits, and inks() gives the colors as drawn

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `colorize`, `pngBytes` and `encodeGif` take a None color

**Files:**
- Modify: `src/lib/bitify.js:378-386` (`colorize`)
- Modify: `src/lib/save.js:42-60` (`pngBytes`)
- Modify: `src/lib/gif.js:32-48` (`encodeGif`)
- Test: `src/lib/bitify.test.js`, `src/lib/save.test.js`, `src/lib/gif.test.js`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `colorize(mask, first, second)`, `pngBytes({ mask, w, h, first, second })` and `encodeGif({ w, h, frames, first, second, loop })` accept `null` for `first` or `second` (never both). A `null` color's pixels come out transparent.

- [ ] **Step 1: Write the failing tests**

In `src/lib/bitify.test.js`, inside `describe('colorize', ...)`:

```js
  it('leaves the pixels of a color that is None clear, like the empty ones', () => {
    expect([...colorize(Uint8Array.of(0, 1, 2), null, '#0000ff')]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255]);
    expect([...colorize(Uint8Array.of(0, 1, 2), '#ff0000', null)]).toEqual([0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 0, 0]);
  });
```

In `src/lib/save.test.js`, inside `describe('pngBytes', ...)`, after the existing test (it uses the `chunks` helper defined there):

```js
  it('makes a color that is None see-through, with the other color in its place in the palette', () => {
    const row = [1, 0, 2, 2, 1], image = { mask: Uint8Array.from([...row, ...row]), w: 5, h: 2 };
    const [, colors1, clear1, data1] = chunks(pngBytes({ ...image, first: null, second: '#0b0a0c' }));
    expect([...colors1.data]).toEqual([0, 0, 0, 11, 10, 12, 11, 10, 12]);
    expect([...clear1.data]).toEqual([0, 0]);
    const [, colors2, clear2] = chunks(pngBytes({ ...image, first: '#f6dfa4', second: null }));
    expect([...colors2.data]).toEqual([0, 0, 0, 246, 223, 164, 246, 223, 164]);
    expect([...clear2.data]).toEqual([0, 255, 0]);
    // the pixels themselves are written as ever
    expect([...inflateSync(data1.data)]).toEqual([0, 0b01001010, 0b01000000, 0, 0b01001010, 0b01000000]);
  });
```

In `src/lib/gif.test.js`, inside `describe('encodeGif', ...)`:

```js
  it('writes the pixels of a color that is None as empty ones, and leaves the masks it was given alone', () => {
    const out = decodeGif(encodeGif({ ...image, first: null }));
    expect(pixels(out.frames[0].data)).toEqual([NONE, NONE, B, B, NONE, NONE]);
    expect(pixels(out.frames[1].data)).toEqual([NONE, NONE, NONE, NONE, B, NONE]);
    expect(pixels(decodeGif(encodeGif({ ...image, second: null })).frames[0].data)).toEqual([A, NONE, NONE, NONE, NONE, A]);
    expect([...image.frames[0].mask]).toEqual([1, 0, 2, 2, 0, 1]);
  });
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run src/lib/bitify.test.js src/lib/save.test.js src/lib/gif.test.js`
Expected: FAIL in the three new tests with `Cannot read properties of null (reading 'slice')`.

- [ ] **Step 3: Implement**

`src/lib/bitify.js`, replace the comment line above `colorize` and the line that builds `c`:

```js
// Turns a mask into RGBA pixels. Colors are '#rrggbb', or null for a color that is None, whose
// pixels are left clear like the empty ones.
export function colorize(m, first, second) {
  // Each pixel is written whole, as one 32-bit number. `c` holds the empty pixel and the two
  // colors as such numbers, built from their bytes so the byte order is the machine's own.
  const rgba = hex => (hex ? [...hexToRgb(hex), 255] : [0, 0, 0, 0]);
  const c = new Uint32Array(Uint8Array.of(0, 0, 0, 0, ...rgba(first), ...rgba(second)).buffer);
```

`src/lib/save.js`, in the comment above `pngBytes` add a last sentence, and replace the `PLTE` and `tRNS` lines:

```js
// A color that is None (null) is made see-through like the empty pixel. Its place in the palette
// holds the other color, so that a program which blends the edges of the picture has no third
// color to pull in.
```

```js
    chunk('PLTE', Uint8Array.of(0, 0, 0, ...hexToRgb(first ?? second), ...hexToRgb(second ?? first))), // what 0, 1 and 2 stand for
    chunk('tRNS', Uint8Array.from(first ? (second ? [0] : [0, 255, 0]) : [0, 0])), // how solid each is: the empty pixel is see-through, and so is a color that is None
```

`src/lib/gif.js`, replace the comment above `encodeGif`, the `color` line and the `addFrame` line:

```js
// Encodes a two-color animation as a GIF with a transparent background. Each frame's `mask` has
// one byte per pixel: 0 empty, 1 first color, 2 second color (the output of bitify's `mask`),
// which are used directly as palette indexes. Colors are '#rrggbb', or null for a color that is
// None. A GIF frame has one see-through index, 0, so that color's pixels are written as 0 too.
export function encodeGif({ w, h, frames, first, second, loop }) {
  const color = hex => (hex ? parseInt(hex.slice(1), 16) : 0);
  const gone = first ? (second ? 0 : 2) : 1; // the index of the color that is None, or 0
```

```js
    writer.addFrame(0, 0, w, h, gone ? mask.map(v => (v === gone ? 0 : v)) : mask, { delay: Math.round(delay / 10), disposal: 2, transparent: 0 });
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test`
Expected: PASS, all files.

- [ ] **Step 5: Check that nothing else changed**

Run: `git show HEAD:src/lib/bitify.js > bench/bitify.old.js && node bench/equiv.mjs && rm bench/bitify.old.js`
Expected: it finishes without an assertion error (`colorize` with two colors is byte-identical to the code before this task).

- [ ] **Step 6: Commit**

```bash
git add src/lib/bitify.js src/lib/bitify.test.js src/lib/save.js src/lib/save.test.js src/lib/gif.js src/lib/gif.test.js
git commit -m "feat: a color given as null is left out of the pixels, the PNG and the GIF

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The None color in the app

**Files:**
- Modify: `src/App.svelte` (imports; state near line 29; the storage effect near line 52; `resetAll` near line 107; `asking` near line 386; both `<Tile>` uses near lines 513 and 533; `<Dock>` near line 547; the help step near line 600)
- Modify: `src/Dock.svelte` (import; props; `demo`; `swap`; the palette chips near line 243; the swatches near line 324)
- Modify: `src/app.css` (after `.sw:focus-within`, and after `.pal:focus-visible`)
- Modify: main spec, `docs/palettes.md`, `docs/performance.md`, `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: `inks(first, second, none, style)` from Task 1; `restore().none`; the `null`-taking `colorize`, `pngBytes`, `encodeGif` from Task 2.
- Produces: Dock prop `none` (bindable). `Tile.svelte` is not changed: it is handed the drawn colors.

- [ ] **Step 1: `src/App.svelte`**

Import `inks`:

```js
  import { STYLES, inOrder, inks, stepStyle, stepPalette } from './lib/presets.js';
```

After `let second = $state(saved.second);`:

```js
  let none = $state(saved.none); // which of the two is None, and left out of the picture: 0 neither, 1 the first, 2 the second
```

After `const set = $derived({ ...settings[style] });`:

```js
  // The two colors as they are drawn: a None one is null (see `inks`).
  const ink = $derived(inks(first, second, none, style));
```

In the storage effect:

```js
      localStorage.setItem('bitify', JSON.stringify({ first, second, none, style, settings, theme: themePick }));
```

In `resetAll`:

```js
    ({ first, second, none, style, settings } = fresh);
```

`asking`, so that what is saved and copied is what is drawn:

```js
  const asking = () => ({ first: ink[0], second: ink[1], style, set });
```

In both `<Tile>` uses replace `{first}` and `{second}` with:

```svelte
          first={ink[0]}
          second={ink[1]}
```

(the one-line example tile becomes `<Tile item={example} first={ink[0]} second={ink[1]} {style} {set} flipped={showOriginal !== spaceHeld} />`).

The Dock:

```svelte
<Dock bind:first bind:second bind:none bind:style bind:settings bind:showOriginal bind:dragging {autos} {soft} count={items.length} onsaveall={saveEverything} />
```

The help step:

```svelte
      <li><PixelIcon name="grid" /><b>Palette</b>Pick two colors, or a preset. One of them can be None, for a see-through image.</li>
```

Leave the drop screen (`style:background={second}` and `overlayInk`) as it is: it keeps using the two remembered colors.

- [ ] **Step 2: `src/Dock.svelte`, script**

```js
  import { PRESETS, STYLES, isPalette, inOrder, inks } from './lib/presets.js';
```

In the props, after `second = $bindable(),`:

```js
    none = $bindable(), // which color is None: 0 neither, 1 the first, 2 the second
```

`demo`:

```js
  const demo = key => new ImageData(colorize(mask(BALL, key, settings[key]), ...inks(first, second, none, key)), BALL.w, BALL.h);
```

`swap`:

```js
  function swap() {
    const was = first;
    first = second;
    second = was;
    none = none && 3 - none; // None goes with its color
  }
```

- [ ] **Step 3: `src/Dock.svelte`, the None chips**

On the `.chips` div, count the two new chips: `style:--cols={Math.ceil((PRESETS.length + 2) / 2)}`.

After the `{/each}` that draws the palettes, inside `.chips`:

```svelte
          <!-- The None chips end the row: each leaves one color out. A chip shows the pair it gives, with
               the wall's checkerboard for the color that is gone (.pal.none in app.css). -->
          <span class="sep"></span>
          <button
            class="pal none"
            aria-pressed={none === 1}
            aria-label="No color for lines and dark pixels"
            title="No color for lines and dark pixels"
            style:--pair="linear-gradient(135deg, transparent 50%, {second} 50%)"
            onclick={() => (none = none === 1 ? 0 : 1)}
          ></button>
          <button
            class="pal none"
            aria-pressed={none === 2}
            aria-label="No color for fill and light pixels"
            title="No color for fill and light pixels"
            style:--pair="linear-gradient(135deg, {first} 50%, transparent 50%)"
            onclick={() => (none = none === 2 ? 0 : 2)}
          ></button>
```

- [ ] **Step 4: `src/Dock.svelte`, the swatches**

Replace the two labels inside `.pair` (the Swap button between them stays):

```svelte
    <!-- A color that is None shows no color (.sw.none in app.css). Its picker still opens, on the
         color it had, and choosing one there brings the color back. -->
    <label class="sw" class:none={none === 1} style:background={none === 1 ? null : first} title="Color for lines and dark pixels{none === 1 ? ': None' : ''}">
      <input type="color" bind:value={first} oninput={() => none === 1 && (none = 0)} aria-label="Color for lines and dark pixels{none === 1 ? ': None' : ''}" />
    </label>
```

```svelte
    <label class="sw" class:none={none === 2} style:background={none === 2 ? null : second} title="Color for fill and light pixels{none === 2 ? ': None' : ''}">
      <input type="color" bind:value={second} oninput={() => none === 2 && (none = 0)} aria-label="Color for fill and light pixels{none === 2 ? ': None' : ''}" />
    </label>
```

- [ ] **Step 5: `src/app.css`**

After the `.sw:focus-within` line:

```css
/* A color that is None: the wall's checkerboard with a slash across it, in place of the color. */
.sw.none {
  background: linear-gradient(to top right, transparent calc(50% - 1px), var(--fg) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)),
    conic-gradient(var(--tile2) 25%, var(--tile) 0 50%, var(--tile2) 0 75%, var(--tile) 0) 0 0 / 12px 12px;
}
```

After the `.pal:focus-visible` line:

```css
/* The None chips: the pair a chip gives (--pair, from Dock.svelte) over the wall's checkerboard,
   which shows through the half of the color that is gone. */
.pal.none { background: var(--pair), conic-gradient(var(--tile2) 25%, var(--tile) 0 50%, var(--tile2) 0 75%, var(--tile) 0) 0 0 / 12px 12px; }
```

- [ ] **Step 6: Run the unit tests**

Run: `npm test`
Expected: PASS. (No test covers the interface.)

- [ ] **Step 7: Check in a browser, desktop width**

Start the dev server (`npm run dev`, or the `bitify` preview) and open `http://localhost:5173`. Add a sprite with a transparent background (any PNG from `docs/superpowers/mockups/tile-*-off.png` will do). Confirm each of these, and fix what fails before going on:

1. Palette panel: after the twelve palettes and a divider there are two more chips. The first shows checkerboard on its left half, the second on its right half.
2. Press the first None chip: it gets the ring, the first swatch shows checkerboard with a slash, and the first color's pixels on the wall turn to checkerboard. The style previews on the Style button and in the list of styles lose that color too.
3. Press it again: everything comes back, in the same color as before.
4. With the first None on, press the second None chip: None moves to the second color.
5. Swap with the first color None: the second swatch is now None, and the picture is the same as before the swap.
6. Choose another palette with None on: the colors change, None stays.
7. Press the None swatch and choose a color in the picker: None goes off and the color shows.
8. Style Silhouette with the first color None: the shape is drawn in the second color, not blank.
9. Download a still with the first color None and open it in an image editor: the first color's pixels are transparent. Do the same for an animated GIF (`src/assets/logo.gif` added to the wall).
10. Copy a tile and paste it into an image editor: transparent where the color is None.
11. More menu, Reset settings: None goes off.
12. Reload the page with None on: it is still on.
13. No errors in the browser console.

- [ ] **Step 8: Check in a browser, phone width with touch emulation**

At 375 px wide: the palette chips go in two rows of seven with the None chips last in the second row; the None chips can be reached by scrolling the panel if it scrolls; the dock does not change width when a swatch becomes None.

- [ ] **Step 9: Update the docs**

Main spec, `docs/superpowers/specs/2026-10-06-bitify-app-design.md`:

| Where | Change |
|---|---|
| Opening paragraph (line 6, "every image is redrawn using two colors the user picks") | Add a sentence: "One of the two may be None, which leaves its pixels transparent." |
| "Dock, left to right" table | First and second swatch rows: add "Shows a slash on a checkerboard while the color is None; the picker still opens, and choosing a color there turns None off." Swap row: "Exchanges the two colors, and takes None along with its color. Works the same in every style and with every palette." |
| "**Palettes panel.**" paragraph | After "classics, handheld screens, then monitors." add: "After the last group and a divider come the two None chips (see "A color that is None")." |
| Next paragraph ("the chips go in two rows, half the palettes in each") | Change to "the chips go in two rows, seven in each, the None chips last, in the same order and without the dividers." |
| After the palette table (before the next `###` heading) | Add a section "### A color that is None" holding the spec's Part 1 sections "The rule", "Palette panel", "Dock swatches" and "What is drawn", copied from `2026-10-08-none-color-and-stencil-design.md`. |
| "Help and welcome" table, Palette row | "Pick two colors, or a preset. One of them can be None, for a see-through image." in both columns' wording as the row has it today. |
| "Conversion", after "Output pixels are fully opaque or fully transparent." | Add: "A color that is None is not drawn: its pixels are left empty, on the wall and in every file. The conversion itself is the same; only the coloring differs." |
| "Remembered settings", first sentence and the colors bullet | "The two colors, which of them is None, the style, ..." and a bullet: "Which color is None is saved as `none`: 0 for neither, 1 for the first, 2 for the second. Anything else reads as 0." |
| "Saving", the GIF bullet | After "empty pixels transparent" add ", a None color's pixels with them". |
| "Saving", the PNG palette bullet | After "with the empty one transparent)" add: "A color that is None is transparent too, and its palette entry holds the other color." |
| "Structure" table | `save.js`: "...from a mask and the two colors, either of which may be None...". `presets.js`: add "the two colors as they are drawn when one is None". The sentence listing the `$state` values: add "which color is None". |

`docs/palettes.md`, in "What a palette is", after the paragraph that ends "either way round.":

```markdown
Either color can also be **None**: the two chips at the end of the Palette panel leave the
first or the second color out, and its pixels are transparent on the wall and in the saved
files. None is not part of a palette. Choosing a palette changes the two colors and leaves
None where it is, and Swap takes None along with its color.
```

`docs/performance.md`, "Saving" section, first bullet: after "that makes the first one transparent" add ", and a color that is None with it".

`CLAUDE.md`: in the first paragraph change "each image is redrawn in exactly two colors the user picks" to "each image is redrawn in exactly two colors the user picks, either of which can be None (transparent)". In "What it does", after "Changing a color, palette, style or setting redraws every image at once." add: "Either color can be None, set by the two chips that end the palette row; its pixels are transparent on the wall and in every saved or copied file."

`README.md`: change "- Two colors, swap, and twelve preset palettes." to "- Two colors, swap, and twelve preset palettes. Either color can be None, for a transparent result."

- [ ] **Step 10: Commit**

```bash
git add src/App.svelte src/Dock.svelte src/app.css docs/superpowers/specs/2026-10-06-bitify-app-design.md docs/palettes.md docs/performance.md CLAUDE.md README.md
git commit -m "feat: either color can be None, from two chips that end the palette row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Stencil in the library

**Files:**
- Modify: `src/lib/settings.js:8-35`
- Modify: `src/lib/bitify.js` (a new function above `// The styles that turn brightness into a pattern.`; a new branch of `mask` above `if (style === 'solid' || style === 'silhouette')`)
- Modify: `bench/bench.mjs:28`
- Modify: `docs/styles.md`, `docs/performance.md`
- Test: `src/lib/bitify.test.js`, `src/lib/settings.test.js`

**Interfaces:**
- Consumes: nothing from Tasks 1 to 3.
- Produces: `mask(img, 'stencil', set, mw, mh)` with `set` keys `cuts` (0 to 100, default 20), `outline` (`'keep'` or `'trim'`, default `'keep'`), `edges` (0 to 100, default 0). `STYLE_SETTINGS.stencil` is `['cuts', 'outline', 'edges', 'source', 'alpha']`. The style is not yet in `STYLES`, so the app does not show it until Task 5.

- [ ] **Step 1: Save a copy of the old code and time it**

Run: `cp src/lib/bitify.js bench/bitify.old.js && node bench/bench.mjs`
Keep the printed table to compare with Step 8.

- [ ] **Step 2: Write the failing tests**

In `src/lib/settings.test.js`:

- In the first test, the list of styles becomes `['cutout', 'solid', 'stencil', 'lines', 'checker', 'hatch', 'bayer', 'noise', 'atkinson', 'silhouette']`.
- Add inside `describe('the settings of a style', ...)`:

```js
  it('gives Stencil its own settings, with Cuts first', () => {
    expect(defaults('stencil')).toEqual({ cuts: 20, outline: 'keep', edges: 0, source: 'luma', alpha: 128 });
    expect(allowed('cuts', 0)).toBe(true);
    expect(allowed('cuts', 101)).toBe(false);
    expect(allowed('outline', 'trim')).toBe(true);
    expect(allowed('outline', 'none')).toBe(false);
    expect(shown('edges', 0)).toBe('Off');
    expect(shown('edges', 60)).toBe('60%');
  });
```

- Add inside `describe('restore', ...)`:

```js
  it('gives a style its defaults when what was stored is from before the style existed', () => {
    const text = JSON.stringify({ settings: { cutout: { ...defaults('cutout'), seams: 40 } } });
    expect(restore(text, styles).settings.stencil).toEqual(defaults('stencil'));
    expect(restore(text, styles).settings.cutout.seams).toBe(40);
  });
```

In `src/lib/bitify.test.js`:

- Add `'stencil'` to the style lists on the lines that begin `for (const style of ['cutout', 'solid', 'checker', ...` (two of them, in "an all-empty image" and in the test over a random 300 by 200 image), to `['cutout', 'lines', 'solid', 'silhouette']` in `'gives each pixel of a smaller picture what its image pixel is in the full conversion'`, to the list in `'converts the whole image when no size is asked for, or its own'`, and to the list in the first `docs/styles.md` test.
- In the second `docs/styles.md` test add to `examples`:

```js
      side(['stencil', { outline: 'trim' }], ['stencil', { cuts: 70 }], ['stencil', { edges: 70 }]),
```

- Add a new block before `describe('unify', ...)`:

```js
describe('stencil', () => {
  // a dark outline k and a light body b; d is as dark as the outline, e 20 lighter, f 21 lighter; m is a middle grey
  const pal = { k: grey(30), b: grey(200), d: grey(30), e: grey(50), f: grey(51), m: grey(120) };
  const box = image(['       ', ' kkkkk ', ' kbdbk ', ' kbbek ', ' kfbbk ', ' kkkkk ', '       '], pal);

  it('fills the sprite and cuts the inside pixels about as dark as its outline', () => {
    expect(show(mask(box, 'stencil'), 7)).toEqual(['       ', ' ..... ', ' ..#.. ', ' ...#. ', ' ..... ', ' ..... ', '       ']);
  });

  it('cuts up to Cuts above the outline level and no further', () => {
    expect(show(mask(box, 'stencil', { cuts: 0 }), 7)).toEqual(['       ', ' ..... ', ' ..#.. ', ' ..... ', ' ..... ', ' ..... ', '       ']);
    expect(show(mask(box, 'stencil', { cuts: 21 }), 7)).toEqual(['       ', ' ..... ', ' ..#.. ', ' ...#. ', ' .#... ', ' ..... ', '       ']);
  });

  it('cuts the outline too when it is trimmed', () => {
    expect(show(mask(box, 'stencil', { outline: 'trim' }), 7)).toEqual(['       ', ' ##### ', ' #.#.# ', ' #..## ', ' #...# ', ' ##### ', '       ']);
  });

  it('judges each sprite in an image by its own outline', () => {
    // grey 120 is an inside pixel of the first sprite and the outline of the second
    const two = image(['             ', ' kkkkk mmmmm ', ' kbmbk mbmbm ', ' kkkkk mmmmm ', '             '], pal);
    expect(show(mask(two, 'stencil'), 13)).toEqual(['             ', ' ..... ..... ', ' ..... ..#.. ', ' ..... ..... ', '             ']);
  });

  it('with Edges, also cuts the darker side of a strong color change', () => {
    const parts = image(['        ', ' kkkkkk ', ' kbbmmk ', ' kbbmmk ', ' kkkkkk ', '        '], pal);
    const plain = ['        ', ' ...... ', ' ...... ', ' ...... ', ' ...... ', '        '];
    expect(show(mask(parts, 'stencil'), 8)).toEqual(plain);
    // b and m differ by 80: at 90% a change above 75 counts, at 87% only one above 81
    expect(show(mask(parts, 'stencil', { edges: 90 }), 8)).toEqual(['        ', ' ...... ', ' ...#.. ', ' ...#.. ', ' ...... ', '        ']);
    expect(show(mask(parts, 'stencil', { edges: 87 }), 8)).toEqual(plain);
  });

  it('never cuts an inside pixel that touches empty space at a corner', () => {
    // an outline two pixels thick where it turns: the inner pixels are as dark as it, and stay
    const round = image(['  kk  ', ' kkkk ', 'kkbbkk', 'kkbbkk', ' kkkk ', '  kk  '], pal);
    expect(show(mask(round, 'stencil'), 6)).toEqual(['  ..  ', ' .... ', '......', '......', ' .... ', '  ..  ']);
  });

  it('takes the darkest brightness for the level of an image with no empty pixel, which has no outline', () => {
    const opaque = image(['kbbb', 'bebb', 'bbfb'], pal);
    for (const outline of ['keep', 'trim']) expect(show(mask(opaque, 'stencil', { outline }), 4), outline).toEqual(['#...', '.#..', '....']);
  });

  it('counts the canvas edge as empty for a sprite cropped tight to a canvas that has an empty pixel', () => {
    expect(show(mask(image(['kkk ', 'kbk ', 'kkk '], pal), 'stencil', { outline: 'trim' }), 4)).toEqual(['### ', '#.# ', '### ']);
  });

  it('copes with sprites that are all outline', () => {
    const thin = image(['     ', ' k b ', ' k   ', '     '], pal);
    expect(show(mask(thin, 'stencil'), 5)).toEqual(['     ', ' . . ', ' .   ', '     ']);
    expect(show(mask(thin, 'stencil', { outline: 'trim' }), 5)).toEqual(['     ', ' # # ', ' #   ', '     ']);
  });

  it('finds the outline levels afresh for an image analysed with another opacity cut', () => {
    // a dark halo of alpha 100 round a light middle with one dark pixel in it
    const rows = ['hhhhh', 'hbbbh', 'hbdbh', 'hbbbh', 'hhhhh'], colors = { ...pal, h: [30, 30, 30, 100] }, data = new Uint8ClampedArray(100);
    rows.forEach((row, y) => [...row].forEach((ch, x) => data.set([...colors[ch].slice(0, 3), colors[ch][3] ?? 255], (y * 5 + x) * 4)));
    const src = { width: 5, height: 5, data };
    // at a cut of 60 the halo is solid and the image has no empty pixel; at 128 the middle is the sprite
    expect(show(mask(analyze(src, 'luma', 60), 'stencil'), 5)).toEqual(['#####', '#...#', '#.#.#', '#...#', '#####']);
    expect(show(mask(analyze(src, 'luma', 128), 'stencil'), 5)).toEqual(['     ', ' ... ', ' .#. ', ' ... ', '     ']);
  });

  it('walks a sprite that fills a large image', () => {
    const w = 300, h = 300, data = new Uint8ClampedArray(w * h * 4).fill(200);
    for (let p = 0; p < w * h; p++) data[p * 4 + 3] = 255;
    data[3] = 0; // one empty pixel, so the image is a sprite and has an outline
    data.fill(10, (150 * w + 150) * 4, (150 * w + 150) * 4 + 3); // one dark pixel in the middle
    const m = mask(analyze({ width: w, height: h, data }), 'stencil');
    expect([count(m, 0), count(m, 1), count(m, 2)]).toEqual([1, 1, w * h - 2]);
  });
});
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `npx vitest run src/lib/bitify.test.js src/lib/settings.test.js`
Expected: FAIL. The style list differs, `defaults('stencil')` throws, and `mask(…, 'stencil')` throws `TILES[style] is not a function`.

- [ ] **Step 4: Implement the settings**

In `src/lib/settings.js`, add to `SETTINGS` after the `rim` line:

```js
  cuts: { label: 'Cuts', min: 0, max: 100, default: 20 },
  outline: { label: 'Outline', options: [['keep', 'Keep'], ['trim', 'Trim']], default: 'keep' },
  edges: { label: 'Edges', min: 0, max: 100, unit: '%', zero: 'Off', default: 0 },
```

Change the comment above `STYLE_SETTINGS` and add Stencil's line after `solid`:

```js
// The settings each style has, in the order they are shown. The threshold comes first; Stencil
// has none, and its Cuts comes first instead.
```

```js
  stencil: ['cuts', 'outline', 'edges', 'source', 'alpha'],
```

- [ ] **Step 5: Implement the outline levels**

In `src/lib/bitify.js`, above the line `// The styles that turn brightness into a pattern.`:

```js
// Stencil's outline levels: for each solid pixel, the brightness of the darkest pixel on the
// outline of the sprite it belongs to. A sprite is a group of solid pixels that touch, diagonals
// included, and a pixel is on its outline when one of the four pixels beside it is empty or off
// the canvas. An image with no empty pixel is one sprite with no outline, and its level is the
// image's darkest brightness.
// Each sprite is walked once, outwards from its first pixel, with `queue` holding the pixels found.
// ponytail: the queue is four bytes for every pixel of the image, a moment's 48 MB for 12
// megapixels with see-through parts. Label the sprites row by row if that ever matters.
function outlineLevels(img) {
  const { w, h, lum, data, cut = ALPHA_CUT } = img, level = new Uint8Array(w * h);
  if (!img.hasAlpha) return level.fill(img.lo);
  const seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3] < cut) continue;
    let n = 0, low = 255;
    queue[n++] = start;
    seen[start] = 1;
    for (let i = 0; i < n; i++) {
      const p = queue[i], x = p % w, y = (p - x) / w;
      let rim = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const q = Y * w + X;
        if (data[q * 4 + 3] < cut) { if (!dx || !dy) rim = true; }
        else if (!seen[q]) { seen[q] = 1; queue[n++] = q; }
      }
      if (rim && lum[p] < low) low = lum[p];
    }
    for (let i = 0; i < n; i++) level[queue[i]] = low;
  }
  return level;
}

```

- [ ] **Step 6: Implement the Stencil branch of `mask`**

In `src/lib/bitify.js`, inside `mask`, above `if (style === 'solid' || style === 'silhouette') {`:

```js
  if (style === 'stencil') {
    // Every solid pixel is the second color but the cuts: inside pixels about as dark as their
    // sprite's own outline, and with Edges the darker side of a strong color change. The outline
    // itself is kept, or cut when it is trimmed. The canvas edge is empty only for sprites, as in
    // Lines. The levels are found once for an analysed image and kept with it.
    const level = (img.level ??= outlineLevels(img)), edge = img.hasAlpha;
    // no two pixels differ by more than 255, so with Edges off nothing is strong enough
    const cuts = opt.cuts ?? 20, trim = opt.outline === 'trim', strength = 255 - 2 * (opt.edges ?? 0);
    for (let j = 0, o = 0; j < mh; j++) for (let i = 0, y = ys[j]; i < mw; i++, o++) {
      const x = xs[i], p = y * w + x;
      if (!solid(p)) continue;
      if ((x ? !solid(p - 1) : edge) || (x + 1 < w ? !solid(p + 1) : edge) || (y ? !solid(p - w) : edge) || (y + 1 < h ? !solid(p + w) : edge)) m[o] = trim ? 1 : 2;
      else {
        const seam =
          (x && right[p - 1] > strength && darker(p, p - 1)) || (x + 1 < w && right[p] > strength && darker(p, p + 1)) || (y && down[p - w] > strength && darker(p, p - w)) || (y + 1 < h && down[p] > strength && darker(p, p + w));
        // an inside pixel that touches empty space at a corner is never cut: there an outline two pixels thick would leave a speck
        const corner = !solid(p - w - 1) || !solid(p - w + 1) || !solid(p + w - 1) || !solid(p + w + 1);
        m[o] = !corner && (seam || lum[p] <= level[p] + cuts) ? 1 : 2;
      }
    }
    return m;
  }

```

Also update two comments in the same file: the one above `mask` that says "In Cutout, Lines, Solid and Silhouette each pixel of the picture is exactly what the image pixel it stands for is in the full mask" becomes "In Cutout, Solid, Stencil, Lines and Silhouette ...".

Why `corner` needs no bounds checks: an inside pixel of an image with empty pixels is never on the canvas edge (the edge counts as empty there, so it would be on the outline), and in an image with no empty pixel `solid` answers true before it reads anything.

- [ ] **Step 7: Add the docs section the tests read**

In `docs/styles.md`:

- Line 3: "nine styles" becomes "ten styles".
- Add this section between the end of "## Solid" and "## Lines":

````markdown
## Stencil

The whole sprite is the second color, and only its darkest inner lines are cut out of it
in the first. It takes no notice of shading. It is made for icons in one color: set the
first color to None (see [palettes.md](palettes.md)) and the cuts are holes.

- A **sprite** is a group of solid pixels that touch, diagonals included. An image of
  sixteen separate icons has sixteen sprites.
- A pixel is on a sprite's **outline** when one of the four pixels beside it is empty. Its
  **outline level** is the brightness of the darkest pixel on its outline.
- A pixel on the outline is the second color.
- A pixel inside is cut, the first color, when its brightness is no more than its sprite's
  outline level plus Cuts. One that touches empty space at a corner is never cut.

```
    ......
   ........
  ..........
 ............
..............
..............
..............
..............
..............
..............
 ............
  ..........
   ........
    ......
```

The ball's outline has a brightness of 25 and its stripe is far lighter than 45, so nothing
is cut and the ball is one shape. Each sprite is judged by its own outline, so a sheet of
differently colored icons converts as well as the same icons one file each.

An image with no empty pixel is one sprite with no outline; its level is its darkest
brightness.

Its settings:

- **Cuts**, 0 to 100, default 20: how much lighter than the outline an inside pixel may be
  and still be cut. Higher values cut dark shading as well, and far enough up a dark sprite
  is hollowed out.
- **Outline**, Keep or Trim: Keep leaves the outline the second color, so the shape is full
  size and thin parts survive. Trim makes it a cut: in two colors that draws the sprite's
  own outline, in one color it takes a pixel off all round.
- **Edges**, Off or 1 to 100%: also cuts the darker side of a color change stronger than
  `255 − 2 × Edges`, between pixels inside the sprite. It finds parts that no dark line
  separates.
- Brightness and Opacity cut (see "Settings" above). Stencil has no threshold.

Outline Trim, Cuts 70 and Edges 70%:

```
    ######           ......           ......
   #......#         ........         ........
  #........#       ..........       ..........
 #..........#     ............     ............
#............#   ..............   ..............
#............#   ..............   ..............
#............#   ..............   ..............
#............#   .############.   .#########....
#............#   .############.   ..............
#............#   ..##########..   ..............
 #..........#     ............     ............
  #........#       ..........       ..........
   #......#         ........         ........
    ######           ......           ......
```

Known limits: its cuts are sparser than a hand-drawn icon's; a sprite whose outline is no
darker than its inside gets few or none; and a part in the outline's own color more than a
pixel or two wide becomes a hole.
````

- In "## Choosing between them" add a row after Solid's: `| An icon in one color, with its details as holes | Stencil, with the first color None |`.
- In "### Settings", the Brightness bullet says "(every style but Lines and Silhouette)": leave it, Stencil has Brightness.

If the drawings in the two code blocks do not match what the code draws, the two `docs/styles.md` tests say so and print the right drawing. Copy what they print.

- [ ] **Step 8: Run everything**

Run: `npm test`
Expected: PASS, all files.

Run: `node bench/equiv.mjs`
Expected: no assertion error. Every other style's masks are byte-identical to the copy saved in Step 1. (Do not add Stencil to `bench/equiv.mjs`: the old copy does not have it.)

In `bench/bench.mjs` line 28 add Stencil: `const STYLES = ['cutout', 'solid', 'stencil', 'lines', 'silhouette', 'checker', 'hatch', 'bayer', 'noise', 'atkinson'];`

Run: `node bench/bench.mjs`
Expected: the other styles within a few percent of Step 1. Stencil's own column on the "sprite" rows includes finding the outline levels the first time; note the 4000x3000 sprite figure for the doc below. Then `rm bench/bitify.old.js`: it is not ignored by git and must not be committed.

- [ ] **Step 9: `docs/performance.md`**

In "### Conversion (`mask`)", add a bullet at the end of that section, with the measured figure in place of N:

```markdown
- **Stencil judges each sprite by its own outline**, so it first needs every sprite's
  outline level: `outlineLevels` walks each sprite once and keeps one byte per pixel with
  the analysed image, so it is done once however often the settings change. It is found on
  the first Stencil conversion, not in `analyze`, so an image never shown in Stencil never
  pays for it. A photo has no empty pixel and skips the walk. The walk briefly holds four
  bytes for every pixel of the image. A 4000 by 3000 image with see-through parts took
  N ms in Node for its first Stencil mask.
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/settings.js src/lib/settings.test.js src/lib/bitify.js src/lib/bitify.test.js bench/bench.mjs docs/styles.md docs/performance.md
git commit -m "feat: Stencil in the library: the whole sprite filled, its darkest inner lines cut

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Stencil in the app

**Files:**
- Modify: `src/lib/presets.js:20-30` (`STYLES`)
- Modify: `src/Dock.svelte` (the `rest` line near 65; the strip near line 300)
- Modify: main spec, `CLAUDE.md`, `README.md`
- Test: `src/lib/presets.test.js`

**Interfaces:**
- Consumes: `mask(img, 'stencil', set)` and `STYLE_SETTINGS.stencil` from Task 4.
- Produces: Stencil as the third entry of `STYLES`; the Dock shows a style's first setting on the strip when it is `threshold` or `cuts`.

- [ ] **Step 1: Write the failing test**

In `src/lib/presets.test.js`, inside `describe('stepStyle', ...)`:

```js
  it('has Stencil third, after Cutout and Solid', () => {
    expect(STYLES.map(s => s[0])).toEqual(['cutout', 'solid', 'stencil', 'lines', 'checker', 'hatch', 'bayer', 'noise', 'atkinson', 'silhouette']);
    expect(STYLES[2]).toEqual(['stencil', 'Stencil']);
  });
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/lib/presets.test.js`
Expected: FAIL, the list has nine entries.

- [ ] **Step 3: Add the style**

In `src/lib/presets.js`, after `['solid', 'Solid'],`:

```js
  ['stencil', 'Stencil'],
```

- [ ] **Step 4: Give Cuts the threshold's place on the strip**

In `src/Dock.svelte`, replace the comment and line for `rest`:

```js
  // The current style's settings: the values, and which settings they are. The threshold has its
  // place on the strip, or Cuts in Stencil, which has no threshold; `rest` is the others.
  const own = $derived(settings[style]);
```

(keep the `keys` lines between as they are) and

```js
  const lead = $derived(['threshold', 'cuts'].includes(keys[0]) ? keys[0] : null);
  const rest = $derived(keys.filter(key => key !== lead));
```

In the wide-screen strip, replace

```svelte
        {#if keys[0] === 'threshold'}
          <div class="thr">{@render control('threshold')}</div>
```

with

```svelte
        {#if lead}
          <div class="thr">{@render control(lead)}</div>
```

Nothing else in the Dock names the threshold: the chips, the tray and Reset all work from `keys`.

- [ ] **Step 5: Run the unit tests**

Run: `npm test`
Expected: PASS, all files.

- [ ] **Step 6: Check in a browser, desktop width**

Add a sheet of outlined sprites (`docs/superpowers/mockups/tile-1-off.png` is a converted one; any colored pixel-art PNG with a transparent background is better). Confirm:

1. The list of styles shows Stencil third, with a preview, and the arrow keys and the wheel step Cutout, Solid, Stencil, Lines.
2. With Stencil chosen, the strip shows the style button, the Cuts slider with its number box and no Auto button, and More. The tray under More has Outline (Keep, Trim), Edges (slider, empty box reading "Off" at 0) and Brightness, and Reset.
3. Dragging Cuts redraws the wall. Outline Trim draws the outline in the first color. Edges above about 50% adds cuts.
4. With the first color None (Palette panel), Stencil gives one color on the checkerboard with holes for the cuts.
5. Reset puts Cuts back to 20, Outline to Keep, Edges to Off.
6. Changing to another style and back finds Stencil's settings as they were left. A reload keeps them.
7. Download and Copy give the same picture as the wall.
8. A photo (no transparency) in Stencil is one filled rectangle with its darkest pixels cut; nothing stalls.
9. No errors in the browser console.

- [ ] **Step 7: Check in a browser, phone width with touch emulation**

At 375 px wide: Stencil's panel shows chips Cuts, Outline, Edges, Brightness and Reset, with Cuts pressed first and its slider below; swiping up and down over the wall steps through the styles and reaches Stencil.

- [ ] **Step 8: Update the docs**

Main spec, `docs/superpowers/specs/2026-10-06-bitify-app-design.md`:

| Where | Change |
|---|---|
| "### Styles" table | Add a row after Solid: `| **Stencil** | Every non-empty pixel is second color, except the cuts, which are first color. A pixel on its sprite's outline is never a cut unless Outline is Trim, which makes all of them cuts. A pixel inside is a cut when its brightness is no more than its sprite's outline level plus Cuts, or when Edges is on and it is on the darker side of a change stronger than the edge strength; but never when it touches empty space at a corner. |` |
| After "Known limits of Cutout" | Add "Details of Stencil:" with the bullets from the design spec's "The rule" (sprite, outline, outline level, an image with no empty pixel, the difference and tie as in Lines) and its "Known limits". |
| "### Threshold" | Change "Silhouette ignores it." to "Stencil and Silhouette have none." |
| "### Each style's settings" table | Threshold row: "all but Stencil and Silhouette". Add three rows from the design spec's settings table: Cuts (Stencil, 0 to 100, 20), Outline (Stencil, Keep or Trim, Keep), Edges (Stencil, Off or 1 to 100%, Off). Brightness row: unchanged, Stencil has it. |
| The bullets under that table | Add: "Stencil has no threshold. Cuts takes its place: on a wide screen its slider is on the strip and the others are in the tray, and on a phone its chip is first." and "Stencil gives each pixel of a smaller picture exactly what its image pixel is in the full conversion. The outline levels are found once for an analysed image, the first time Stencil converts it." |
| The paragraph about the style button's list ("opens the list of the nine styles") | "ten styles". |
| "Remembered settings" ("the style one of the nine") | "one of the ten". |
| "Animated GIFs", first bullet | Add: "Stencil's outline levels are the exception: each frame has its own." |
| "Structure" table, `bitify.js` row | Add Stencil's outline levels to what the file holds. |

`CLAUDE.md`: "There are nine styles; the default, Cutout, fills ..." becomes "There are ten styles; the default, Cutout, fills ...", and add after that sentence: "Stencil, the third, fills a whole sprite and cuts only its darkest inner lines; with the first color None it makes icons in one color." Also "docs/styles.md explains how each of the nine styles works" becomes "ten".

`README.md`: the styles bullet becomes "- Ten styles: Cutout (filled shapes with their parts cut apart, after the game End of End), Solid, Stencil (a filled shape with its inner lines cut out, for one-color icons), Lines (outlines each part of a sprite), Checker, Hatch, Bayer, Noise, Atkinson and Silhouette."

Then mark the design spec built: in `docs/superpowers/specs/2026-10-08-none-color-and-stencil-design.md` change "Status: approved in conversation, not yet built." to "Status: built."

- [ ] **Step 9: Commit**

```bash
git add src/lib/presets.js src/lib/presets.test.js src/Dock.svelte docs/superpowers/specs/2026-10-06-bitify-app-design.md docs/superpowers/specs/2026-10-08-none-color-and-stencil-design.md CLAUDE.md README.md
git commit -m "feat: Stencil, a tenth style, third in the list, with Cuts on the strip

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
