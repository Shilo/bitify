// Builds the frozen Keep real-art cohort from already-downloaded sources (curation only; runs no weighting candidate).
// Usage: node build-cohort.mjs <rawRoot>
// Copies exact source PNG bytes, or makes integer RGBA crops verified pixel-exact against the decoded source.
// Synthetic counterexamples come from the existing fixture generators (fixture functions only).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { alphaStats } from './stats.mjs';
import { fixtures as spikeFixtures } from '../../keep-alpha-weighting-spike/experiment.mjs';
import { heldOutFixtures } from '../../keep-alpha-weighting-review/fixtures.mjs';
const sharp = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const raw = path.resolve(process.argv[2]);
const outRoot = fileURLToPath(new URL('../cohort/', import.meta.url));
const RETRIEVED = '2026-10-15';
const CC0 = ['CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'];
const OGA = 'https://opengameart.org/sites/default/files/';

const S = {
  kParticle: { title: 'Particle Pack (1.1)', author: 'Kenney (Kenney Vleugels, kenney.nl)', sourceUrl: 'https://kenney.nl/assets/particle-pack', fileUrl: 'https://kenney.nl/media/pages/assets/particle-pack/f8fe0f8cb8-1677578741/kenney_particle-pack.zip', license: CC0, archive: 'kenney_particle-pack.zip' },
  kSmoke: { title: 'Smoke Particles', author: 'Kenney (Kenney Vleugels, kenney.nl)', sourceUrl: 'https://kenney.nl/assets/smoke-particles', fileUrl: 'https://kenney.nl/media/pages/assets/smoke-particles/23249a0d35-1677695171/kenney_smoke-particles.zip', license: CC0, archive: 'kenney_smoke-particles.zip' },
  para: { title: 'Animated particle effects #2', author: 'para', sourceUrl: 'https://opengameart.org/content/animated-particle-effects-2', fileUrl: OGA + 'para_CC0_particlefx-2.zip', license: CC0, archive: 'para_CC0_particlefx-2.zip', stated: 'Sheets 1024x1024 (blood hits 512x512); cell 128x128; frame rate 30; 64 frames.' },
  rubberduck: { title: '5x special effects - 2D', author: 'rubberduck', sourceUrl: 'https://opengameart.org/content/5x-special-effects-2d', fileUrl: OGA + '2d-special-effects.zip', license: CC0, archive: '2d-special-effects.zip', stated: 'Made with GIMP; 32x32 and 64x64 effects; XCF sources included. No frame duration stated.' },
  cethiel: { title: 'Orbs Collection', author: 'Cethiel', sourceUrl: 'https://opengameart.org/content/orbs-collection', fileUrl: OGA + 'Orb_Collection.zip', license: CC0, archive: 'Orb_Collection.zip' },
  prime8: { title: 'Trees Top-down fake shadow', author: 'Prime_8', sourceUrl: 'https://opengameart.org/content/trees-top-down-fake-shadow', fileUrl: OGA + 'RE_03.png', license: CC0, stated: 'Each tree has a soft dark shadow/border; the shadow is the only part with less than full alpha.' },
  bluce: { title: 'Orbs', author: 'Bluce', sourceUrl: 'https://opengameart.org/content/orbs', fileUrl: OGA + 'Orbs.png', license: ['CC-BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/'], stated: 'Author: "I would just appreciate if you credited me in your work!" Sheet includes drop shadows.' },
  torr: { title: 'transparent clouds and shadows', author: 'torr-penn', sourceUrl: 'https://opengameart.org/content/transparent-clouds-and-shadows', license: ['CC-BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'], stated: 'Clouds made with GIMP, drawn over separate shadow sprites (used in the game God of Wind). Page says attribution notice is optional; credited anyway.' },
  jamgo: { title: 'Shadow for LPC Sprite', author: 'Dr. Jamgo', sourceUrl: 'https://opengameart.org/content/shadow-for-lpc-sprite', fileUrl: OGA + 'lpc_shadow.png', license: CC0 },
  wisedawn: { title: '25 CC0 Top Down Islands', author: 'Wisedawn', sourceUrl: 'https://opengameart.org/content/25-cc0-top-down-islands', fileUrl: OGA + 'isle_3.png', license: CC0 },
  fzeeshan: { title: 'Energy Sprite Sheets', author: 'fzeeshan', sourceUrl: 'https://opengameart.org/content/energy-sprite-sheets', fileUrl: OGA + 'energy1_0.png', license: CC0 },
  davididev: { title: 'Bubble Particle', author: 'davididev', sourceUrl: 'https://opengameart.org/content/bubble-particle', fileUrl: OGA + 'Bubble.png', license: CC0, stated: 'Animation intended to ping-pong.' },
  amon: { title: 'Magic Orbs', author: 'Amon (www.amon.co)', sourceUrl: 'https://opengameart.org/content/magic-orbs', fileUrl: OGA + 'balls.png', license: ['CC-BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/'] },
  tango: { title: 'Tango Icon Theme 0.8.90', author: 'The Tango Desktop Project (Ulisse Perusin, Steven Garrity, Lapo Calamandrei, Ryan Collier, Rodney Dawes, Andreas Nilsson, Tuomas Kuosmanen, Garrett LeSage, Jakub Steiner)', sourceUrl: 'https://tango.freedesktop.org/', fileUrl: 'https://tango.freedesktop.org/releases/tango-icon-theme-0.8.90.tar.gz', license: ['Public Domain (COPYING: "The icons in this repository are herefore released into the Public Domain.")', 'https://creativecommons.org/publicdomain/mark/1.0/'], archive: 'tango-icon-theme-0.8.90.tar.gz' },
  twemoji: { title: 'Twemoji v15.1.0', author: 'Twitter, Inc and other contributors (jdecked/twemoji)', sourceUrl: 'https://github.com/jdecked/twemoji', license: ['CC-BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'] },
};

