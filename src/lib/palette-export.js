// Exact export helpers shared by PNG and GIF. Index 256 is empty; color indexes
// retain the selected palette's order. No canvas readback or color reduction.
import { yieldTask, checkCanceled } from './quantize.js';
export const EMPTY_INDEX = 256;

export function exportPalette(image) {
  const { w, h, colors } = image;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || !Number.isSafeInteger(w * h)) {
    throw new Error('Invalid palette image size.');
  }
  if (!Array.isArray(colors) || colors.length < 1 || colors.length > 256) {
    throw new Error('A palette needs 1–256 colors.');
  }
  const seen = new Set();
  const rgb = colors.map(hex => {
    if (typeof hex !== 'string' || !/^#[\da-f]{6}$/i.test(hex)) throw new Error('Invalid palette color.');
    const value = parseInt(hex.slice(1), 16);
    if (seen.has(value)) throw new Error('Palette colors must be unique.');
    seen.add(value);
    return value;
  });
  return { rgb, used: new Uint8Array(257), pixels: w * h };
}

export function markUsed(indices, state) {
  validateIndices(indices, state);
  markRange(indices, state, 0, indices.length);
}

function validateIndices(indices, state) {
  if (!(indices instanceof Uint16Array) || indices.length !== state.pixels) {
    throw new Error('Invalid palette image indices.');
  }
}

function markRange(indices, state, start, end) {
  const { used, rgb } = state;
  for (let p = start; p < end; p++) {
    const index = indices[p];
    if (index !== EMPTY_INDEX && index >= rgb.length) throw new Error('Palette image index is out of range.');
    used[index] = 1;
  }
}

export async function markUsedAsync(indices, state, { signal } = {}) {
  checkCanceled(signal);
  validateIndices(indices, state);
  const batch = 262144;
  for (let p = 0; p < indices.length; p += batch) {
    checkCanceled(signal);
    markRange(indices, state, p, Math.min(indices.length, p + batch));
    if (p + batch < indices.length) await yieldExport();
  }
  checkCanceled(signal);
}

export function compactTable({ rgb, used }) {
  const map = new Uint16Array(257), table = [];
  // Empty goes first, so GIF's background slot is the transparent slot.
  const transparent = used[EMPTY_INDEX] ? 0 : null;
  if (transparent !== null) table.push(rgb[0]);
  for (let i = 0; i < rgb.length; i++) if (used[i]) {
    map[i] = table.length;
    table.push(rgb[i]);
  }
  return { map, table, transparent };
}

export const yieldExport = yieldTask;
