'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The assembly state must be usable independently of the DOM and WebGL.
const sandbox = { window: { NEG: {} } };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '../assets/js/waste-barriers.js'), 'utf8'),
  sandbox,
  { filename: 'waste-barriers.js' }
);
const barriers = sandbox.window.NEG.WasteBarriers;
const ids = ['glass', 'container', 'buffer', 'rock'];
const plain = value => JSON.parse(JSON.stringify(value));

function tracked(progress) {
  const changes = [];
  let completions = 0;
  const state = barriers.createState({
    progress,
    onProgress(value) { changes.push(value); },
    onComplete() { completions++; }
  });
  return { state, changes, completions: () => completions };
}

test('the four barrier identifiers follow the inside-to-outside assembly order', () => {
  assert.deepEqual(Array.from(barriers.layers, layer => layer.id), ids);
  assert.equal(new Set(Array.from(barriers.layers, layer => layer.id)).size, 4);
});

test('saved progress accepts only finite numbers and normalizes them to four complete steps', () => {
  assert.equal(barriers.createState().getProgress(), 0);
  for (const progress of [undefined, null, '', '2', NaN, Infinity, -Infinity, {}, [], true]) {
    assert.equal(barriers.createState({ progress }).getProgress(), 0);
  }
  for (const [progress, expected] of [[-10, 0], [0, 0], [0.9, 0], [1.9, 1], [3.99, 3], [4, 4], [99, 4]]) {
    assert.equal(barriers.createState({ progress }).getProgress(), expected);
  }
});

test('unknown identifiers and out-of-order parts leave progress and callbacks unchanged', () => {
  const { state, changes, completions } = tracked();
  for (const id of ['__proto__', 'constructor', 'prototype', 'toString', '', null, undefined, 0, {}, []]) {
    assert.deepEqual(plain(state.place(id)), { status: 'unknown', progress: 0 });
  }
  for (const id of ids.slice(1)) {
    assert.deepEqual(plain(state.place(id)), { status: 'order', progress: 0 });
  }
  assert.equal(state.getProgress(), 0);
  assert.deepEqual(changes, []);
  assert.equal(completions(), 0);
});

test('a valid assembly publishes each step and completion exactly once', () => {
  const { state, changes, completions } = tracked();
  ids.forEach((id, index) => {
    assert.deepEqual(plain(state.place(id)), { status: 'placed', progress: index + 1 });
    assert.equal(state.getProgress(), index + 1);
    assert.equal(completions(), index === 3 ? 1 : 0);
  });
  assert.deepEqual(changes, [1, 2, 3, 4]);
  for (const id of ids) {
    assert.deepEqual(plain(state.place(id)), { status: 'already', progress: 4 });
  }
  assert.deepEqual(changes, [1, 2, 3, 4]);
  assert.equal(completions(), 1);
});

test('reselecting a placed part cannot skip the next barrier or award extra progress', () => {
  const { state, changes, completions } = tracked();
  state.place('glass');
  assert.deepEqual(plain(state.place('glass')), { status: 'already', progress: 1 });
  assert.deepEqual(plain(state.place('rock')), { status: 'order', progress: 1 });
  assert.equal(state.getProgress(), 1);
  assert.deepEqual(changes, [1]);
  assert.equal(completions(), 0);
  assert.deepEqual(plain(state.place('container')), { status: 'placed', progress: 2 });
});

test('restored progress resumes at the next step without replaying earned events', () => {
  const { state, changes, completions } = tracked(2);
  assert.deepEqual(changes, []);
  assert.equal(completions(), 0);
  assert.deepEqual(plain(state.place('glass')), { status: 'already', progress: 2 });
  assert.deepEqual(plain(state.place('rock')), { status: 'order', progress: 2 });
  assert.deepEqual(plain(state.place('buffer')), { status: 'placed', progress: 3 });
  assert.deepEqual(plain(state.place('rock')), { status: 'placed', progress: 4 });
  assert.deepEqual(changes, [3, 4]);
  assert.equal(completions(), 1);

  const complete = tracked(4);
  assert.equal(complete.completions(), 0);
  ids.forEach(id => assert.equal(complete.state.place(id).status, 'already'));
  assert.deepEqual(complete.changes, []);
  assert.equal(complete.completions(), 0);
});

test('reset publishes zero and permits a new completed assembly without stale part state', () => {
  const { state, changes, completions } = tracked();
  state.reset();
  assert.deepEqual(changes, [0]);
  ids.forEach(id => state.place(id));
  assert.equal(completions(), 1);
  state.reset();
  assert.equal(state.getProgress(), 0);
  assert.equal(changes.at(-1), 0);
  assert.deepEqual(plain(state.place('container')), { status: 'order', progress: 0 });
  ids.forEach(id => state.place(id));
  assert.equal(state.getProgress(), 4);
  assert.equal(completions(), 2);
  assert.deepEqual(changes, [0, 1, 2, 3, 4, 0, 1, 2, 3, 4]);
});

test('separate lesson instances keep their assembly state and callbacks independent', () => {
  const first = tracked();
  const second = tracked(1);
  ids.forEach(id => first.state.place(id));
  assert.equal(first.state.getProgress(), 4);
  assert.equal(second.state.getProgress(), 1);
  assert.deepEqual(second.changes, []);
  second.state.reset();
  assert.equal(second.state.getProgress(), 0);
  assert.equal(first.state.getProgress(), 4);
  assert.equal(first.completions(), 1);
  assert.equal(second.completions(), 0);
});
