import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tooltip } from './tooltip.js';

// Exercise the pointer sequences and timers without needing a browser test dependency.
class Element extends EventTarget {
  hidden = false;
  style = {};
  attrs = {};
  focusVisible = true;
  dialog = null;
  input = null;
  label = false;
  rect = { left: 100, top: 100, width: 60, height: 58 };
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  removeAttribute(key) { delete this.attrs[key]; }
  contains(target) { return target === this; }
  matches(selector) { return selector === ':focus-visible' ? this.focusVisible : selector === 'label' && this.label; }
  closest() { return this.dialog; }
  querySelector() { return this.input; }
  getBoundingClientRect() { return { ...this.rect, right: this.rect.left + this.rect.width, bottom: this.rect.top + this.rect.height }; }
  remove() { this.removed = true; }
}
const emit = (target, type, values = {}) => {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, values);
  target.dispatchEvent(event);
  return event;
};
const finger = { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 110, clientY: 110 };
let node, tip, action, chosen, extras;
beforeEach(() => {
  vi.useFakeTimers();
  node = new Element();
  tip = new Element();
  tip.rect.width = 240;
  tip.rect.height = 50;
  const doc = new EventTarget();
  doc.createElement = () => tip;
  doc.body = { append: vi.fn() };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('innerWidth', 375);
  vi.stubGlobal('innerHeight', 667);
  action = tooltip(node, 'Small inventory icons.');
  chosen = vi.fn();
  node.addEventListener('click', chosen);
  extras = [];
});
afterEach(() => {
  action?.destroy();
  extras.forEach(extra => extra.destroy());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('custom tooltips', () => {
  it('shows on hover and allows crossing into the tooltip, then dismisses on Escape', () => {
    emit(node, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(349);
    expect(tip.hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(tip.hidden).toBe(false);
    emit(node, 'pointerleave', { pointerType: 'mouse', relatedTarget: tip });
    vi.advanceTimersByTime(200);
    expect(tip.hidden).toBe(false);
    expect(emit(window, 'keydown', { key: 'Escape' }).defaultPrevented).toBe(true);
    expect(tip.hidden).toBe(true);
  });

  it('describes keyboard focus and stays within a narrow viewport', () => {
    node.rect.left = 340;
    node.rect.top = 5;
    emit(node, 'focusin');
    expect(tip.hidden).toBe(false);
    expect(node.attrs['aria-describedby']).toBe(tip.id);
    expect(parseFloat(tip.style.left) + tip.rect.width).toBeLessThanOrEqual(367);
    expect(parseFloat(tip.style.top)).toBeGreaterThanOrEqual(node.getBoundingClientRect().bottom);
    emit(node, 'focusout');
    expect(tip.hidden).toBe(true);
  });

  it('a normal touch tap selects without showing a tooltip', () => {
    emit(node, 'pointerdown', finger);
    emit(node, 'focusin');
    vi.advanceTimersByTime(100);
    emit(window, 'pointerup', finger);
    emit(node, 'click');
    vi.advanceTimersByTime(500);
    expect(chosen).toHaveBeenCalledOnce();
    expect(tip.hidden).toBe(true);
    // Tab can return to a previously touched button from another control.
    emit(window, 'keydown', { key: 'Tab' });
    emit(node, 'focusin');
    expect(tip.hidden).toBe(false);
  });

  it('a touch hold shows only the tooltip, including after release and delayed click', () => {
    emit(node, 'pointerdown', finger);
    vi.advanceTimersByTime(500);
    expect(tip.hidden).toBe(false);
    emit(window, 'pointerup', finger);
    vi.advanceTimersByTime(1000);
    expect(emit(node, 'click').defaultPrevented).toBe(true);
    expect(chosen).not.toHaveBeenCalled();
    expect(tip.hidden).toBe(false);
    expect(emit(node, 'contextmenu').defaultPrevented).toBe(true);
    // The next short tap works normally.
    emit(window, 'pointerdown', finger);
    emit(node, 'pointerdown', finger);
    emit(window, 'pointerup', finger);
    emit(node, 'click');
    expect(chosen).toHaveBeenCalledOnce();
    expect(tip.hidden).toBe(true);
  });

  it('moving to scroll cancels the hold and any resulting click', () => {
    emit(node, 'pointerdown', finger);
    vi.advanceTimersByTime(250);
    emit(window, 'pointermove', { ...finger, clientX: finger.clientX + 8 });
    vi.advanceTimersByTime(500);
    emit(window, 'pointerup', finger);
    emit(node, 'click');
    expect(chosen).not.toHaveBeenCalled();
    expect(tip.hidden).toBe(true);
  });

  it('cancellation stops the timer and scrolling dismisses a held tooltip', () => {
    emit(node, 'pointerdown', finger);
    emit(window, 'pointercancel', finger);
    vi.advanceTimersByTime(500);
    expect(tip.hidden).toBe(true);
    emit(node, 'pointerdown', finger);
    vi.advanceTimersByTime(500);
    expect(tip.hidden).toBe(false);
    emit(document, 'scroll');
    expect(tip.hidden).toBe(true);
  });

  it('removing the menu clears pending holds, listeners and accessible descriptions', () => {
    emit(node, 'pointerdown', finger);
    action.destroy();
    action = null;
    vi.advanceTimersByTime(500);
    expect(tip.hidden).toBe(true);
    expect(tip.removed).toBe(true);
    expect(node.attrs['aria-describedby']).toBeUndefined();
    emit(node, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(500);
    expect(tip.hidden).toBe(true);
  });

  it('updates dynamic copy while visible without changing its accessible ID', () => {
    emit(node, 'focusin');
    const id = tip.id;
    action.update('Save every image in a ZIP archive.');
    expect(tip.textContent).toBe('Save every image in a ZIP archive.');
    expect(node.attrs['aria-describedby']).toBe(id);
    expect(tip.hidden).toBe(false);
    action.update('');
    expect(tip.hidden).toBe(true);
  });

  it('only shows one tooltip and shares global listeners across many controls', () => {
    const added = vi.spyOn(window, 'addEventListener');
    const second = new Element(), otherTip = new Element();
    document.createElement = () => otherTip;
    extras.push(tooltip(second, 'Choose a color pair.'));
    expect(otherTip.id).not.toBe(tip.id);
    emit(node, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(200);
    emit(second, 'focusin');
    vi.advanceTimersByTime(500);
    expect(tip.hidden).toBe(true);
    expect(otherTip.hidden).toBe(false);
    expect(added).not.toHaveBeenCalled();
    emit(window, 'resize');
    expect(otherTip.hidden).toBe(true);
  });

  it('puts color-picker descriptions on the focusable input and preserves other descriptions', () => {
    action.destroy();
    action = null;
    const input = new Element();
    input.setAttribute('aria-describedby', 'existing');
    node.label = true;
    node.input = input;
    extras.push(tooltip(node, 'Choose a color for fills.'));
    expect(input.attrs['aria-describedby']).toBe(`existing ${tip.id}`);
    expect(node.attrs['aria-describedby']).toBeUndefined();
    emit(node, 'focusin');
    expect(tip.hidden).toBe(false);
    extras.pop().destroy();
    expect(input.attrs['aria-describedby']).toBe('existing');
  });

  it('shows above modal dialogs and cleans up when the dialog closes', () => {
    action.destroy();
    action = null;
    const dialog = new Element();
    dialog.open = true;
    dialog.append = vi.fn();
    node.dialog = dialog;
    let open = false;
    tip.matches = selector => selector === ':popover-open' && open;
    tip.showPopover = vi.fn(() => { open = true; });
    tip.hidePopover = vi.fn(() => { open = false; });
    extras.push(tooltip(node, 'Dismiss this help window.'));
    expect(dialog.append).toHaveBeenCalledWith(tip);
    emit(node, 'focusin');
    expect(tip.showPopover).toHaveBeenCalledOnce();
    emit(dialog, 'close');
    expect(tip.hidePopover).toHaveBeenCalledOnce();
    expect(tip.hidden).toBe(true);
    dialog.open = false;
    emit(node, 'focusin');
    expect(tip.hidden).toBe(true);
  });

  it('a second finger cancels a pending touch hold', () => {
    emit(window, 'pointerdown', finger);
    emit(node, 'pointerdown', finger);
    vi.advanceTimersByTime(200);
    const second = { ...finger, pointerId: 2, isPrimary: false };
    emit(window, 'pointerdown', second);
    emit(node, 'pointerdown', second);
    vi.advanceTimersByTime(500);
    expect(tip.hidden).toBe(true);
  });

  it('clicking the tooltip does not dismiss its surrounding panel', () => {
    emit(node, 'focusin');
    const outside = vi.fn();
    window.addEventListener('pointerdown', outside);
    const event = new Event('pointerdown', { cancelable: true });
    Object.defineProperty(event, 'target', { value: tip });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(outside).not.toHaveBeenCalled();
    expect(tip.hidden).toBe(false);
    window.removeEventListener('pointerdown', outside);
  });

  it('releasing a held button still allows a later keyboard activation', () => {
    emit(node, 'pointerdown', finger);
    vi.advanceTimersByTime(500);
    emit(window, 'pointerup', finger);
    emit(node, 'click');
    expect(chosen).not.toHaveBeenCalled();
    emit(window, 'keydown', { key: 'Enter' });
    emit(node, 'keydown', { key: 'Enter' });
    emit(node, 'click');
    expect(chosen).toHaveBeenCalledOnce();
    expect(tip.hidden).toBe(true);
  });

  it('removes global listeners when the final tooltip is destroyed', () => {
    const removed = vi.spyOn(window, 'removeEventListener');
    action.destroy();
    action = null;
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['pointerdown', 'pointermove', 'pointerup', 'keydown', 'resize', 'blur']));
  });
});
