import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import { hoverCapability } from './hover-capability.js';

const transform = async css => (await postcss([hoverCapability()]).process(css, { from: undefined })).root;
describe('touch-safe hover capability', () => {
  it('gates pure hover without inventing a selected state', async () => {
    const root = await transform('.btn:hover { background: red } .btn[aria-pressed="true"] { background: blue }');
    expect(root.first.name).toBe('media');
    expect(root.first.params).toBe('(hover: hover)');
    expect(root.first.first.selector).toBe('.btn:hover');
    expect(root.last.selector).toBe('.btn[aria-pressed="true"]');
  });
  it('keeps focus and active branches at their original cascade position', async () => {
    const root = await transform('.btn:is(:hover,:focus-visible,:active) { color: red } .btn[aria-expanded="true"] { color: blue }');
    expect(root.nodes.map(n => n.type)).toEqual(['atrule', 'atrule', 'rule']);
    expect(root.first.params).toBe('(hover: none)');
    expect(root.first.first.selector).toBe('.btn:is(:nth-child(0),:focus-visible,:active)');
    expect(root.nodes[1].first.selector).toBe('.btn:is(:hover,:focus-visible,:active)');
    expect(root.last.selector).toBe('.btn[aria-expanded="true"]');
  });
  it('preserves non-hover comma alternatives', async () => {
    const root = await transform('.a:hover, .b:focus-visible, .c { opacity: 1 }');
    expect(root.first.first.selector.replaceAll(' ', '')).toBe('.b:focus-visible,.c');
    expect(root.last.first.selector).toBe('.a:hover, .b:focus-visible, .c');
  });
  it('preserves forced colors and other outer media conditions', async () => {
    const root = await transform('@media (forced-colors: active) { .btn:is(:hover,:focus-visible) { color: Highlight } }');
    expect(root.first.params).toBe('(forced-colors: active)');
    expect(root.first.first.params).toBe('(hover: none)');
    expect(root.first.first.first.selector).toBe('.btn:is(:nth-child(0),:focus-visible)');
    expect(root.first.last.params).toBe('(hover: hover)');
  });
  it('keeps range-thumb hover only on hover-capable inputs', async () => {
    const root = await transform('.range::-webkit-slider-thumb:hover { transform: scale(1.1) }');
    expect(root.nodes).toHaveLength(1);
    expect(root.first.first.selector).toBe('.range::-webkit-slider-thumb:hover');
  });
  it('leaves attribute text, focus, active and selected rules unchanged', async () => {
    const css = '[data-label=":hover"]:focus-visible { color: red } .a:active { color: green } .a[aria-pressed=true] { color: blue }';
    expect((await transform(css)).toString()).toBe(css);
  });
  it('restricts negated-hover fallback to touch so it cannot override desktop hover', async () => {
    const root = await transform('.btn:not(:is(:hover,:focus-visible)) { color: red }');
    expect(root.first.params).toBe('(hover: none)');
    expect(root.first.first.selector).toBe('.btn:not(:is(:nth-child(0),:focus-visible))');
    expect(root.last.params).toBe('(hover: hover)');
    expect(root.last.first.selector).toBe('.btn:not(:is(:hover,:focus-visible))');
  });
  it('preserves nested logical selectors without splitting their commas', async () => {
    const root = await transform('.btn:is(:hover,:not(:disabled)):focus-visible { color: red }');
    expect(root.first.first.selector).toBe('.btn:is(:nth-child(0),:not(:disabled)):focus-visible');
  });
});
