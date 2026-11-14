import assert from 'node:assert/strict';
import test from 'node:test';
import { createTabBarScrollController } from './tab-bar-scroll-controller.ts';

function setup() {
  let time = 0;
  let nextId = 0;
  let scheduled = 0;
  const pending = new Map();
  const changes = [];
  const controller = createTabBarScrollController({
    onVisibilityChange: visible => changes.push(visible),
    now: () => time,
    schedule: (callback, delay) => {
      scheduled++;
      const id = ++nextId;
      pending.set(id, { callback, due: time + delay });
      return id;
    },
    cancel: id => pending.delete(id),
  });
  const advance = duration => {
    const target = time + duration;
    while (true) {
      const next = [...pending].sort((a, b) => a[1].due - b[1].due)[0];
      if (!next || next[1].due > target) break;
      time = next[1].due;
      pending.delete(next[0]);
      next[1].callback();
    }
    time = target;
  };
  return { controller, changes, pending, advance, scheduled: () => scheduled };
}

test('hundreds of scroll frames use one timer and only visibility-transition updates', () => {
  const state = setup();
  for (let index = 1; index <= 600; index++) {
    state.controller.onOffset(index * 8);
    state.advance(16);
    assert.ok(state.pending.size <= 1);
  }
  assert.deepEqual(state.changes, [false]);
  assert.ok(state.scheduled() < 25, 'idle checks are not recreated for every scroll frame');
  state.controller.settle();
  state.advance(499);
  assert.deepEqual(state.changes, [false]);
  state.advance(1);
  assert.deepEqual(state.changes, [false, true]);
});

test('slow momentum never reveals the navigation bar in the middle of a scroll', () => {
  const state = setup();
  state.controller.onOffset(20);
  for (let index = 1; index <= 80; index++) {
    state.advance(32);
    state.controller.onOffset(20 + index);
  }
  assert.deepEqual(state.changes, [false]);
  state.advance(500);
  assert.deepEqual(state.changes, [false, true]);
});

test('reverse scrolling or tapping reveals immediately and cancels pending work', () => {
  for (const reveal of [controller => controller.reveal(), controller => controller.onOffset(80)]) {
    const state = setup();
    state.controller.onOffset(100);
    reveal(state.controller);
    assert.equal(state.pending.size, 0);
    state.advance(1000);
    assert.deepEqual(state.changes, [false, true]);
  }
});

test('starting a drag does not flash the tab bar or resize the Home viewport', () => {
  const state = setup();
  state.controller.onOffset(100);
  state.controller.beginTouch(30, 300);
  assert.deepEqual(state.changes, [false], 'finger down alone never reveals during momentum');
  state.controller.cancelTouch();
  state.controller.endTouch(30, 300);
  assert.deepEqual(state.changes, [false]);
  state.controller.beginTouch(30, 300);
  state.controller.endTouch(32, 302);
  assert.deepEqual(state.changes, [false, true], 'a real tap still reveals immediately');
});

test('cleanup cancels idle work and remains safe for Strict Mode effect replay', () => {
  const state = setup();
  state.controller.onOffset(20);
  state.controller.dispose();
  assert.equal(state.pending.size, 0);
  state.advance(1000);
  assert.deepEqual(state.changes, [false]);
  state.controller.onOffset(40);
  state.advance(500);
  assert.deepEqual(state.changes, [false, true]);
});

test('invalid offsets and bounce below zero cannot create spurious visibility updates', () => {
  const state = setup();
  for (const offset of [NaN, Infinity, -Infinity, -15, 0]) state.controller.onOffset(offset);
  assert.deepEqual(state.changes, []);
  assert.equal(state.pending.size, 0);
  state.controller.onOffset(20);
  state.controller.onOffset(-2);
  assert.deepEqual(state.changes, [false, true]);
});