const K = '1/x/PNG (Transparent)/', TG = '16/x/tango-icon-theme-0.8.90/32x32/', TW = 'https://raw.githubusercontent.com/jdecked/twemoji/v15.1.0/assets/72x72/';
const cell = (i, w, h, cols) => ({ x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h });
const A = [
  // 1 glows / halos
  { id: 'glow-orb-red', cat: 'glow', s: 'cethiel', src: '15/x/Orb_01.png', arch: 'Orb_01.png', why: 'Opaque-ish orb core with a wide soft outer glow; glow colour must survive a small cap.' },
  { id: 'glow-light-64', cat: 'glow', s: 'rubberduck', src: '14/x/light_glow_effect/light_glow_08.png', arch: 'light_glow_effect/light_glow_08.png', why: 'Small 64px GIMP light glow with no opaque pixel; cyan core fading to soft halo.' },
  { id: 'glow-flash-yellow', cat: 'glow', s: 'kSmoke', src: '2/x/PNG/Flash/flash02.png', arch: 'PNG/Flash/flash02.png', why: 'Bright muzzle/explosion flash; opaque centre with warm soft halo.' },
  { id: 'glow-lens-flare', cat: 'glow', s: 'kParticle', src: K + 'flare_01.png', arch: 'PNG (Transparent)/flare_01.png', why: 'Grayscale lens flare: tiny bright core, long faint streak; nearly all mass is faint alpha.' },
  // 2 shadows
  { id: 'shadow-tree-topdown', cat: 'shadow', s: 'prime8', src: '17/RE_03.png', arch: null, why: 'Opaque foliage over an authored soft dark drop shadow; shadow is the only partial-alpha region.' },
  { id: 'shadow-glass-orb', cat: 'shadow', s: 'bluce', src: '7/Orbs.png', crop: { x: 4, y: 147, w: 845, h: 965 }, arch: null, why: 'Glossy red orb with a separate soft contact shadow; the artist exported every pixel below alpha 255.' },
  { id: 'shadow-cloud-cast', cat: 'shadow', s: 'torr', src: '3/original_shadow_0.png', file: OGA + 'original_shadow_0.png', arch: null, why: 'Cast cloud shadow: one RGB with varying alpha only, meant to darken terrain under the cloud.' },
  { id: 'shadow-lpc-character', cat: 'shadow', s: 'jamgo', src: '18/lpc_shadow.png', crop: { x: 256, y: 0, w: 64, h: 64 }, arch: null, why: 'Flat single-colour translucent character shadow for LPC sprites (sheet cell 4, cast row).' },
  // 3 antialiased edges
  { id: 'aa-twemoji-fire', cat: 'antialiased', s: 'twemoji', src: '21/1f525.png', file: TW + '1f525.png', arch: null, why: 'Few-colour vector emoji rasterised at 72px; antialiased rims share body colours.' },
  { id: 'aa-twemoji-ghost', cat: 'antialiased', s: 'twemoji', src: '21/1f47b.png', file: TW + '1f47b.png', arch: null, why: 'Light ghost body against transparent; rims test light/dark edge colour retention.' },
  { id: 'aa-tango-face-smile', cat: 'antialiased', s: 'tango', src: TG + 'emotes/face-smile.png', arch: 'tango-icon-theme-0.8.90/32x32/emotes/face-smile.png', why: '32px hand-tuned icon: gradient body, dark antialiased outline, faint soft shadow.' },
  { id: 'aa-tango-system-search', cat: 'antialiased', s: 'tango', src: TG + 'actions/system-search.png', arch: 'tango-icon-theme-0.8.90/32x32/actions/system-search.png', why: '32px magnifier with translucent glass lens and antialiased handle.' },
  { id: 'aa-magic-orbs-sheet', cat: 'antialiased', s: 'amon', src: '8/balls.png', arch: null, why: 'Eight opaque shaded orbs (many colours) with thin antialiased rims and small soft glints.' },
  // 4 fades
  { id: 'fade-island-shore', cat: 'fade', s: 'wisedawn', src: '19/isle_3.png', arch: null, why: 'Illustrative 600px island whose shallow-water/shore ring fades to transparent.' },
  { id: 'fade-radial-light', cat: 'fade', s: 'kParticle', src: K + 'light_01.png', arch: 'PNG (Transparent)/light_01.png', why: 'Grayscale radial light cookie fading to nothing; no opaque pixels.' },
  { id: 'fade-trail-streak', cat: 'fade', s: 'kParticle', src: K + 'trace_01.png', arch: 'PNG (Transparent)/trace_01.png', why: 'Thin motion trail whose tails fade to transparent; mostly alpha 1-15.' },
  // 5 coloured effects
  { id: 'fx-teleporter-burst', cat: 'effect', s: 'para', src: '5/x/teleporter_01.png', crop: cell(30, 128, 128, 8), arch: 'teleporter_01.png', why: 'Cyan/blue teleport particles, cell 30 (peak); nearly no opaque pixels.' },
  { id: 'fx-green-magic-32', cat: 'effect', s: 'rubberduck', src: '14/x/green_effect/green_effect_06.png', arch: 'green_effect/green_effect_06.png', why: '32px green swirl effect, entirely translucent.' },
  { id: 'fx-sparks-64', cat: 'effect', s: 'rubberduck', src: '14/x/sparks_effect/sparks_effect_06.png', arch: 'sparks_effect/sparks_effect_06.png', why: 'Sparse warm sparks with soft trails over mostly empty canvas.' },
  { id: 'fx-energy-star', cat: 'effect', s: 'fzeeshan', src: '10/energy1_0.png', crop: cell(12, 400, 400, 8), arch: null, why: 'Yellow/white energy burst frame (cell 12 of 8x8, 400px cells); opaque core, broad soft rays.' },
  { id: 'fx-black-smoke', cat: 'effect', s: 'kSmoke', src: '2/x/PNG/Black smoke/blackSmoke10.png', arch: 'PNG/Black smoke/blackSmoke10.png', why: 'Dark smoke cloud with a soft ragged edge; dark soft colours that a light-biased palette can lose.' },
  // 6 all-soft
  { id: 'soft-cloud', cat: 'all-soft', s: 'torr', src: '3/original_cloud_0.png', file: OGA + 'original_cloud_0.png', arch: null, why: 'Pale blue-white cloud with no opaque pixel; colour lives entirely in translucent pixels.' },
  { id: 'soft-smoke-puff', cat: 'all-soft', s: 'kParticle', src: K + 'smoke_04.png', arch: 'PNG (Transparent)/smoke_04.png', why: 'Grayscale smoke texture, no opaque pixel.' },
  { id: 'soft-magic-ring', cat: 'all-soft', s: 'kParticle', src: K + 'magic_01.png', arch: 'PNG (Transparent)/magic_01.png', why: 'Grayscale magic ring; 70% of visible pixels are alpha 1-15.' },
  { id: 'soft-air-bubbles', cat: 'all-soft', s: 'para', src: '5/x/air_bubbles_01.png', crop: cell(30, 128, 128, 8), arch: 'air_bubbles_01.png', why: 'Underwater air bubbles, cell 30; every visible pixel translucent.' },
  { id: 'soft-bubble', cat: 'all-soft', s: 'davididev', src: '11/Bubble.png', crop: cell(0, 128, 128, 4), arch: null, why: 'Soap bubble, sheet cell 0 of 4x4; faint film with a few brighter highlight pixels.' },
];
// 7 animation groups (frames evaluated as a multi-asset wall)
const anim = [
  { group: 'anim-rubberduck-magic', s: 'rubberduck', frames: [3, 4, 5, 6, 7, 8].map(n => ({ src: `14/x/magic_effect/magic_effect_${String(n).padStart(2, '0')}.png`, arch: `magic_effect/magic_effect_${String(n).padStart(2, '0')}.png` })), durationMs: null, durationNote: 'No frame duration stated by the author (10-frame sequence; frames 03-08 used).', why: '32px GIMP magic burst; colour and alpha change over the sequence.' },
  { group: 'anim-para-fire', s: 'para', frames: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ src: '5/x/fire_01.png', crop: cell(i, 128, 128, 8), arch: `fire_01.png#cell${i}` })), durationMs: 1000 / 30, durationNote: 'Author states frame rate 30 (33.3 ms); first 8 consecutive cells (row 0) of a 64-frame row-major loop.', why: 'Soft-edged flame loop, ~23% opaque core and heavy faint alpha.' },
  { group: 'anim-kenney-explosion', s: 'kSmoke', frames: [0, 2, 4, 6, 8].map(n => ({ src: `2/x/PNG/Explosion/explosion0${n}.png`, arch: `PNG/Explosion/explosion0${n}.png` })), durationMs: null, durationNote: 'No duration stated; 9 numbered frames, even frames 00-08 used. Frame sizes differ (authored trims).', why: 'Orange explosion with large soft outer region; per-frame sizes vary as authored.' },
  { group: 'anim-tango-spinner', s: 'tango', frames: [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ src: TG + 'animations/process-working.png', crop: cell(i, 32, 32, 8), arch: `tango-icon-theme-0.8.90/32x32/animations/process-working.png#cell${i}` })), durationMs: null, durationNote: 'No duration stated; 256x128 sheet of 32x32 cells, cell 0 is the empty idle frame; cells 1-8 used.', why: 'Alpha-only spinner: a single RGB whose dots differ only in alpha.' },
];
for (const g of anim) g.frames.forEach((f, i) => A.push({ id: `${g.group}-f${i}`, cat: 'animation', s: g.s, src: f.src, crop: f.crop, arch: f.arch, why: g.why, animation: { group: g.group, frameIndex: i, frameCount: g.frames.length, durationMs: g.durationMs && +g.durationMs.toFixed(3), durationNote: g.durationNote, sourceFrame: f.arch } }));

