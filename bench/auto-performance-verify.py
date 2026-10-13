"""Independent Pillow/NumPy validation; does not import application modules.

The source GIF delay normalization mirrors the documented browser playback rule:
raw 0/10 ms frames become 100 ms. Everything else is read independently from files.
Output membership and alpha are checked on every composited pixel of every frame.
"""
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

import numpy as np
import PIL
from PIL import Image


if len(sys.argv) not in (3, 4):
    raise SystemExit('Usage: python bench/auto-performance-verify.py <built fixture root> <report root> [expected color count]')
FIXTURES = Path(sys.argv[1]).resolve()
ROOT = Path(sys.argv[2]).resolve()
EXPECTED_COLORS = int(sys.argv[3]) if len(sys.argv) == 4 else None
if EXPECTED_COLORS is not None and not 1 <= EXPECTED_COLORS <= 64:
    raise SystemExit('Expected color count must be between 1 and 64.')
MANIFEST_PATH = FIXTURES / 'qa-stress-fixtures.json'
OUT_PATH = ROOT / 'auto-independent-export-verification.json'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalized_delay(frame):
    raw_ms = frame.info.get('duration', 0)
    return raw_ms if raw_ms > 10 else 100


def rgba(image):
    return np.asarray(image.convert('RGBA'), dtype=np.uint8)


def verify_device(device, entries):
    report_path = ROOT / f'{device}-wall-stress.json'
    zip_path = ROOT / f'{device}-export.zip'
    if not report_path.exists() or not zip_path.exists():
        return {'status': 'pending', 'reason': 'Browser report or actual ZIP not yet available'}
    report = json.loads(report_path.read_text(encoding='utf-8'))
    exported = report.get('rawExport')
    if not exported:
        return {'status': 'pending', 'reason': 'Browser report has not captured actual ZIP metadata'}
    colors = exported['selectedColors']
    allowed = {int(color[1:], 16) for color in colors}
    assert 0 < len(allowed) <= 64
    assert len(colors) == len(allowed), 'Captured palette has duplicate entries.'
    if EXPECTED_COLORS is not None:
        assert len(allowed) == EXPECTED_COLORS, f'Expected {EXPECTED_COLORS} captured colors, got {len(allowed)}.'
    assert exported['settings'] == {'metric': 'Oklab', 'cap': 'All', 'cleanup': 'off', 'cut': 128}
    expected_names = {
        f"{Path(entry['name']).stem}-palette{Path(entry['name']).suffix}": entry
        for entry in entries
    }
    failures = []
    if exported['bytes'] != zip_path.stat().st_size:
        failures.append({'kind': 'captured-archive-size', 'report': exported['bytes'],
                         'actual': zip_path.stat().st_size})
    records = []
    checked_pixels = 0
    checked_frames = 0
    alpha_differences = 0
    outside_colors = set()
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            failures.append({'kind': 'duplicate-archive-name'})
        if set(names) != set(expected_names):
            failures.append({'kind': 'archive-file-set', 'missing': sorted(set(expected_names) - set(names)),
                             'extra': sorted(set(names) - set(expected_names))})
        for name in names:
            if name not in expected_names:
                continue
            entry = expected_names[name]
            source_path = FIXTURES / entry['url'].lstrip('/')
            used = set()
            file_alpha_differences = 0
            timing_differences = []
            source_delays = []
            output_delays = []
            file_failures = []
            with Image.open(source_path) as source, Image.open(io.BytesIO(archive.read(name))) as output:
                source_loop = source.info.get('loop')
                output_loop = output.info.get('loop')
                source_count = getattr(source, 'n_frames', 1)
                output_count = getattr(output, 'n_frames', 1)
                if source.size != output.size or source.size != (entry['width'], entry['height']):
                    file_failures.append({'kind': 'dimensions', 'source': source.size, 'output': output.size})
                if source_count != output_count or source_count != entry['frames']:
                    file_failures.append({'kind': 'frame-count', 'source': source_count, 'output': output_count,
                                          'manifest': entry['frames']})
                if entry['kind'] == 'gif' and source_loop != output_loop:
                    file_failures.append({'kind': 'loop', 'source': source_loop, 'output': output_loop})
                for index in range(min(source_count, output_count)):
                    source.seek(index)
                    output.seek(index)
                    before = rgba(source)
                    after = rgba(output)
                    checked_frames += 1
                    checked_pixels += after.shape[0] * after.shape[1]
                    if before.shape != after.shape:
                        file_failures.append({'kind': 'frame-dimensions', 'frame': index})
                        continue
                    expected_alpha = np.where(before[:, :, 3] >= 128, 255, 0)
                    mismatch = expected_alpha != after[:, :, 3]
                    count = int(np.count_nonzero(mismatch))
                    file_alpha_differences += count
                    if count and len(file_failures) < 8:
                        coords = np.argwhere(mismatch)[:6]
                        file_failures.append({'kind': 'alpha', 'frame': index, 'pixels': count,
                                              'examples': [{'x': int(x), 'y': int(y),
                                                            'expected': int(expected_alpha[y, x]),
                                                            'actual': int(after[y, x, 3])} for y, x in coords]})
                    visible = after[:, :, 3] != 0
                    keys = (after[:, :, 0].astype(np.uint32) << 16) | \
                           (after[:, :, 1].astype(np.uint32) << 8) | after[:, :, 2]
                    used.update(map(int, np.unique(keys[visible])))
                    if entry['kind'] == 'gif':
                        expected_delay = normalized_delay(source)
                        actual_delay = output.info.get('duration', 0)
                        source_delays.append(expected_delay)
                        output_delays.append(actual_delay)
                        if expected_delay != actual_delay:
                            timing_differences.append({'frame': index, 'expected': expected_delay, 'actual': actual_delay})
                forbidden = used - allowed
                outside_colors.update(forbidden)
                if forbidden:
                    file_failures.append({'kind': 'palette-membership', 'colors': [f'#{c:06x}' for c in sorted(forbidden)]})
                if len(used) > len(allowed):
                    file_failures.append({'kind': 'generated-color-bound', 'used': len(used)})
                if timing_differences:
                    file_failures.append({'kind': 'timing', 'differences': timing_differences[:8],
                                          'totalDifferences': len(timing_differences)})
                alpha_differences += file_alpha_differences
                records.append({'id': entry['id'], 'dimensions': list(output.size), 'frames': output_count,
                                'usedColors': len(used), 'paletteMembership': not forbidden,
                                'alphaDifferences': file_alpha_differences,
                                'timingAndLoop': not timing_differences and source_loop == output_loop,
                                'sourceDelayMsRange': [min(source_delays), max(source_delays)] if source_delays else None})
                for failure in file_failures:
                    failures.append({'id': entry['id'], **failure})
    return {
        'status': 'passed' if not failures else 'failed',
        'archiveBytes': zip_path.stat().st_size,
        'archiveSHA256': sha256(zip_path),
        'actualFileCount': len(records),
        'checkedFrames': checked_frames,
        'checkedCompositedPixels': checked_pixels,
        'selectedColorCount': len(allowed),
        'selectedColors': colors,
        'alphaDifferences': alpha_differences,
        'colorsOutsideSelectedPalette': [f'#{c:06x}' for c in sorted(outside_colors)],
        'maxUsedColorsPerAssetAcrossFrames': max((entry['usedColors'] for entry in records), default=0),
        'gifTimingAndLoopPassed': all(record['timingAndLoop'] for record in records),
        'failures': failures,
        'entries': records,
    }


manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
stills = [entry for entry in manifest['files'] if entry['kind'] == 'still']
priorities = [entry for entry in stills if entry.get('role') in ('building', 'sprite')]
subset_stills = (priorities + [entry for entry in stills if entry not in priorities])[:20]
subset_gifs = [entry for entry in manifest['files'] if entry['kind'] == 'gif' and entry.get('role') != 'dungeon'][:8]
entries = subset_stills + subset_gifs
result = {
    'method': 'Independent Pillow compositing and NumPy full-frame pixel checks; no application imports',
    'versions': {'python': sys.version.split()[0], 'pillow': PIL.__version__, 'numpy': np.__version__},
    'expected': {'selectedColors': EXPECTED_COLORS, 'files': len(entries), 'stills': sum(entry['kind'] == 'still' for entry in entries),
                 'gifs': sum(entry['kind'] == 'gif' for entry in entries),
                 'frames': sum(entry['frames'] for entry in entries)},
    'settings': {'sharedPalette': 'Auto', 'matching': 'Oklab', 'maxColors': 'All',
                 'cleanup': 'Off', 'alphaCut': 128},
    'scope': 'Exact dimensions, composited alpha, shared-palette membership and GIF timing/loop; no claim of perceptual optimality',
    'devices': {device: verify_device(device, entries) for device in ('android', 'desktop')},
}
if all(device.get('status') == 'passed' for device in result['devices'].values()):
    android_colors = sorted(result['devices']['android']['selectedColors'])
    desktop_colors = sorted(result['devices']['desktop']['selectedColors'])
    slot_differences = [
        {'slot': index, 'android': before, 'desktop': after}
        for index, (before, after) in enumerate(zip(android_colors, desktop_colors)) if before != after
    ]
    channel_difference = max(
        (abs(a - b) for before, after in zip(android_colors, desktop_colors)
         for a, b in zip(bytes.fromhex(before[1:]), bytes.fromhex(after[1:]))), default=0
    )
    result['crossDeviceObservation'] = {
        'selectedPalettesIdentical': android_colors == desktop_colors,
        'differingSortedPaletteSlots': slot_differences,
        'maximumAbsoluteChannelDifferenceBySortedSlot': channel_difference,
        'note': 'Each archive validates against its own captured palette. This comparison does not establish why browser source RGB differs, and does not claim byte-identical device outputs.',
    }
OUT_PATH.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
controls = {'sprite', 'dungeon', *(f'building{i}' for i in range(1, 7))}
compact = {key: value for key, value in result.items() if key != 'devices'}
compact['devices'] = {
    device: {**{key: value for key, value in record.items() if key != 'entries'},
             'userControls': [entry for entry in record.get('entries', []) if entry['id'] in controls]}
    for device, record in result['devices'].items()
}
(ROOT / 'auto-independent-export-summary.json').write_text(json.dumps(compact, indent=2) + '\n', encoding='utf-8')
print(json.dumps({**{k: v for k, v in result.items() if k != 'devices'},
                  'devices': {device: {k: v for k, v in value.items() if k not in ('entries', 'selectedColors')}
                              for device, value in result['devices'].items()}}, indent=2))
