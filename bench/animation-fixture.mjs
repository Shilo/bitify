// Two-frame import/playback fixture, independent of the static product logo.
import { GifWriter } from 'omggif';
export function animationFixture() {
  const bytes = Buffer.alloc(4096), writer = new GifWriter(bytes, 16, 16, { loop: 0, palette: [0x202020, 0xe63e82, 0x0eaaa5, 0xf4c340] });
  for (let frame = 0; frame < 2; frame++) {
    const pixels = Uint8Array.from({ length: 256 }, (_, i) => (Math.floor(i / 16) + i % 16 + frame) % 4);
    writer.addFrame(0, 0, 16, 16, pixels, { delay: 10 });
  }
  return bytes.subarray(0, writer.end());
}
