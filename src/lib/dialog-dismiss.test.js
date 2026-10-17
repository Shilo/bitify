import { describe, expect, it, vi } from 'vitest';
import { backdropDismiss } from './dialog-dismiss.js';

const emit = (target, type, values = {}) => {
  const event = new Event(type, { cancelable: true });
  const { target: origin, ...details } = values; Object.assign(event, details);
  if (origin) Object.defineProperty(event, 'target', { value: origin });
  target.dispatchEvent(event); return event;
};
function fixture(overlay = true) {
  const view = new EventTarget(), node = new EventTarget(), content = {};
  node.open = true; node.classList = { contains: () => overlay };
  node.getBoundingClientRect = () => ({ left: 100, top: 100, right: 300, bottom: 300 });
  let hit = node; node.ownerDocument = { defaultView: view, elementFromPoint: () => hit };
  const close = vi.fn(), action = backdropDismiss(node, close);
  const pointer = { pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: 10 };
  return { view, node, close, action, content, pointer, hit: value => { hit = value; } };
}
describe('backdrop dismissal', () => {
  it('requires down, matching up and click on backdrop', () => {
    const f = fixture(); emit(f.view,'pointerdown',{...f.pointer,target:f.node}); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer); expect(f.close).toHaveBeenCalledOnce();
  });
  it('keeps an input selection ending outside, even if click is retargeted to dialog', () => {
    const f = fixture(); emit(f.view,'pointerdown',{...f.pointer,target:f.content}); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer); expect(f.close).not.toHaveBeenCalled();
  });
  it('keeps a backdrop start ending over captured content', () => {
    const f = fixture(); emit(f.view,'pointerdown',{...f.pointer,target:f.node}); f.hit(f.content); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer); expect(f.close).not.toHaveBeenCalled();
  });
  it.each(['pointercancel','blur'])('cancels %s gestures', type => {
    const f = fixture(); emit(f.view,'pointerdown',{...f.pointer,target:f.node}); emit(f.view,type); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer); expect(f.close).not.toHaveBeenCalled();
  });
  it('rejects other pointers, secondary presses, panning and click-only events', () => {
    const f = fixture(); emit(f.node,'click',f.pointer);
    emit(f.view,'pointerdown',{...f.pointer,target:f.node}); emit(f.view,'pointerup',{...f.pointer,pointerId:2}); emit(f.node,'click',f.pointer);
    emit(f.view,'pointerdown',{...f.pointer,target:f.node,isPrimary:false}); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer);
    emit(f.view,'pointerdown',{...f.pointer,target:f.node}); emit(f.view,'pointerup',{...f.pointer,clientX:50}); emit(f.node,'click',f.pointer);
    expect(f.close).not.toHaveBeenCalled();
  });
  it('uses ordinary dialog bounds, leaving its own padding intact', () => {
    const f = fixture(false); const inside = {...f.pointer,clientX:120,clientY:120};
    emit(f.view,'pointerdown',inside); emit(f.view,'pointerup',inside); emit(f.node,'click',inside); expect(f.close).not.toHaveBeenCalled();
    emit(f.view,'pointerdown',f.pointer); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer); expect(f.close).toHaveBeenCalledOnce();
  });
  it('does not mistake input focus blur during a backdrop tap for window blur', () => {
    const f = fixture(); emit(f.view,'pointerdown',{...f.pointer,target:f.node}); emit(f.view,'blur',{target:f.content}); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer); expect(f.close).toHaveBeenCalledOnce();
  });
  it('clears on close, preserves native cancel, and removes all listeners on destroy', () => {
    const f = fixture(); emit(f.view,'pointerdown',{...f.pointer,target:f.node}); emit(f.view,'pointerup',f.pointer); emit(f.node,'close'); emit(f.node,'click',f.pointer);
    expect(emit(f.node,'cancel').defaultPrevented).toBe(false); f.action.destroy();
    emit(f.view,'pointerdown',{...f.pointer,target:f.node}); emit(f.view,'pointerup',f.pointer); emit(f.node,'click',f.pointer); expect(f.close).not.toHaveBeenCalled();
  });
});
