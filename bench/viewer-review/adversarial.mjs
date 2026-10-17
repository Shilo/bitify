import assert from 'node:assert/strict';
import { viewerNavigation } from '../../src/lib/viewer-navigation.js';

// Independent review probe: three-pointer release orders and canceled sequences
// beyond the production suite's two-pointer scenarios. No DOM/capture mock.
const geometry = { width: 800, height: 600, imageWidth: 800, imageHeight: 600 };
const permutations = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
let assertions = 0;
for (const order of permutations) for (const cancellation of ['none', 'cancel', 'resize']) {
  let closed = 0, held = false;
  const navigation = viewerNavigation({ onclose() { closed++; }, onhold(value) { held = value; } });
  navigation.resize(geometry); navigation.zoomBy(3);
  const positions = { 1: [300, 250], 2: [500, 250], 3: [400, 350] };
  const event = id => ({ pointerId: id, clientX: positions[id][0], clientY: positions[id][1], button: 0, isPrimary: id === 1, timeStamp: 100 });
  for (const id of [1, 2, 3]) navigation.down(event(id));
  positions[1] = [280, 230]; navigation.move(event(1));
  positions[2] = [520, 260]; navigation.move(event(2));
  const beforeLift = navigation.view;
  navigation.up(event(order[0]));
  assert.deepEqual(navigation.view, beforeLift, `lifting ${order[0]} must rebase without jumping`); assertions++;
  if (cancellation === 'cancel') navigation.cancel();
  if (cancellation === 'resize') navigation.resize({ ...geometry, width: 600 });
  for (const id of order.slice(1)) {
    positions[id][0] += 20; navigation.move(event(id)); navigation.up(event(id));
  }
  assert.equal(navigation.click(), false, 'a three-pointer sequence must never become a dismissal');
  assert.equal(closed, 0, 'no close callback after manipulation/cancellation');
  assert.equal(held, false, 'comparison cannot remain held after final lift');
  assert.equal(navigation.active, false, 'all pointers must retire'); assertions += 4;
  navigation.cancel();
}
for (const scale of [.25, 1, 2, 16]) {
  const navigation = viewerNavigation(); navigation.resize(geometry); navigation.zoomBy(scale);
  navigation.down({ pointerId: 1, clientX: 300, clientY: 300, button: 0, isPrimary: true, timeStamp: 0 });
  navigation.move({ pointerId: 1, clientX: 309, clientY: 300 });
  navigation.move({ pointerId: 1, clientX: 300, clientY: 300 });
  navigation.up({ pointerId: 1, clientX: 300, clientY: 300, timeStamp: 100 });
  assert.equal(navigation.click(), false, `returning a drag to its origin cannot dismiss at zoom ${scale}`); assertions++;
  navigation.cancel();
}
console.log(JSON.stringify({ assertions, pass: true }));
