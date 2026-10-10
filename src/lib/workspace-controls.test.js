import { describe, expect, it } from 'vitest';
import assert from 'node:assert/strict';
import { packWorkspaceControls } from './workspace-controls.js';

const widths = [200, 160, 152, 56];
const rows = result => result.map(item => item.row);
const sweepContext = (available, sizes) => `width=${available}, controls=[${sizes}]`;

describe('independent bottom workspace controls', () => {
  it('puts only Palette above when Style and the right actions fit below', () => {
    expect(packWorkspaceControls(widths, 400, 8)).toEqual([
      { row: 1, side: 'left', offset: 0 },
      { row: 2, side: 'left', offset: 0 },
      { row: 2, side: 'right', offset: 64 },
      { row: 2, side: 'right', offset: 0 },
    ]);
  });
  it('aligns editing units left when a single row fits but centering would crowd actions', () => {
    expect(packWorkspaceControls(widths, 600, 8)).toEqual([
      { row: 1, side: 'left', offset: 0 },
      { row: 1, side: 'left', offset: 208 },
      { row: 1, side: 'right', offset: 64 },
      { row: 1, side: 'right', offset: 0 },
    ]);
  });
  it('creates three rows when neither editing unit fits beside the file pair', () => {
    expect(rows(packWorkspaceControls(widths, 300, 8))).toEqual([1, 2, 3, 3]);
  });
  it('lets More occupy an independent bottom row', () => {
    expect(rows(packWorkspaceControls([120, 140, 152, 56], 180, 8))).toEqual([1, 2, 3, 4]);
  });
  it('includes every gap at the exact all-fit threshold', () => {
    expect(rows(packWorkspaceControls(widths, 592, 8))).toEqual([1, 1, 1, 1]);
    expect(rows(packWorkspaceControls(widths, 591.99, 8))).toEqual([1, 2, 2, 2]);
  });
  it('never overlaps or exceeds the row when each individual unit fits', () => {
    for (const available of [200, 216, 300, 384, 400, 500, 592, 800]) {
      const result = packWorkspaceControls(widths, available, 8);
      const boxes = result.map((item, index) => ({
        row: item.row,
        left: item.side === 'left' ? item.offset : available - item.offset - widths[index],
        width: widths[index],
      }));
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.left + box.width).toBeLessThanOrEqual(available);
      }
      for (let first = 0; first < boxes.length; first++) {
        for (let second = first + 1; second < boxes.length; second++) {
          if (boxes[first].row !== boxes[second].row) continue;
          expect(boxes[second].left - boxes[first].left - boxes[first].width).toBeGreaterThanOrEqual(8);
        }
      }
    }
  });
  it('keeps row assignments stable within each packing interval', () => {
    for (const available of [384, 400, 500, 591.99]) {
      expect(rows(packWorkspaceControls(widths, available, 8))).toEqual([1, 2, 2, 2]);
    }
    expect(packWorkspaceControls(widths, 400, 8)).toEqual(packWorkspaceControls(widths, 400, 8));
  });
  it('keeps an oversized unit alone rather than overlapping another unit', () => {
    expect(rows(packWorkspaceControls([300, 140, 152, 56], 180, 8))).toEqual([1, 2, 3, 4]);
  });
});

