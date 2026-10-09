"""Build a self-contained viewer of actual production Icon masks and source variants."""
from pathlib import Path
from io import BytesIO
import json, base64, html
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
rows = json.loads((ROOT/'icon-variants.json').read_text())
metrics = json.loads((ROOT/'icon-evaluation.json').read_text())
performance = json.loads((ROOT/'icon-performance.json').read_text())
originals = [r for r in rows if r['variant']=='original' and not r['id'].endswith('sheet')]

def pixels(r, key):
 if key=='data': return Image.fromarray(np.array(r[key],dtype=np.uint8).reshape(r['height'],r['width'],4))
 a=np.zeros((r['height'],r['width'],4),dtype=np.uint8)
 a[np.array(r[key]).reshape(r['height'],r['width'])==2]=[240,246,240,255]
 return Image.fromarray(a)

def url(im):
 b=BytesIO(); im.save(b,format='PNG'); return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()

viewer={}
for r in rows:
 if r['id'].endswith('sheet'): continue
 viewer.setdefault(r['id'],{})[r['variant']]={key:url(pixels(r,key)) for key in ['data','old','fresh','low','high']}

labels=[('data','Original'),('old','Previous Stencil / Auto'),('fresh','Icon / default 50%'),('low','Icon / Detail Off'),('high','Icon / Detail 100%')]
plate=originals[0]; scale=14; cw=250; height=285
comparison=Image.new('RGB',(cw*5,height),(23,25,30)); draw=ImageDraw.Draw(comparison)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
for col,(key,label) in enumerate(labels):
 draw.text((col*cw+8,8),label,fill='white',font=font)
 checker=np.zeros((16,16,4),dtype=np.uint8); yy,xx=np.indices((16,16));checker[:,:,:3]=np.where(((xx//2+yy//2)%2)[...,None],[39,43,51],[30,33,39]);checker[:,:,3]=255
 bg=Image.fromarray(checker); bg.alpha_composite(pixels(plate,key));comparison.paste(bg.convert('RGB').resize((224,224),Image.Resampling.NEAREST),(col*cw+8,35))
comparison.save(ROOT/'breastplate-final-comparison.png')

table=''.join(f'<tr><td>{html.escape(k)}</td><td>{v["changedItems"]}/65</td><td>{v["changedPixels"]}</td><td>{v["vanished"]}</td></tr>' for k,v in metrics['comparisons'].items())
options=''.join(f'<option>{html.escape(r["id"])}</option>' for r in originals)
variants=''.join(f'<option>{html.escape(k)}</option>' for k in viewer[plate['id']])
cards=''.join(f'<article><h3>{html.escape(r["id"])}</h3><div class="triplet">'+''.join(f'<figure><img src="{viewer[r["id"]]["original"][k]}" alt="{html.escape(r["id"])} {label}"><figcaption>{label}</figcaption></figure>' for k,label in labels[:3])+'</div></article>' for r in originals)
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bitify — Icon implementation results</title>
<style>body{{background:#17191e;color:#edf2ee;font:16px/1.55 system-ui;margin:24px auto;padding:0 20px;max-width:1150px}}h1,h2{{line-height:1.2}}p{{max-width:90ch}}a{{color:#9ccafa}}select,input,button{{font:inherit;background:#282c34;color:inherit;border:1px solid #697283;border-radius:7px;padding:8px;margin:4px}}.compare,.triplet{{display:flex;flex-wrap:wrap;gap:12px}}figure{{margin:0;flex:1;min-width:140px}}img{{image-rendering:pixelated;background:repeating-conic-gradient(#272b33 0 25%,#1e2127 0 50%) 0/16px 16px}}.compare img{{width:192px;height:192px;max-width:100%}}.triplet figure{{min-width:80px}}.triplet img{{width:80px;height:80px}}figcaption{{font-size:12px}}.gallery{{display:grid;grid-template-columns:repeat(auto-fit,minmax(315px,1fr));gap:16px}}article{{background:#20242b;border-radius:12px;padding:14px}}h3{{font-size:14px;margin:0 0 10px}}.native figure{{min-width:100px}}.native img{{width:16px;height:16px}}table{{border-collapse:collapse}}td,th{{text-align:left;padding:8px;border-bottom:1px solid #444b58}}code{{color:#b9d9ff}}.notice{{border-left:3px solid #e5bb6e;padding-left:14px}}@media(max-width:500px){{.compare img{{width:128px;height:128px}}}}</style>
<h1>One ink + transparent negative space</h1><p>Actual masks from <code>src/lib/bitify.js</code> and <code>src/lib/icon.js</code>. All 65 supplied 16px items are included. No source redraw, learned model, item labels or templates were used by the conversion.</p>
<p>The relevant art term is <b>1-bit pixel icons</b>: filled pixel glyphs with negative-space details. An exact inventory reference is <a href="https://gingercharacters.itch.io/1-bit-icons">GingerCharacters’ 143 white + transparent 16×16 RPG icons</a>. <a href="https://kenney.nl/assets/1-bit-pack">Kenney’s 1-Bit Pack</a> confirms the convention. Evidence does not establish a “most common” substyle.</p>
<p><b>Use:</b> Icon → first color None → Outline Auto → Detail 50%. Icon prepares a connected body, infers drawn near-black borders, ranks short chromatic seams and brightness valleys, rejects dots/branching texture, and limits detail removal to 25% per component. Detail increases monotonically. The ten existing styles retain their output.</p>
<p class="notice"><b>Recognition remains imperfect.</b> The breastplate is less rounded, but its body is still generic; some helmets, boots, maps and armor lose identifying details. A retained silhouette is not proof of recognizable item design. This is the best tested geometric compromise in this iteration, not a guarantee of optimal artwork.</p>
<h2>Inspect a source and its variants</h2><label>Item <select id="item">{options}</select></label><label>Input <select id="variant">{variants}</select></label><label><input type="checkbox" id="native"> Native 16×16</label><div id="comparison" class="compare"></div>
<h2>All items, original input</h2><p>Each card shows source → previous Stencil Auto → new Icon default. Native-size inspection is available above.</p><div class="gallery">{cards}</div>
<h2>Preprocessing tests</h2><p>524 source variants were converted: original RGB, matching Luma grayscale, per-item and per-sheet median-cut palettes of 4, 8 and 16 colors. Changed pixels count mask differences against the RGB result, not quality improvements. Zero disappearing items does not prove recognition. Grayscale discards material color boundaries; quantization can merge seams or invent harder ones. None consistently fixes semantic ambiguity.</p><table><tr><th>Preprocessing</th><th>Changed items</th><th>Changed pixels</th><th>Disappeared</th></tr>{table}</table>
<p>In the earlier threshold study, a fixed 50% brightness clamp kept only 24 of the breastplate’s 155 opaque pixels and erased 6/65 items. Solid already implements that clamp. Raising color count is not itself an explanation for the failures: lighting, alpha support, drawn borders and semantic ambiguity also matter.</p>
<h2>Verification and practical cost</h2><p>177 unit tests passed, including 65 items × 3 outline modes × 101 Detail settings for foreground connectivity, monotonicity, no new source support and bounded cuts. 24,000 existing-style regression combinations were byte-identical. Production build passed.</p>
<p>Codex browser: all five source files loaded; desktop and 390×844 phone-width controls checked; outline/brightness changes, Reset, Detail Off/100%, style switching and reload persistence checked. Browser ZIP contained one 16×16 and four 64×64 PNGs, each with one opaque RGB color and alpha 0/255; decoded alpha masks and opaque RGB matched production output exactly. The browser API provides viewport sizes but no touch-device override, so physical touch gestures were not verified. Copy was clicked, but the browser clipboard API returned no readable PNG; clipboard contents are not verified.</p>
<p>Measured in Node on this desktop: all 65 items prepared in {performance['inventory']['firstMs']} ms, then cached control updates in {performance['inventory']['cachedMs']} ms. A noisy 12MP stress image needed {performance['stress'][-1]['firstMs']} ms initially and {performance['stress'][-1]['cachedMs']} ms cached. Icon is intended for sprites; first-time preparation on large images costs more and allocates temporary full-source arrays.</p>
<h2>Research that informed this approach</h2><p><a href="flat-icon-research.html">Subagent’s full research</a>. <a href="https://gigl.scs.carleton.ca/papers/bnw.pdf">Mould & Grant: Stylized Black and White Images from Photographs</a> supports coherent base regions plus selective details. <a href="https://www.umsl.edu/~kangh/Papers/kang_npar07_hi.pdf">Kang et al.: Coherent Line Drawing</a> supports directional continuity. The implementation uses small-grid heuristics, not either paper’s full algorithm. Graph-cut and semantic reconstruction remain possible further experiments; neither is validated here as a reliable 16px solution.</p>
<script>const data={json.dumps(viewer)},labels={json.dumps(labels)};const item=document.querySelector('#item'),variant=document.querySelector('#variant'),native=document.querySelector('#native'),comparison=document.querySelector('#comparison');function render(){{comparison.className='compare'+(native.checked?' native':'');comparison.innerHTML=labels.map(([key,label])=>`<figure><img src="${{data[item.value][variant.value][key]}}" alt="${{label}}"><figcaption>${{label}}</figcaption></figure>`).join('')}}item.onchange=variant.onchange=native.onchange=render;render();</script></html>'''
(ROOT/'results.html').write_text(page,encoding='utf-8')
print('Saved results.html and breastplate-final-comparison.png')
