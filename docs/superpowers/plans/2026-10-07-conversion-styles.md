# Conversion Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Cutout style (the End of End look) as the default, stop Lines Auto from collapsing on soft shading, and stop Checker, Bayer and Atkinson from breaking an image's darkest and lightest colors.

**Architecture:** Everything that decides pixels stays in the DOM-free module `src/lib/bitify.js`. `analyze` records three more facts per image (darkest brightness, lightest brightness, seam strength), `unify` shares them across the frames of an animation, and `mask` gains one style and new rules for three. `mask` keeps its arguments and never reads the two colors, so Swap inverts every style and the components need no new props. The interface change is one list entry, one help line, two CSS numbers and the default style.

**Tech Stack:** Vite 8, Svelte 5 (runes, no SvelteKit), plain JavaScript, Vitest 4.

**Spec:** [docs/superpowers/specs/2026-10-07-conversion-styles-design.md](../specs/2026-10-07-conversion-styles-design.md). Read it before starting; this plan argues from it. The app's standing source of truth, [2026-10-06-bitify-app-design.md](../specs/2026-10-06-bitify-app-design.md), is updated by each task below.

Every change to `src/lib/bitify.js` and `src/lib/bitify.test.js` in this plan was applied task by task to a throwaway copy before the plan was written. `npx vitest run src/lib/bitify.test.js` passed 25 tests after Task 1, 30 after Task 2 and 40 after Task 3, and the worked examples in the documentation steps are the real output of that code. The interface changes in Task 4 were not run; Task 4 has its own browser checks.

## Before Task 1

- The spec, its comparison sheet and this plan are not committed yet. Create the branch `conversion-styles` from `main` (in a worktree, per superpowers:using-git-worktrees), make sure these three files are in it, and commit them first:

```bash
git add docs/superpowers/specs/2026-10-07-conversion-styles-design.md docs/superpowers/specs/2026-10-07-conversion-styles-spike.png docs/superpowers/plans/2026-10-07-conversion-styles.md
git commit -m "docs: spec and plan for Cutout and the conversion fixes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- Run `npx vitest run src/lib/bitify.test.js` and confirm `Tests  24 passed (24)`. If the count differs, `main` has moved since this plan was written: read the test file and adjust the counts below, not the code.

## Global Constraints

- Work on the `conversion-styles` branch. Never push; every push to `main` deploys the site.
- **One commit per task**, made at the end of that task, containing only that task's files. This is a standing instruction from the user.
- End every commit message with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Plain JavaScript, Svelte 5 runes only. No TypeScript, no new dependencies.
- `src/lib/bitify.js` stays free of DOM access.
- `mask(analysis, style, threshold)` keeps exactly these arguments and returns one byte per pixel: 0 empty, 1 first color, 2 second color. It must never read the chosen colors. Dark pixels and lines are 1; light pixels and fill are 2.
- The floor for Auto edge strength and Auto seam strength is the single constant `MIN_EDGE = 24`.
- A pixel is empty when its alpha is below 128. Empty pixels stay empty in every style.
- All CSS lives in `src/app.css` as global rules. Components have no `<style>` blocks. Do not add a `box-sizing: border-box` reset.
- User-facing text and documentation text are copied exactly as written in this plan. American spelling for "color".
- Each task updates the documents named in it in the same commit as the code. `CLAUDE.md` requires the app spec to change with the code.
- Style keys, in list order: `cutout`, `lines`, `solid`, `checker`, `bayer`, `atkinson`, `silhouette`. Solid is not renamed.

## Review Focus

Inputs the spec implies but does not spell out, most likely first. Each is pinned by a test in the task named.

1. **An image whose darkest color sits exactly on the Auto threshold.** This is common: when a dark outline is the only dark color, Otsu lands on it. The pattern styles must keep it dark, not pattern it. Pinned in Task 2, `checker and bayer: a color at the threshold is dark when nothing is darker`.
2. **An image of a single color.** It has no brightness range, so the tone formula would divide by zero. It must come out flat, light above the threshold and dark otherwise. Pinned in Task 2, `checker, bayer and atkinson: an image of one color has no range and stays flat`.
3. **An opaque image in Cutout** (a scene, a tileset, a photo). It has no silhouette, so it must get no rim along the canvas edge, while a sprite cropped tight to its canvas still does. Pinned in Task 3, `rims an image only when it has empty pixels`.
4. **An animation whose frames differ in brightness** (a fade, a flash). Patterns and seams must not shift from frame to frame. Pinned in Task 2, `shares the darkest and lightest brightness, so patterns match from frame to frame`, and Task 3, `shares the seam strength, picked after the shared brightness cut`.
5. **The threshold at its ends, 1 and 254, on a large image.** Every style must return a mask of the right size with empty pixels exactly where the source is empty. Pinned in Task 3, where the large-image test runs every style at Auto, 1 and 254.

---

### Task 1: Lines Auto never goes below 24

An image with only soft shading has nothing for Otsu to separate, so it splits the shading steps themselves and almost every pixel becomes a line. A floor fixes it.

**Files:**
- Modify: `src/lib/bitify.js` (constants at the top, the last line of `analyze`, the `shared` line of `unify`)
- Test: `src/lib/bitify.test.js` (the `lines` block)
- Modify: `docs/superpowers/specs/2026-10-06-bitify-app-design.md` (Threshold, Testing)
- Modify: `docs/styles.md` (The threshold)

**Interfaces:**
- Consumes: nothing.
- Produces: the module constant `MIN_EDGE` (24, not exported), which Task 3 reuses. `analyze(...).autoLine` and the `autoLine` that `unify` shares are now at least 24.

- [ ] **Step 1: Write the failing tests**

In `src/lib/bitify.test.js`, inside `describe('lines', ...)`, add this test directly above the test named `survives an image with no solid pixels, and a large non-square one`:

```js
  it('auto does not take soft shading for boundaries', () => {
    // every neighbour differs by 4: a gradient with no parts
    const img = image([
      '       ',
      ' abcde ',
      ' bcdef ',
      ' cdefg ',
      ' defgh ',
      ' efghi ',
      '       ',
    ], Object.fromEntries([...'abcdefghi'].map((ch, i) => [ch, grey(100 + 4 * i)])));
    expect(img.autoLine).toBe(24);
    expect(show(mask(img, 'lines'), 7)).toEqual([
      '       ',
      ' ##### ',
      ' #...# ',
      ' #...# ',
      ' #...# ',
      ' ##### ',
      '       ',
    ]);
  });
```

In the test below it, change the expected Auto value for an image with no solid pixels:

```js
    expect(none.autoLine).toBe(0);