async function rgba(buf) { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
async function cropExact(buf, r) {
  const src = await rgba(buf);
  if (r.x + r.w > src.w || r.y + r.h > src.h) throw new Error('crop outside source');
  const out = Buffer.alloc(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) src.data.copy(out, y * r.w * 4, ((r.y + y) * src.w + r.x) * 4, ((r.y + y) * src.w + r.x + r.w) * 4);
  const png = await sharp(out, { raw: { width: r.w, height: r.h, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
  const back = await rgba(png);
  if (!back.data.equals(out)) throw new Error('crop round trip mismatch');
  return png;
}

await fs.rm(outRoot, { recursive: true, force: true });
const manifest = [];
for (const a of A) {
  const s = S[a.s], buf = await fs.readFile(path.join(raw, a.src));
  const meta = await sharp(buf).metadata();
  const png = a.crop ? await cropExact(buf, a.crop) : buf;
  const st = await alphaStats(png);
  if (st.w > 1024 || st.h > 1024) throw new Error(`${a.id} too large`);
  if (st.alphaStats.partialFraction < 0.02) throw new Error(`${a.id} partial alpha below 2%`);
  const file = `${a.cat}/${a.id}.png`;
  await fs.mkdir(path.join(outRoot, a.cat), { recursive: true });
  await fs.writeFile(path.join(outRoot, file), png);
  manifest.push({
    id: a.id, category: a.cat, file, sha256: st.sha256, bytes: st.bytes, w: st.w, h: st.h, alphaStats: st.alphaStats,
    title: s.title, author: s.author, sourceUrl: s.sourceUrl, fileUrl: a.file ?? s.fileUrl, license: s.license[0], licenseUrl: s.license[1], retrieved: RETRIEVED,
    archive: s.archive ?? null, archivePath: a.arch, sourcePngSha256: (await alphaStats(buf)).sha256, sourceW: meta.width, sourceH: meta.height,
    sourceEncoding: { palette: !!meta.isPalette, iccProfile: meta.icc ? 'embedded (GIMP built-in sRGB)' : null },
    crop: a.crop ?? null, cropMethod: a.crop ? 'integer RGBA copy from Sharp-decoded source, re-encoded lossless RGBA PNG, round-trip verified byte-equal' : 'exact source bytes',
    animation: a.animation ?? null, authorStatement: s.stated ?? null, notes: a.why,
  });
}
if (manifest.some(m => m.sourceEncoding.iccProfile && m.crop)) throw new Error('crop of ICC-tagged source not allowed');

// Synthetic counterexamples (existing generators, fixture functions only).
const synth = [];
const spike = await spikeFixtures(), review = heldOutFixtures();
for (const [name, gen, purpose] of [
  ['opaque-core-alpha1-spill', 'bench/keep-alpha-weighting-spike/experiment.mjs fixtures()', 'Alpha-1 magenta spill around a three-colour opaque core; current Keep lets faint pixels displace core colours.'],
  ['many-soft-colors', 'bench/keep-alpha-weighting-spike/experiment.mjs fixtures()', 'High-entropy 80x64 all-translucent stress case; linear weighting worsens it slightly.'],
  ['all-faint-fade', 'bench/keep-alpha-weighting-spike/experiment.mjs fixtures()', 'Three colour bands at alpha 1-21 with no opaque pixel.'],
]) synth.push({ name, gen, purpose, img: spike.find(f => f.name === name).items[0].original });
for (const name of ['faint-green-spill', 'intentional-cyan-halo', 'all-soft-water-ramp']) {
  const f = review.find(f => f.name === name);
  synth.push({ name, gen: 'bench/keep-alpha-weighting-review/fixtures.mjs heldOutFixtures()', purpose: f.purpose, img: f.original });
}
await fs.mkdir(path.join(outRoot, 'synthetic'), { recursive: true });
for (const s of synth) {
  const { width, height, data } = s.img;
  const png = await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
  if (!(await rgba(png)).data.equals(Buffer.from(data.buffer, data.byteOffset, data.byteLength))) throw new Error('synthetic round trip');
  const st = await alphaStats(png), file = `synthetic/${s.name}.png`;
  await fs.writeFile(path.join(outRoot, file), png);
  manifest.push({ id: `synthetic-${s.name}`, category: 'synthetic-counterexample', file, sha256: st.sha256, bytes: st.bytes, w: st.w, h: st.h, alphaStats: st.alphaStats,
    title: s.name, author: 'synthetic (Colorfetti research)', sourceUrl: null, fileUrl: null, license: 'Project research fixture (generated)', licenseUrl: null, retrieved: RETRIEVED,
    generator: s.gen, crop: null, animation: null, notes: `NOT real artwork. ${s.purpose}` });
}

await fs.writeFile(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// CREDITS.md
const bySource = new Map();
for (const m of manifest.filter(m => m.category !== 'synthetic-counterexample')) {
  const k = m.sourceUrl; if (!bySource.has(k)) bySource.set(k, { m, files: [] }); bySource.get(k).files.push(m);
}
let md = `# Keep real-art cohort credits\n\nFrozen ${RETRIEVED} for Colorfetti's Keep opacity acceptance study, selected before any weighting comparison. Files are unmodified source PNGs or integer pixel crops (no resampling, no colour conversion), noted per file. Synthetic counterexamples in \`synthetic/\` are generated research fixtures, not artwork.\n\n`;
for (const { m, files } of bySource.values()) {
  md += `## ${m.title}\n\n- Author: ${m.author}\n- Source: ${m.sourceUrl}\n- License: [${m.license}](${m.licenseUrl})\n- Retrieved: ${m.retrieved}\n- Files:\n`;
  for (const f of files) md += `  - \`${f.file}\`${f.archivePath ? ` from \`${f.archivePath}\`` : ''}${f.crop ? ` (cropped x${f.crop.x} y${f.crop.y} ${f.crop.w}x${f.crop.h})` : ''}\n`;
  md += m.license.startsWith('CC-BY') ? `- Changes: ${files.some(f => f.crop) ? 'cropped as listed; otherwise unmodified' : 'none (unmodified)'}.${m.license.startsWith('CC-BY-SA') ? ' Adaptations are shared under the same license.' : ''}\n\n` : '\n';
}
md += `## Synthetic counterexamples\n\nGenerated by the project's research fixture code (author: synthetic (Colorfetti research)); not real artwork:\n\n${manifest.filter(m => m.category === 'synthetic-counterexample').map(m => `- \`${m.file}\` - ${m.generator}`).join('\n')}\n`;
await fs.writeFile(path.join(outRoot, 'CREDITS.md'), md);
console.log(manifest.length, 'entries');
