"""Prepare a bounded 32/64 experiment; no production code or assets are changed."""
from pathlib import Path
from PIL import Image, ImageSequence
import json

root = Path(__file__).resolve().parents[1]
out = root / '.tmp/auto-capacity'
raw = out / 'raw'
raw.mkdir(parents=True, exist_ok=True)
fixture = root / '.tmp/palette-wall-stress-20261012/build/fixtures'
selected = [('girl', Path('C:/Users/shilo/Downloads/girl-1bit (1)-1bit.png'))]
selected += [(f'building{i}', fixture / f'building{i}.png') for i in range(1, 7)]
selected += [('dungeon', fixture / 'dungeon.gif')]
selected += [(f's{i:03}', fixture / f's{i:03}.png') for i in range(1, 33)]
selected += [(f'a{i:03}', fixture / f'a{i:03}.gif') for i in range(1, 4)]
assets = []
for name, path in selected:
    frames = []
    with Image.open(path) as image:
        for i, frame in enumerate(ImageSequence.Iterator(image)):
            rgba = frame.convert('RGBA')
            filename = f'{name}-{i}.rgba'
            (raw / filename).write_bytes(rgba.tobytes())
            frames.append(dict(url=f'/raw/{filename}', width=rgba.width, height=rgba.height,
                               delay=frame.info.get('duration', 100) if image.n_frames > 1 else 1))
    assets.append(dict(name=name, frames=frames))
# Deliberately adversarial color coverage, not a representative AI sprite.
noise = bytes(channel for n in range(32768)
              for channel in (((n >> 10) & 31) * 8 + 4, ((n >> 5) & 31) * 8 + 4,
                              (n & 31) * 8 + 4, 255))
(raw / 'synthetic-high-entropy.rgba').write_bytes(noise)
assets.append(dict(name='synthetic-high-entropy', frames=[dict(url='/raw/synthetic-high-entropy.rgba',
    width=256, height=128, delay=1)]))
(out / 'manifest.json').write_text(json.dumps(assets), encoding='utf-8')
source = (root / 'src/lib/palette-generated.js').read_text(encoding='utf-8')
source = source.replace("'./quantize.js'", "'../../src/lib/quantize.js'")
source = source.replace("'./palette-generated-sources.js'", "'../../src/lib/palette-generated-sources.js'")
source = source.replace("'./palette-library.js'", "'../../src/lib/palette-library.js'")
capacity = 'COLORS = GENERATED_MAX_COLORS' if 'COLORS = GENERATED_MAX_COLORS' in source else 'COLORS = 32'
assert capacity in source
for count in (32, 64):
    (out / f'generated{count}.js').write_text(source.replace(capacity, f'COLORS = {count}'), encoding='utf-8')
print(json.dumps(dict(assets=len(assets), frames=sum(len(a['frames']) for a in assets),
                     bytes=sum((raw / f['url'].split('/')[-1]).stat().st_size for a in assets for f in a['frames']))))