```

becomes

```js
    expect(none.autoLine).toBe(24);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/bitify.test.js`
Expected: 2 failed, both with `expected +0 to be 24`.

- [ ] **Step 3: Implement the floor**

In `src/lib/bitify.js`, add the constant under `ALPHA_CUT`:

```js
const ALPHA_CUT = 128; // alpha below this is an empty pixel
const MIN_EDGE = 24; // Auto never takes a color change weaker than this for a boundary
```

Change the last line of `analyze` from

```js
  return { w, h, data, lum, hasAlpha, hist, edges, auto: otsu(hist, 127), autoLine: otsu(edges, 0) };
```

to

```js
  return { w, h, data, lum, hasAlpha, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
```

Change the `shared` line of `unify` from

```js
  const shared = { auto: otsu(hist, 127), autoLine: otsu(edges, 0), hasAlpha: frames.some(f => f.hasAlpha) };
```

to

```js
  const shared = { auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)), hasAlpha: frames.some(f => f.hasAlpha) };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/bitify.test.js`
Expected: `Tests  25 passed (25)`

- [ ] **Step 5: Update the documents**

In `docs/superpowers/specs/2026-10-06-bitify-app-design.md`, under `### Threshold`, replace

```
- For Lines, on the histogram of non-zero differences between horizontally and vertically
  adjacent non-empty pixels. This separates soft shading steps from real part boundaries.
  Fallback 0.
```

with

```
- For Lines, on the histogram of non-zero differences between horizontally and vertically
  adjacent non-empty pixels. This separates soft shading steps from real part boundaries.
  The value is never below 24: an image with only soft shading has nothing to separate,
  and without the floor its shading steps would be taken for boundaries.
```

In the same file, under `## Testing`, replace

```
    ignores a shading step below the threshold, and frames only images that have empty
    pixels;
```

with

```
    ignores a shading step below the threshold, frames only images that have empty
    pixels, and at Auto draws no lines along soft shading;
```

In `docs/styles.md`, under `### The threshold`, replace

```
  form one group and real part boundaries form the other, so Auto lands between them. If
  there is nothing to split, it uses 0.
```

with

```
  form one group and real part boundaries form the other, so Auto lands between them. It
  never goes below 24, so an image with only soft shading gets an outline and a flat fill
  instead of lines along its shading.
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/bitify.js src/lib/bitify.test.js docs/superpowers/specs/2026-10-06-bitify-app-design.md docs/styles.md
git commit -m "fix: Lines Auto no longer takes soft shading for boundaries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Checker, Bayer and Atkinson use the image's own brightness range

Today these styles shift the cut-off by a fixed amount, which can pass an image's darkest or lightest color and punch holes in outlines and highlights. They now work on a tone from 0 to 1 that runs from the image's darkest brightness, through the threshold at 0.5, to its lightest.

**Files:**
- Modify: `src/lib/bitify.js` (`analyze`, `unify`, `mask`)
- Test: `src/lib/bitify.test.js` (the `analyze`, `mask` and `unify` blocks)
- Modify: `docs/superpowers/specs/2026-10-06-bitify-app-design.md` (Styles, Animated GIFs, Structure, Testing)
- Modify: `docs/styles.md` (a new Tone subsection; the Checker, Bayer and Atkinson sections)

**Interfaces:**
- Consumes: `MIN_EDGE` from Task 1 (only because the lines it sits on are edited again).
- Produces: `analyze(...)` also returns `lo` and `hi`, the darkest and lightest brightness among the solid pixels (255 and 0 when there are none). `unify` sets every frame's `lo` and `hi` to the lowest and highest of all frames. Task 3 edits the same return line and `shared` object.

- [ ] **Step 1: Write the failing tests**

In `src/lib/bitify.test.js`, inside `describe('analyze', ...)`, add this test directly above the test named `treats alpha below 128 as empty and 128 or more as solid`:

```js
  it('records the darkest and lightest brightness of the solid pixels', () => {
    const img = image(['a bc'], { a: grey(240), b: grey(20), c: grey(120) });
    expect([img.lo, img.hi]).toEqual([20, 240]);
  });
```

Inside `describe('mask', ...)`, delete the three tests named `checker: a mid-tone becomes a checkerboard, extremes stay flat`, `bayer: a mid-tone lights exactly half of each 4x4 cell` and `atkinson: flat white and black stay flat, a mid-tone mixes both colors`. They use an image of one flat color, which has no range. Put these six in their place:

```js
  // A column of the darkest color, four of a middle color, a column of the lightest.
  const three = () => image(Array(4).fill('abbbbc'), { a: grey(20), b: grey(120), c: grey(240) });

  it('checker: the middle color becomes a checkerboard', () => {
    expect(show(mask(three(), 'checker', 120), 6)).toEqual(['##.#..', '#.#.#.', '##.#..', '#.#.#.']);
  });

  it('bayer: the middle color lights exactly half of a 4x4 cell', () => {
    const m = mask(three(), 'bayer', 120);
    expect(count(m, 2)).toBe(4 + 8); // the lightest column, and half of the middle block
    expect(show(m, 6)).toEqual(['##.#..', '#.#.#.', '##.#..', '#.#.#.']);
  });

  it('checker and bayer: the darkest color stays dark and the lightest stays light', () => {
    for (const style of ['checker', 'bayer']) for (const t of [null, 30, 120, 230]) {
      const rows = show(mask(three(), style, t), 6);
      expect(rows.map(r => r[0] + r[5])).toEqual(['#.', '#.', '#.', '#.']);
    }
  });

  it('checker and bayer: a color at the threshold is dark when nothing is darker', () => {
    // the darkest color sits exactly on the cut, as it does for an outline under a low Auto
    const img = image(['aabb', 'aabb'], { a: grey(35), b: grey(245) });
    for (const style of ['checker', 'bayer']) expect(show(mask(img, style, 35), 4)).toEqual(['##..', '##..']);
  });

  it('checker, bayer and atkinson: an image of one color has no range and stays flat', () => {
    const flat = () => image(['aaaa', 'aaaa', 'aaaa', 'aaaa'], { a: grey(128) });
    for (const style of ['checker', 'bayer', 'atkinson']) {
      expect(count(mask(flat(), style, 50), 2)).toBe(16); // above the threshold: light
      expect(count(mask(flat(), style, 128), 1)).toBe(16); // at or below it: dark
      expect(count(mask(flat(), style, 200), 1)).toBe(16);
      expect(count(mask(flat(), style), 2)).toBe(16); // Auto falls back to 127
    }
  });

  it('atkinson: flat white and black stay flat, a middle color mixes both colors', () => {
    const flat = Array(8).fill('aaaaaaaa');
    expect(count(mask(image(flat, { a: grey(255) }), 'atkinson', 128), 2)).toBe(64);
    expect(count(mask(image(flat, { a: grey(0) }), 'atkinson', 128), 1)).toBe(64);
    // a darkest column, an 8x8 block of a middle color, a lightest column
    const rows = show(mask(image(Array(8).fill('abbbbbbbbc'), { a: grey(20), b: grey(120), c: grey(240) }), 'atkinson', 120), 10);
    const light = rows.map(r => r.slice(1, 9)).join('').split('.').length - 1;
    expect(light).toBeGreaterThan(16);
    expect(light).toBeLessThan(48);
    expect(rows.map(r => r[0] + r[9])).toEqual(Array(8).fill('#.'));
  });
