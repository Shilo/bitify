import { describe, expect, it } from 'vitest';
import { packWorkspaceControls } from './workspace-controls.js';

const widths = [200, 160, 152, 56];
const rows = result => result.map(item => item.row);

describe('independent bottom workspace controls', () => {
  it('puts only Palette above when Style and the right actions fit below', () => {
    expect(packWorkspaceControls(widths, 400, 8)).toEqual([
      { row: 1, side: 'left', offset: 0 },
      { row: 2, side: 'left', offset: 0 },
      { row: 2, side: 'right', offset: 64 },
      { row: 2, side: 'right', offset: 0 },
    ]);
  });
  it('aligns both editing units left and file units right when all fit', () => {
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
