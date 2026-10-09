import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tooltip coverage', () => {
  for (const file of ['App.svelte', 'Dock.svelte', 'Tile.svelte']) {
    it(`${file} uses custom tooltips and has no native title tooltips`, () => {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      expect(source).not.toMatch(/\btitle\s*=/);
      expect(source).toContain("import { tooltip } from './lib/tooltip.js'");
      expect(source).toContain('use:tooltip=');
    });
  }
});