```

Inside `describe('unify', ...)`, add this test after the last one (`leaves a single image as it was`):

```js
  it('shares the darkest and lightest brightness, so patterns match from frame to frame', () => {
    const dark = image(['aabb'], { a: grey(10), b: grey(60) }), light = image(['aabb'], { a: grey(150), b: grey(240) });
    unify([dark, light]);
    expect([dark.lo, dark.hi, light.lo, light.hi]).toEqual([10, 240, 10, 240]);
    // 60 is the shared cut and 10 the shared darkest: the first frame is not stretched to its own range
    expect(show(mask(dark, 'bayer'), 4)).toEqual(['##.#']);
    expect(show(mask(light, 'bayer'), 4)).toEqual(['....']);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/bitify.test.js`
Expected: several failures. Among them `records the darkest and lightest brightness` with `expected [ undefined, undefined ] to deeply equal [ 20, 240 ]`, and `checker and bayer: a color at the threshold is dark when nothing is darker`, where today's code patterns the darkest color.

- [ ] **Step 3: Record the range in `analyze` and share it in `unify`**

In `src/lib/bitify.js`, change the comment above `analyze` from

```js
// `auto` is the Auto threshold for the brightness styles, `autoLine` the one for Lines.
```

to

```js
// `auto` is the Auto threshold for the brightness styles, `autoLine` the one for Lines.
// `lo` and `hi` are the darkest and lightest brightness among the solid pixels.
```

In `analyze`, change

```js
  let hasAlpha = false;
```

to

```js
  let hasAlpha = false, lo = 255, hi = 0;
```

and, directly under `hist[lum[p]]++;`, add two lines so that it reads

```js
    hist[lum[p]]++;
    lo = Math.min(lo, lum[p]);
    hi = Math.max(hi, lum[p]);
```

Change the last line of `analyze` to

```js
  return { w, h, data, lum, hasAlpha, lo, hi, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
```

Replace the comment above `unify` with

```js
// Makes every frame of an animation convert the same way: the Auto thresholds and the brightness
// range are taken from all the frames together instead of frame by frame, so a pixel does not
// flicker between the two colors as the animation plays. Takes the results of `analyze` and
// updates them in place.
```

and its `shared` line with

```js
  const shared = {
    auto: otsu(hist, 127),
    autoLine: Math.max(MIN_EDGE, otsu(edges, 0)),
    hasAlpha: frames.some(f => f.hasAlpha),
    lo: Math.min(...frames.map(f => f.lo)),
    hi: Math.max(...frames.map(f => f.hi)),
  };
```

- [ ] **Step 4: Use the tone in `mask`**

In `mask`, change the first line of the body from

```js
  const { w, h, lum, data } = img, m = new Uint8Array(w * h);
```

to

```js
  const { w, h, lum, data, lo, hi } = img, m = new Uint8Array(w * h);
```

Replace the start of the Atkinson branch

```js
  if (style === 'atkinson') {
    const v = Float32Array.from(lum, x => x + 128 - t);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      const on = v[p] > 128, e = (v[p] - (on ? 255 : 0)) / 8;
```

with

```js
  // Brightness as a tone from 0 to 1 through the image's own range: its darkest brightness is 0,
  // the threshold 0.5 and its lightest 1. So a pattern never reaches the darkest or lightest color.
  const tone = p => (lum[p] <= t ? (t > lo ? (0.5 * (lum[p] - lo)) / (t - lo) : 0) : 0.5 + (0.5 * (lum[p] - t)) / (hi - t));

  if (style === 'atkinson') {
    const v = Float32Array.from(lum, (_, p) => (solid(p) ? tone(p) * 255 : 0));
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      const on = v[p] > 127.5, e = (v[p] - (on ? 255 : 0)) / 8;
```

The rest of the Atkinson branch (how the error is spread) does not change.

In the last loop of `mask`, replace

```js
    let cut = t;
    if (style === 'checker') cut += (x + y) % 2 ? 40 : -40;
    else if (style === 'bayer') cut += ((BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 192;
    m[p] = style === 'silhouette' ? 1 : lum[p] > cut ? 2 : 1;
```

with

```js
    if (style === 'silhouette') m[p] = 1;
    else if (style === 'checker') m[p] = tone(p) > ((x + y) % 2 ? 0.75 : 0.25) ? 2 : 1;
    else if (style === 'bayer') m[p] = tone(p) > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 2 : 1;
    else m[p] = lum[p] > t ? 2 : 1;
```

The last line is Solid, unchanged in behavior.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/bitify.test.js`
Expected: `Tests  30 passed (30)`

- [ ] **Step 6: Update the app spec**

In `docs/superpowers/specs/2026-10-06-bitify-app-design.md`, in the table under `### Styles`, replace the Checker, Bayer and Atkinson rows with

```
| **Checker** | Second color if the tone (see below) is above 0.25 on even `x + y` cells and above 0.75 on odd ones, so mid-tones become a checkerboard. |
| **Bayer** | Second color if the tone is above `(b + 0.5) / 16`, where `b` is the value of a 4×4 ordered-dither matrix at the pixel. |
| **Atkinson** | Error diffusion on `tone × 255`. Each pixel is cut at 127.5, and one eighth of the error goes to each of six neighbours (right, two right, the three below, two below). |
```

Directly above the heading `### Threshold`, add

```
Checker, Bayer and Atkinson work on a **tone** from 0 to 1 that runs through the image's own
range: its darkest brightness is 0, the threshold is 0.5 and its lightest brightness is 1.

- At or below the threshold: `0.5 × (brightness − darkest) / (threshold − darkest)`, or 0
  when the threshold is not above the darkest.
- Above the threshold: `0.5 + 0.5 × (brightness − threshold) / (lightest − threshold)`.

So with a threshold inside the image's range, Checker and Bayer never turn its darkest color
light or its lightest color dark, and outlines and highlights stay whole.

```

Under `## Animated GIFs`, replace

```
- Every frame goes through the same conversion as a still image, and the whole animation uses
  one Auto threshold picked from all its frames together. Picking it frame by frame would make
  pixels flicker between the two colors as the animation plays.
```

with

```
- Every frame goes through the same conversion as a still image, and the whole animation uses
  one Auto threshold and one brightness range, taken from all its frames together. Taking
  them frame by frame would make pixels flicker between the two colors as the animation
  plays.
```

Under `## Structure`, in the `src/lib/bitify.js` row, replace `whether any pixel is empty, and the two auto thresholds` with `whether any pixel is empty, the darkest and lightest brightness, and the auto thresholds`.

Under `## Testing`, replace

```
  - Checker produces a checkerboard for a mid-tone block;
```

with

```
  - Checker, Bayer and Atkinson pattern a middle color, keep an image's darkest color dark
    and its lightest light, and leave an image of one color flat;
```

- [ ] **Step 7: Update `docs/styles.md`**

Directly above the heading `### The example used below`, add this subsection:

````
### Tone

Checker, Bayer and Atkinson do not compare brightness with the threshold directly. They
first turn brightness into a **tone** from 0 to 1 that runs through the image's own range:
the darkest brightness in the image is 0, the threshold is 0.5 and the lightest brightness
is 1.

- At or below the threshold: `0.5 × (brightness − darkest) / (threshold − darkest)`, or 0
  when the threshold is not above the darkest.
- Above the threshold: `0.5 + 0.5 × (brightness − threshold) / (lightest − threshold)`.

An image's darkest color is therefore always tone 0 and its lightest always tone 1, as long
as the threshold lies between them. Outlines and highlights stay whole, whatever the
threshold is. For an animated GIF the darkest and lightest brightness are taken from all
frames together.

For the example below the darkest brightness is 25 and the lightest 240.

````

Replace the whole `## Checker` section, from its heading to the line above `## Bayer`, with:

````
## Checker

Solid, with mid-tones turned into a checkerboard. It gives three apparent tones: dark, a
50% pattern, and light.

A pixel becomes the second color if its tone is above 0.25 where `x + y` is even, and above
0.75 where it is odd. The effect:

- tone above 0.75: always the second color;
- tone 0.25 or below: always the first color;
- anything in between: second color on even pixels and first on odd ones, which is a
  checkerboard.

```
    ######
   ##....##
  #........#
 #..........#
##..........##
#............#
#............#
#.#.#.#.#.#.##
##.#.#.#.#.#.#
###.#.#.#.#.##
 #.........##
  #.....#.##
   ###.#.##
    ######
```

The stripe sits in the middle band, so it becomes the pattern. So does the dimmest shading
at the lower right of the body. The outline is the image's darkest color, tone 0, and stays
solid.

The pattern is tied to pixel position, not to the image, so it does not shimmer between the
frames of an animation.

````

In the `## Bayer` section, change the sentence `Each pixel's cut-off is shifted by an amount taken from a repeating 4×4 grid:` to `Each pixel's tone is compared with a cut-off taken from a repeating 4×4 grid:`. Then replace everything from the paragraph that starts `For the value` down to the paragraph that ends `picks up a few dark pixels.` (the formula, the example and the paragraph after it) with:

````
For the value `b` at the pixel's position in the grid (`x mod 4`, `y mod 4`), the pixel is
the second color if its tone is above `(b + 0.5) / 16`. That gives 16 evenly spaced cut-offs,
from 1/32 to 31/32.

```
    ######
   ##....##
  #........#
 #......#.#.#
##..........##
#.........#.##
#............#
###.#.#.###.##
##.#.#.#.#.#.#
###.#.#.#.####
 #..........#
  #.#.#.#.##
   ##....##
    ######
```

More of the image is touched than in Checker: the stripe is patterned, and the dimmer parts
of the body pick up a few dark pixels. The outline stays solid, because the image's darkest
color has tone 0 and no cut-off is that low.
````

In the `## Atkinson` section, replace steps 1 and 2 of the numbered list with

```
1. Every pixel starts with a working value of `tone × 255`. The threshold is then at 127.5,
   the middle of the range.
2. If the pixel's working value is above 127.5 it becomes the second color (treated as 255);
   otherwise the first (treated as 0).
```

and replace the example block and the paragraph after it (`The stripe is close to the threshold ... stays flat.`) with

````
```
    ######
   ##....##
  #........#
 #..........#
##..........##
#............#
#..........#.#
###.##########
#.##..#..##.##
##.##.###.####
 #..........#
  #........#
   ##.#..##
    ######
```

The stripe is close to the threshold, so it breaks into a scatter. The body is far from it
and stays almost flat.
````

- [ ] **Step 8: Check the examples against the code**

Run this from the repository root. It prints the preview ball in the three styles; each must match the block now in `docs/styles.md` character for character.

```bash
node --input-type=module -e "
import { analyze, mask } from './src/lib/bitify.js';
const s = 14, data = new Uint8ClampedArray(s * s * 4);
for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
  const r = Math.hypot(x - 6.5, y - 6.5);
  if (r > 7) continue;
  const shade = Math.hypot(x - 4, y - 3) * 9;
  const l = Math.round(r > 6 ? 25 : y >= 7 && y <= 9 ? 95 - shade * 0.4 : 240 - shade);
  data.set([l, l, l, 255], (y * s + x) * 4);
}
const ball = analyze({ width: s, height: s, data });
console.log('auto', ball.auto, 'darkest', ball.lo, 'lightest', ball.hi);
for (const style of ['checker', 'bayer', 'atkinson']) {
  const m = mask(ball, style);
  console.log('\n' + style);
  for (let y = 0; y < s; y++) console.log([...m.slice(y * s, (y + 1) * s)].map(v => ' #.'[v]).join('').trimEnd());
}
"
```

Expected first line: `auto 81 darkest 25 lightest 240`. If a block differs, the code is the truth: fix the document, not the code, and say so in the task report.

- [ ] **Step 9: Commit**

```bash
git add src/lib/bitify.js src/lib/bitify.test.js docs/superpowers/specs/2026-10-06-bitify-app-design.md docs/styles.md
git commit -m "fix: Checker, Bayer and Atkinson keep an image's darkest and lightest colors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The Cutout style in the conversion module

Cutout fills bright parts, leaves dark parts dark, cuts the boundaries between parts of the same tone in the opposite tone, and gives a dark part a light rim where it meets empty space. This task adds it to `mask` and its Auto seam strength to `analyze` and `unify`. It is not in the interface yet; Task 4 does that.

**Files:**
- Modify: `src/lib/bitify.js` (constants, a new `seamStrength` function, `analyze`, `unify`, `mask`)
- Test: `src/lib/bitify.test.js` (a new `cutout` block; the `analyze`, `mask` and `unify` blocks)
- Modify: `docs/superpowers/specs/2026-10-06-bitify-app-design.md` (Styles, Threshold, Animated GIFs, Testing)
- Modify: `docs/styles.md` (intro, The threshold, a new Cutout section, Choosing between them)

**Interfaces:**
- Consumes: `MIN_EDGE` (Task 1); `lo` and `hi` on the analysis, and the `shared` object in `unify` (Task 2).
- Produces: `analyze(...).autoSeam`, a number from 24 to 255, shared across frames by `unify`. `mask(analysis, 'cutout', threshold)`, where `threshold` is the brightness cut (null for Auto, which is `analysis.auto`). `autoThreshold(analysis, 'cutout')` already returns `analysis.auto`; it does not change. Task 4 relies on the style key `cutout`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/bitify.test.js`, in the `analyze` test named `survives an image with no solid pixels`, add `'cutout'` to the list of styles:

```js
    for (const style of ['cutout', 'solid', 'checker', 'bayer', 'atkinson', 'silhouette']) {
      expect(show(mask(img, style), 2)).toEqual(['  ', '  ']);
```

In the `mask` test named `keeps empty pixels empty and fills the rest, on a large non-square image`, replace the loop header and the line under it

```js
    for (const style of ['solid', 'checker', 'bayer', 'atkinson', 'silhouette']) {
      const m = mask(img, style);
```

with

```js
    for (const style of ['cutout', 'solid', 'checker', 'bayer', 'atkinson', 'silhouette']) for (const t of [null, 1, 254]) {
      const m = mask(img, style, t);
```

Add this whole block directly above `describe('unify', ...)`:

```js
describe('cutout', () => {
  // A 7x7 body on a transparent canvas, with a 3x3 part in its middle.
  const sprite = (body, part) => image([
    '         ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    '         ',
  ], { a: grey(body), b: grey(part) });

  it('fills bright parts and leaves dark parts dark, with no outline', () => {
    expect(show(mask(sprite(200, 120), 'cutout'), 9)).toEqual([
      '         ',
      ' ....... ',
      ' ....... ',
      ' ..###.. ',
      ' ..###.. ',
      ' ..###.. ',
      ' ....... ',
      ' ....... ',
      '         ',
    ]);
  });

  it('cuts a dark seam, one pixel wide, between two light parts', () => {
    expect(show(mask(sprite(200, 120), 'cutout', 100), 9)).toEqual([
      '         ',
      ' ....... ',
      ' ....... ',
      ' ..###.. ',
      ' ..#.#.. ',
      ' ..###.. ',
      ' ....... ',
      ' ....... ',
      '         ',
    ]);
  });

  it('gives a dark part a light rim, and a light seam between two dark parts', () => {
    expect(show(mask(sprite(60, 10), 'cutout', 100), 9)).toEqual([
      '         ',
      ' ....... ',
      ' .#####. ',
      ' .#...#. ',
      ' .#.#.#. ',
      ' .#...#. ',
      ' .#####. ',
      ' ....... ',
      '         ',
    ]);
  });

  it('ignores a shading step that is not stronger than the seam strength', () => {
    const img = sprite(200, 185);
    expect(img.autoSeam).toBe(24);
    expect(count(mask(img, 'cutout', 100), 1)).toBe(0);
  });

  it('keeps a dark outline around a light part', () => {
    const img = image([
      '       ',
      ' kkkkk ',
      ' kaaak ',
      ' kaaak ',
      ' kaaak ',
      ' kkkkk ',
      '       ',
    ], { k: grey(20), a: grey(220) });
    expect(show(mask(img, 'cutout'), 7)).toEqual([
      '       ',
      ' ##### ',
      ' #...# ',
      ' #...# ',
      ' #...# ',
      ' ##### ',
      '       ',
    ]);
  });

  it('never cuts a light pixel on the silhouette', () => {
    const ring = (edge, inside) => image([
      '       ',
      ' eeeee ',
      ' eiiie ',
      ' eiiie ',
      ' eiiie ',
      ' eeeee ',
      '       ',
    ], { e: grey(edge), i: grey(inside) });
    // the darker light color is on the outside: it would be a seam, but it is the silhouette
    expect(count(mask(ring(180, 250), 'cutout', 100), 1)).toBe(0);
    // the same two colors the other way round: the darker one is inside, so it is cut
    expect(show(mask(ring(250, 180), 'cutout', 100), 7)).toEqual([
      '       ',
      ' ..... ',
      ' .###. ',
      ' .#.#. ',
      ' .###. ',
      ' ..... ',
      '       ',
    ]);
  });

  it('rims an image only when it has empty pixels', () => {
    const flat = image(['aaa', 'aaa', 'aaa'], { a: grey(30) });
    expect(show(mask(flat, 'cutout', 100), 3)).toEqual(['###', '###', '###']);
    const cut = image([' aa', 'aaa', 'aaa'], { a: grey(30) });
    expect(show(mask(cut, 'cutout', 100), 3)).toEqual([' ..', '.#.', '...']);
  });

  it('auto seam strength separates part boundaries from shading inside one tone', () => {
    // light side: a step of 30 (shading) and a step of 70 (a part); the jump down to 10 is the tone split
    const img = image(['aabbccdd'], { a: grey(250), b: grey(220), c: grey(150), d: grey(10) });
    expect([img.auto, img.autoSeam]).toEqual([10, 30]);
    expect(show(mask(img, 'cutout'), 8)).toEqual(['....#.##']);
  });

  it('keeps its seam strength when the threshold is set by hand', () => {
    const img = image(['aabbccdd'], { a: grey(250), b: grey(220), c: grey(150), d: grey(10) });
    // cut at 230 the dark side holds steps of 70 and 140; picked again from those, the strength
    // would be 70 and the step of 70 would no longer be a seam
    expect(show(mask(img, 'cutout', 230), 8)).toEqual(['..##.#.#']);
  });
});
```

Inside `describe('unify', ...)`, add this test after the last one:

```js
  it('shares the seam strength, picked after the shared brightness cut', () => {
    const a = image(['aabb'], { a: grey(250), b: grey(200) }), b = image(['aabb'], { a: grey(250), b: grey(150) }), c = image(['ab  '], { a: grey(5), b: grey(5) });
    expect([a.autoSeam, b.autoSeam, c.autoSeam]).toEqual([24, 24, 24]); // alone, each splits its own two colors
    unify([a, b, c]);
    // together the cut falls under all four light colors, so their steps of 50 and 100 are seams to rank
    expect([a.autoSeam, b.autoSeam, c.autoSeam]).toEqual([50, 50, 50]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/bitify.test.js`
Expected: the nine `cutout` tests and the new `unify` test fail. Before the change `mask` treats the unknown style `cutout` as Solid and `autoSeam` is `undefined`, so for example `ignores a shading step` fails with `expected undefined to be 24`.

- [ ] **Step 3: Add the seam strength**

In `src/lib/bitify.js`, add a constant under `NEIGHBOURS`:

```js
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const AROUND = [...NEIGHBOURS, [1, 1], [1, -1], [-1, 1], [-1, -1]]; // the four neighbours first
```

Replace the comment above `analyze`

```js
// Takes an ImageData-shaped object. Done once per image; `mask` reuses the result.
// `auto` is the Auto threshold for the brightness styles, `autoLine` the one for Lines.
// `lo` and `hi` are the darkest and lightest brightness among the solid pixels.
```

with this function and comment:

```js
// Cutout's Auto seam strength for one image or all the frames of an animation: Otsu on the
// differences between adjacent solid pixels that are on the same side of brightness `t`. The
// jumps from one side to the other are left out; the tone split already shows those.
function seamStrength(frames, t) {
  const hist = new Array(256).fill(0);
  for (const { w, h, data, lum } of frames) {
    const solid = p => data[p * 4 + 3] >= ALPHA_CUT, same = (p, q) => solid(q) && (lum[p] > t) === (lum[q] > t);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (!solid(p)) continue;
      if ((p % w) + 1 < w && same(p, p + 1)) hist[diff(data, i, i + 4)]++;
      if (p + w < w * h && same(p, p + w)) hist[diff(data, i, i + w * 4)]++;
    }
  }
  hist[0] = 0; // identical neighbours are not seams
  return Math.max(MIN_EDGE, otsu(hist, 0));
}

// Takes an ImageData-shaped object. Done once per image; `mask` reuses the result.
// `auto` is the Auto threshold for the brightness styles, `autoLine` the one for Lines and
// `autoSeam` the seam strength for Cutout.
// `lo` and `hi` are the darkest and lightest brightness among the solid pixels.
```

Replace the last line of `analyze`

```js
  return { w, h, data, lum, hasAlpha, lo, hi, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
```

with

```js
  const img = { w, h, data, lum, hasAlpha, lo, hi, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
  img.autoSeam = seamStrength([img], img.auto);
  return img;
```

In `unify`, replace the first three lines of the `shared` object

```js
  const shared = {
    auto: otsu(hist, 127),
    autoLine: Math.max(MIN_EDGE, otsu(edges, 0)),
```

with

```js
  const auto = otsu(hist, 127);
  const shared = {
    auto,
    autoLine: Math.max(MIN_EDGE, otsu(edges, 0)),
    autoSeam: seamStrength(frames, auto), // picked after the shared cut, which decides the tones
```

- [ ] **Step 4: Add the style to `mask`**

In `mask`, directly above the comment that starts `// Brightness as a tone from 0 to 1`, add:

```js
  if (style === 'cutout') {
    // Bright parts are filled, dark parts are left dark, and the boundaries between parts of the
    // same tone are cut in the other tone. 0 empty, 1 dark, 2 light; outside the canvas is
    // empty only for sprites, as in Lines.
    // ponytail: builds a small array per pixel; fine for sprites, flatten it if photos get slow
    const tone = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? (img.hasAlpha ? 0 : -1) : !solid(y * w + x) ? 0 : lum[y * w + x] > t ? 2 : 1);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      const own = tone(x, y);
      if (!own) continue;
      const around = AROUND.map(([dx, dy]) => tone(x + dx, y + dy));
      // a seam: the darker side of a strong change between two pixels of the same tone
      const seam = NEIGHBOURS.some(([dx, dy], k) => {
        const q = p + dy * w + dx;
        return around[k] === own && diff(data, p * 4, q * 4) > img.autoSeam && (lum[p] < lum[q] || (lum[p] === lum[q] && p < q));
      });
      // a light pixel on the silhouette is never cut, so seams do not eat into the shape
      if (own === 2) m[p] = seam && !around.includes(0) ? 1 : 2;
      // a dark pixel on the silhouette with no light pixel around it becomes a light rim
      else m[p] = seam || (around.slice(0, 4).includes(0) && !around.includes(2)) ? 2 : 1;
    }
    return m;
  }

```

Notes for the implementer:
- `t` is already the brightness cut for this style, because `autoThreshold` returns `img.auto` for every style except Lines.
- `around[k] === own` is only true for a neighbour inside the canvas, so `q` is always a valid pixel when it is read.
- The seam strength is always `img.autoSeam`, also when the threshold is set by hand. That is deliberate (the spec, under Auto) and pinned by the test `keeps its seam strength when the threshold is set by hand`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/bitify.test.js`
Expected: `Tests  40 passed (40)`

Then run everything: `npm test`
Expected: every test file passes.

- [ ] **Step 6: Update the app spec**

In `docs/superpowers/specs/2026-10-06-bitify-app-design.md`, in the table under `### Styles`, add this row as the first row, above Lines:

```
| **Cutout** | A pixel brighter than the threshold is light, every other pixel dark. Then, using those tones: a pixel on the darker side of a change stronger than the seam strength, between two pixels of the same tone, takes the opposite tone; and a dark pixel that touches empty space, with no light pixel among its eight neighbours, becomes light. Dark is first color, light is second. |
```

Directly above the paragraph that starts `Details of Lines:`, add

```
Details of Cutout:

- It fills bright parts, leaves dark parts dark and cuts parts apart, in the style of the
  game End of End. It draws no outline around a light part.
- A light pixel that touches empty space, diagonals included, is never cut, so seams do not
  eat into the silhouette.
- The difference between two pixels, the tie on equal brightness and the rule for the
  canvas edge are the ones Lines uses.
- The seam strength is always automatic. The threshold only moves the brightness cut.

Known limits of Cutout: a flat shading step, such as a shadow drawn in one darker color, is
cut like a part boundary; a dark part two pixels wide or less becomes all rim; art that is
already dithered becomes busy.

```

Under `### Threshold`, replace

```
- In Solid, Checker, Bayer and Atkinson it is the brightness cut-off.
```

with

```
- In Cutout, Solid, Checker, Bayer and Atkinson it is the brightness cut-off.
```

and, directly above the line `A manual value applies to every image.`, add

```
- For Cutout's seam strength, on the histogram of non-zero differences between adjacent
  non-empty pixels of the same tone, with tones split at the image's Auto brightness
  cut-off. Never below 24. It is taken at the Auto cut-off also when the threshold is set
  by hand, so seams do not jump while the slider is dragged.

```

Under `## Animated GIFs`, replace `one Auto threshold and one brightness range, taken from all its frames together` with `one Auto threshold, one seam strength and one brightness range, taken from all its frames together`.

Under `## Testing`, directly above the line that starts `  - Silhouette fills everything;`, add

```
  - Cutout fills a bright part and leaves a dark one dark, cuts a one-pixel seam between
    two parts of the same tone, rims a dark part on the silhouette, keeps a dark outline
    around a light part, never cuts a light pixel on the silhouette, and rims only images
    that have empty pixels;
```

- [ ] **Step 7: Update `docs/styles.md`**

In the first line of the file, change `Bitify's six styles` to `Bitify's seven styles`.

Under `## What all styles share`, change `from 0 to 255. It is used only by Lines.` to `from 0 to 255. It is used by Lines and Cutout.`

Under `### The threshold`, replace

```
- In **Solid, Checker, Bayer and Atkinson** it is the brightness cut-off between dark and light.
```

with

```
- In **Cutout, Solid, Checker, Bayer and Atkinson** it is the brightness cut-off between dark
  and light.
```

and, directly above the line `A manual threshold applies the same number to every image.`, add

```
- Cutout also needs a **seam strength**, which is always automatic: Otsu on the differences
  between adjacent solid pixels of the same tone, with tones split at the image's Auto
  brightness cut-off, and never below 24. The large jumps from light to dark are left out
  because the tone split already shows them; with them in, the value comes out too high to
  find the boundaries inside a dark or a light area.

```

At the end of `### The example used below`, change

```
Auto, which for this image is 81 for brightness and 52 for Lines.
```

to

```
Auto, which for this image is 81 for brightness, 52 for Lines and 24 for Cutout's seams.
```

(If the sentence is wrapped differently in the file, keep its wrapping and change only the numbers' clause.)

Directly above the heading `## Lines`, add this section:

````
## Cutout

Filled shapes with their parts cut apart, after the game End of End. Bright parts are
filled, dark parts are left dark, and what separates two parts of the same tone is a thin
cut in the other tone. No outline is drawn around a light part.

It works in three steps. Every test uses the tones from step 1, not the results of the
later steps.

1. **Tone.** A solid pixel brighter than the threshold is light; every other solid pixel is
   dark. This is Solid.
2. **Seams.** A pixel is a seam if one of its four neighbours has the same tone, differs
   from it by more than the seam strength, and this pixel is the darker of the two. A seam
   takes the opposite tone: a dark cut inside a light area, a light one inside a dark area.
3. **Rim.** A dark pixel that touches empty space in one of the four directions, and has no
   light pixel among its eight neighbours, becomes light. That gives a dark part an edge
   where it would otherwise have none.

Dark pixels get the first color and light pixels the second.

```
    ######
   ##....##
  #........#
 #..........#
##..........##
#............#
#............#
.############.
.############.
..##########..
 #..........#
  #........#
   ##....##
    ######
```

The body is brighter than 81, so it is filled. The stripe is darker, so it is left dark.
The original's own dark outline stays dark around the body: it has light pixels beside it,
so it is not a rim. At the two ends of the stripe the outline and the stripe are both dark
and differ by more than 24, so the outline pixels there are seams and turn light. They
close the shape where the dark stripe would otherwise run into empty space.

Details:

- **The silhouette is never cut.** A light pixel that touches empty space, diagonals
  included, is never a seam. Without this, a sprite whose edge is a slightly darker shade
  would lose its outer ring of pixels.
- **Equal brightness, and the canvas edge,** work as in Lines: on a tie the pixel earlier in
  reading order is the darker one, and the canvas edge counts as empty only if the image
  has at least one empty pixel.
- **Threshold.** It moves the brightness cut of step 1: lower values fill more of the
  sprite, higher values leave more of it dark. It does not change the seam strength.

Limits:

- A flat shading step, such as a shadow drawn in one darker color, is cut like a part
  boundary.
- A dark part two pixels wide or less becomes all rim.
- Art that is already dithered becomes busy.

````

Under `## Choosing between them`, add this as the first row of the table, above the Lines row:

```
| Filled shapes with their parts cut apart, the End of End look | Cutout |
```

- [ ] **Step 8: Check the example against the code**

Run from the repository root; the block must match the Cutout example now in `docs/styles.md` character for character.

```bash
node --input-type=module -e "
import { analyze, mask } from './src/lib/bitify.js';
const s = 14, data = new Uint8ClampedArray(s * s * 4);
for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
  const r = Math.hypot(x - 6.5, y - 6.5);
  if (r > 7) continue;
  const shade = Math.hypot(x - 4, y - 3) * 9;
  const l = Math.round(r > 6 ? 25 : y >= 7 && y <= 9 ? 95 - shade * 0.4 : 240 - shade);
  data.set([l, l, l, 255], (y * s + x) * 4);
}
const ball = analyze({ width: s, height: s, data });
console.log('auto', ball.auto, 'autoLine', ball.autoLine, 'autoSeam', ball.autoSeam);
const m = mask(ball, 'cutout');
for (let y = 0; y < s; y++) console.log([...m.slice(y * s, (y + 1) * s)].map(v => ' #.'[v]).join('').trimEnd());
"
```

Expected first line: `auto 81 autoLine 52 autoSeam 24`. If the block differs, the code is the truth: fix the document and say so in the task report.

- [ ] **Step 9: Commit**

```bash
git add src/lib/bitify.js src/lib/bitify.test.js docs/superpowers/specs/2026-10-06-bitify-app-design.md docs/styles.md
git commit -m "feat: Cutout style, filled shapes with their parts cut apart

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cutout in the interface, as the default

**Files:**
- Modify: `src/Dock.svelte` (the `STYLES` list, the help text)
- Modify: `src/App.svelte` (the starting style)
- Modify: `src/app.css` (the two `.menu` column counts)
- Modify: `docs/superpowers/specs/2026-10-06-bitify-app-design.md` (Advanced panel, Responsive behavior, Styles)
- Modify: `docs/styles.md` (which style is the default)
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: the style key `cutout` in `mask` (Task 3).
- Produces: nothing later tasks use.

Interface behavior has no automated tests in this project. This task is checked in a browser, at desktop width and at phone width.

- [ ] **Step 1: Add the style to the dock**

In `src/Dock.svelte`, add Cutout as the first entry of `STYLES`:

```js
  const STYLES = [
    ['cutout', 'Cutout'],
    ['lines', 'Lines'],
    ['solid', 'Solid'],
    ['checker', 'Checker'],
    ['bayer', 'Bayer'],
    ['atkinson', 'Atkinson'],
    ['silhouette', 'Silhouette'],
  ];
```

In the help tooltip in the same file, add a branch for Cutout between the Lines branch and the final `{:else}`, so that the block reads:

```svelte
              {#if style === 'silhouette'}
                Silhouette ignores the threshold.
              {:else if threshold === null}
                Auto picks the best value for each image.
              {:else if style === 'lines'}
                Color changes stronger than <b>{threshold}</b> become lines.
              {:else if style === 'cutout'}
                Parts brighter than <b>{threshold}</b> are filled.
              {:else}
                Pixels brighter than <b>{threshold}</b> turn light.
              {/if}
```

- [ ] **Step 2: Make it the default**

In `src/App.svelte`, change

```js
  let style = $state('lines');
```

to

```js
  let style = $state('cutout');
```

- [ ] **Step 3: Give the list of styles room for seven**

In `src/app.css`, in the `.menu` rule, change

```css
  grid-template-columns: repeat(6, minmax(0, 1fr));
```

to

```css
  grid-template-columns: repeat(7, minmax(0, 1fr));
```

and in the `@media (max-width: 520px)` block near the end of the file, change

```css
  .menu { right: 0; grid-template-columns: repeat(3, minmax(0, 1fr)); }
```

to

```css
  .menu { right: 0; grid-template-columns: repeat(4, minmax(0, 1fr)); }
```

- [ ] **Step 4: Run the unit tests and the build**

Run: `npm test`
Expected: every test file passes.

Run: `npm run build`
Expected: the build finishes with no errors and no new warnings. The line `no Svelte config found` is normal.

- [ ] **Step 5: Check it in a browser at desktop width**

Start the dev server with the preview tool, configuration `bitify` from `.claude/launch.json` (never with Bash). If the branch was just checked out, restart the server first: it can keep serving old CSS.

With no images added, the empty screen shows the logo as a live example. Open Advanced and check each of these, reading the page rather than guessing from a screenshot:

1. The style button reads `Style Cutout`.
2. Open the list of styles. It has seven entries in one row, in this order: Cutout, Lines, Solid, Checker, Bayer, Atkinson, Silhouette. Run this in the page; it must return `[7, 7, true]`:

```js
(() => { const menu = document.querySelector('.menu'), items = [...menu.querySelectorAll('.preset')];
  return [items.length, getComputedStyle(menu).gridTemplateColumns.split(' ').length, items.every(b => b.scrollWidth <= b.clientWidth && b.getBoundingClientRect().right <= innerWidth)]; })()
```

3. For each of the seven styles in turn: choose it, note the example image, press Swap, and confirm the example image changes. Press Swap again and confirm it returns to what it was. This is the rule the user asked for: Swap inverts every style.
4. Choose Cutout, move the threshold slider, open Help. It reads `Parts brighter than N are filled.` with the slider's number. Press Auto; it reads `Auto picks the best value for each image.`
5. Add a sprite with a transparent background and an animated GIF (drop or the picker). Both show in Cutout; the GIF plays without pixels flickering between the two colors. Download each and confirm the files are named `…-1bit.png` and `…-1bit.gif`.
6. The browser console has no errors.

- [ ] **Step 6: Check it at phone width**

Resize the preview to the mobile preset (375 wide, touch) and reload.

1. Open Advanced, then the list of styles. Seven entries in a grid four wide: four on the first row, three on the second. The same snippet as above must return `[7, 4, true]`.
2. The list does not run off either side of the screen, and the page has no horizontal scroll: `document.documentElement.scrollWidth <= innerWidth` is `true`.
3. Choosing a style closes the list and the example redraws.

Reset the preview to the desktop preset when done.

- [ ] **Step 7: Update the documents**

In `docs/superpowers/specs/2026-10-06-bitify-app-design.md`:

- Under `**Advanced panel.**`, replace

```
  opens the list of the six styles above the strip, each with the same live preview and its
  name, in one row of six. Choosing a style closes the list. So does a press outside it, or
```

with

```
  opens the list of the seven styles above the strip, each with the same live preview and
  its name, in one row of seven. Choosing a style closes the list. So does a press outside
  it, or
```

- In the `520px and below` row of the table under `### Responsive behavior`, replace `Its list of styles is a 3×2 grid as wide as the strip.` with `Its list of styles is a grid four wide, as wide as the strip.`
- In the table under `### Styles`, change `| **Cutout** |` to `| **Cutout** (default) |` and `| **Lines** (default) |` to `| **Lines** |`.

In `docs/styles.md`:

- In the `## Cutout` section, change its first sentence `Filled shapes with their parts cut apart, after the game End of End.` to `The default. Filled shapes with their parts cut apart, after the game End of End.`
- In the `## Lines` section, change `The default. It draws an outline around every part of a sprite, not only around its` to `It draws an outline around every part of a sprite, not only around its`. Keep the rest of the paragraph and re-wrap nothing else.

In `README.md`, replace

```
- Six styles: Lines (outlines each part of a sprite, not only its silhouette), Solid, Checker, Bayer, Atkinson and Silhouette.
```

with

```
- Seven styles: Cutout (filled shapes with their parts cut apart, after the game End of End), Lines (outlines each part of a sprite), Solid, Checker, Bayer, Atkinson and Silhouette.
```

In `CLAUDE.md`, replace

```
There are six styles; the default, Lines, outlines each part of a sprite and not only its silhouette.
```

with

```
There are seven styles; the default, Cutout, fills the bright parts of a sprite and cuts its parts apart, in the style of the game End of End.
```

and `docs/styles.md explains how each of the six styles works` with `docs/styles.md explains how each of the seven styles works`.

Then search for anything left over:

Run: `git grep -n -i "six styles\|six conversion\|row of six\|3×2 grid" -- . ":!docs/superpowers/plans" ":!docs/superpowers/specs/2026-10-07-conversion-styles-design.md"`
Expected: no output. Fix any line it prints.

- [ ] **Step 8: Commit**

```bash
git add src/Dock.svelte src/App.svelte src/app.css docs/superpowers/specs/2026-10-06-bitify-app-design.md docs/styles.md README.md CLAUDE.md
git commit -m "feat: Cutout in the style list, as the default style

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the last task

- `npm test` and `npm run build` both pass.
- `git log --oneline main..HEAD` shows five commits: the documents, then one per task.
- Do not push and do not merge. Report to the user and use superpowers:finishing-a-development-branch.
