import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

describe('theme before the first paint', () => {
  it.each([
    [null, true, 'dark'],
    [null, false, 'light'],
    ['{}', true, 'dark'],
    ['{"theme":"light"}', true, 'light'],
    ['{"theme":"dark"}', false, 'dark'],
    ['{"theme":"invalid"}', true, 'dark'],
    ['broken JSON', true, 'dark'],
  ])('resolves stored %s with system dark=%s to %s', (stored, dark, expected) => {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(script, {
      document,
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: dark }),
    });
    expect(document.documentElement.dataset.theme).toBe(expected);
  });

  it('follows the system when storage access is blocked', () => {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(script, {
      document,
      localStorage: { getItem: () => { throw new Error('Storage blocked'); } },
      matchMedia: () => ({ matches: true }),
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
