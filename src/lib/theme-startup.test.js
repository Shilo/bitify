import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const makeDocument = () => {
  const scheme = { content: 'only light' };
  const metas = [{ content: '' }, { content: '' }];
  return {
    documentElement: { dataset: {} },
    querySelector: selector => selector === 'meta[name=color-scheme]' ? scheme : null,
    querySelectorAll: selector => selector === 'meta[name=theme-color]' ? metas : [],
  };
};

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
    const document = makeDocument();
    runInNewContext(script, {
      document,
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: dark }),
    });
    expect(document.documentElement.dataset.theme).toBe(expected);
    expect(document.querySelector('meta[name=color-scheme]').content).toBe(`only ${expected}`);
    expect(document.querySelectorAll('meta[name=theme-color]').map(meta => meta.content)).toEqual(Array(2).fill(expected === 'dark' ? '#191c20' : '#f1f2f3'));
  });

  it('follows the system when storage access is blocked', () => {
    const document = makeDocument();
    runInNewContext(script, {
      document,
      localStorage: { getItem: () => { throw new Error('Storage blocked'); } },
      matchMedia: () => ({ matches: true }),
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('meta[name=color-scheme]').content).toBe('only dark');
    expect(document.querySelectorAll('meta[name=theme-color]').map(meta => meta.content)).toEqual(['#191c20', '#191c20']);
  });
});