describe('roomy centered editing controls', () => {
  it('centers the editing pair on the whole workspace, leaving the actions right aligned', () => {
    expect(packWorkspaceControls(widths, 1200, 8)).toEqual([
      { row: 1, side: 'left', offset: 416 },
      { row: 1, side: 'left', offset: 624 },
      { row: 1, side: 'right', offset: 64 },
      { row: 1, side: 'right', offset: 0 },
    ]);
  });
  it('requires 24px of clearance at the exact centered threshold', () => {
    expect(packWorkspaceControls(widths, 848, 8)[0].offset).toBe(240);
    expect(packWorkspaceControls(widths, 847.99, 8)[0].offset).toBe(0);
    // Normal one-row packing resumes; no extra row or reduced targets.
    expect(rows(packWorkspaceControls(widths, 847.99, 8))).toEqual([1, 1, 1, 1]);
  });
  it('includes an expanded Save pill in the centering clearance', () => {
    const labeled = [200, 160, 192, 56];
    expect(packWorkspaceControls(labeled, 928, 8)[0].offset).toBe(280);
    expect(packWorkspaceControls(labeled, 927.99, 8)[0].offset).toBe(0);
    expect(rows(packWorkspaceControls(labeled, 600, 8))).toEqual([1, 2, 2, 2]);
  });
  it('recalculates room for long style labels and hidden file actions', () => {
    expect(packWorkspaceControls([200, 240, 152, 56], 848, 8)[0].offset).toBe(0);
    expect(packWorkspaceControls([200, 240, 152, 56], 928, 8)[0].offset).toBe(240);
    expect(packWorkspaceControls([200, 160, 0, 56], 528, 8)[0].offset).toBe(80);
    expect(packWorkspaceControls([200, 160, 152, 56], 528, 8)[0].offset).toBe(0);
  });
  it('does not center wrapped controls, even when Palette has room on its own row', () => {
    const packed = packWorkspaceControls(widths, 400, 8);
    expect(packed[0].offset).toBe(0);
    expect(packed[1].offset).toBe(0);
    expect(rows(packed)).toEqual([1, 2, 2, 2]);
  });
  it('respects unusually large layout gaps and ignores missing editing groups', () => {
    expect(packWorkspaceControls(widths, 976, 40)[0].offset).toBe(288);
    expect(packWorkspaceControls(widths, 975.99, 40)[0].offset).toBe(0);
    expect(packWorkspaceControls([0, 160, 152, 56], 1200, 8)[1].offset).toBe(0);
  });
  it('never overlaps across phone, landscape, desktop, zoom and fractional-width sizes', () => {
    // Keep the complete half-pixel sweep, but avoid hundreds of thousands of
    // matcher allocations that exceeded Vitest's timeout on the Pages runner.
    for (const sizes of [[203, 152, 148, 56], [203, 208, 148, 56], [203, 152, 0, 56], [203, 152, 186.421875, 56], [203, 208, 192, 56], widths.map(size => size * 1.5)]) {
      for (let available = 320; available <= 2560; available += 0.5) {
        const packed = packWorkspaceControls(sizes, available, 8);
        const boxes = packed.map((item, i) => ({ ...item, width: sizes[i], left: item.side === 'left' ? item.offset : available - item.offset - sizes[i] })).filter(box => box.width);
        for (let i = 0; i < boxes.length; i++) {
          if (!(boxes[i].left >= 0)) assert.ok(false, `Control ${i} starts outside the row: ${sweepContext(available, sizes)}`);
          if (!(boxes[i].left + boxes[i].width <= available)) assert.ok(false, `Control ${i} ends outside the row: ${sweepContext(available, sizes)}`);
          for (let j = i + 1; j < boxes.length; j++) {
            if (boxes[i].row === boxes[j].row && !(boxes[j].left - boxes[i].left - boxes[i].width >= 8)) assert.ok(false, `Controls ${i}/${j} overlap: ${sweepContext(available, sizes)}`);
          }
        }
        if (packed[0].offset > 0) {
          const context = sweepContext(available, sizes);
          assert.deepEqual(rows(packed), [1, 1, 1, 1], `Centered controls wrap: ${context}`);
          assert.equal((packed[0].offset + packed[1].offset + sizes[1]) / 2, available / 2, `Editing pair is not centered: ${context}`);
          const rightmostEdit = packed[1].offset + sizes[1];
          if (!(Math.min(...boxes.filter(box => box.side === 'right').map(box => box.left)) - rightmostEdit >= 24)) assert.ok(false, `Centered controls crowd right actions: ${context}`);
        }
      }
    }
  });
});

// Phone packing must not reserve a third row when a two-row arrangement exists.
describe('compact two-row alternatives and hidden controls', () => {
  it('puts Palette and More above Style and Files on 360px and 390px phones', () => {
    for (const available of [336, 366]) {
      expect(packWorkspaceControls([203, 152, 148, 56], available, 8)).toEqual([
        { row: 1, side: 'left', offset: 0 },
        { row: 2, side: 'left', offset: 0 },
        { row: 2, side: 'right', offset: 0 },
        { row: 1, side: 'right', offset: 0 },
      ]);
    }
  });
  it('still prefers Palette alone above when all other controls fit below', () => {
    expect(rows(packWorkspaceControls([203, 152, 148, 56], 372, 8))).toEqual([1, 2, 2, 2]);
  });
  it('ignores a hidden file capsule including its otherwise intervening gap', () => {
    const packed = packWorkspaceControls([203, 152, 0, 56], 427, 8);
    expect(rows(packed)).toEqual([1, 1, 1, 1]);
    expect(packed[1].offset).toBe(211);
    expect(packed[2].offset).toBe(0);
    expect(packed[3].offset).toBe(0);
    expect(rows(packWorkspaceControls([203, 152, 0, 56], 296, 8))).toEqual([1, 2, 2, 2]);
  });
  it('ignores zero-width units in fallback rows and offsets too', () => {
    expect(packWorkspaceControls([200, 180, 0, 56], 190, 8)).toEqual([
      { row: 1, side: 'left', offset: 0 },
      { row: 2, side: 'left', offset: 0 },
      { row: 3, side: 'right', offset: 0 },
      { row: 3, side: 'right', offset: 0 },
    ]);
  });
  it('uses the exact two-row threshold before falling back to three rows', () => {
    expect(rows(packWorkspaceControls([203, 152, 148, 56], 308, 8))).toEqual([1, 2, 2, 1]);
    expect(Math.max(...rows(packWorkspaceControls([203, 152, 148, 56], 307.99, 8)))).toBe(3);
  });
});
