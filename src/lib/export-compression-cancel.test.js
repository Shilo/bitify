import { expect, it, vi } from 'vitest';
const control = vi.hoisted(() => ({ codec: vi.fn() }));
vi.mock('fflate', async original => ({ ...await original(), zlib: (...args) => control.codec(...args) }));
import { palettePngBytesAsync } from './save.js';

it('terminates pending PNG compression and ignores a late callback after cancellation', async () => {
  let callback; const terminate = vi.fn();
  control.codec.mockImplementation((rows, options, done) => { callback = done; return terminate; });
  const controller = new AbortController();
  const pending = palettePngBytesAsync({ colors: ['#000000', '#ffffff'], w: 3, h: 1, indices: Uint16Array.of(0, 1, 256) }, { signal: controller.signal });
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(callback).toBeTypeOf('function'));
  controller.abort(); await rejected;
  callback(null, Uint8Array.of(1));
  expect(terminate).toHaveBeenCalledOnce();
});
