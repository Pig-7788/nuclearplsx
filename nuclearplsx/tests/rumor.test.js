const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function element(dataset = {}) {
  const handlers = new Map();
  const classes = new Set();
  return {
    dataset, handlers, style: {}, cards: [], offsetWidth: 200,
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, value) { value ? classes.add(name) : classes.delete(name); }
    },
    set innerHTML(value) {
      this.html = value;
      this.cards = [...value.matchAll(/data-option="(\d+)"/g)].map(match => element({ option: match[1] }));
    },
    get innerHTML() { return this.html || ''; },
    addEventListener(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(fn);
    },
    removeEventListener(type, fn) { handlers.get(type)?.delete(fn); },
    emit(type, data = {}) {
      const event = { type, preventDefault() {}, ...data };
      [...(handlers.get(type) || [])].forEach(fn => fn(event));
    },
    getBoundingClientRect() { return { left: 0, right: 100, top: 0, bottom: 100 }; },
    cloneNode() { return element(); },
    querySelector() { return this.nextButton || (this.nextButton = element()); }
  };
}

function setup(count = 12, initialSeen = []) {
  let mode;
  const pool = Array.from({ length: count }, (_, i) => ({
    id: i + 1, category: 'daily', difficulty: 1, text: 'rumor-' + (i + 1),
    truth: 'truth', distractors: ['wrong-a', 'wrong-b'], explain: 'explanation',
    fact: { label: 'label', value: 'value' }
  }));
  const fields = Object.fromEntries(['stage', 'answerCol', 'dropzone', 'qIndex', 'qTotal', 'qProgress', 'roundScore', 'streakBadge', 'seenCount'].map(id => [id, element()]));
  const restart = element();
  const chips = ['all', 'daily', 'safety', 'frontier', 'china'].map(cat => element({ cat }));
  const root = {
    querySelector(selector) { return selector === '[data-action="restart"]' ? restart : fields[selector.slice(1)]; },
    querySelectorAll() { return chips; }
  };
  const ghosts = new Set();
  const doc = {
    ...element(), overlay: false,
    querySelector() { return this.overlay ? {} : null; },
    body: { ...element(), appendChild(ghost) { ghosts.add(ghost); ghost.remove = () => ghosts.delete(ghost); } }
  };
  const NEG = {
    data: { rumors: pool }, registerMode(def) { mode = def; }, icon() { return ''; },
    shell: { full() { return () => {}; } }
  };
  const win = { ...element(), NEG };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/modes/rumor.js'), 'utf8'), {
    window: win, document: doc, setTimeout, clearTimeout
  });
  const state = { modes: { rumor: { seen: initialSeen } }, flags: {}, score: 0 };
  const cleanup = mode.render(root, {
    data: NEG.data,
    store: { get() { return state; }, set(fn) { fn(state); }, addScore(delta) { state.score += delta; } },
    ui: { qsa(_, target) { return target.cards; }, toast() {}, modal() {} },
    audio: { play() {} }, achievements: { checkAll() {} },
    util: { shuffle(values) { return values.slice(); }, esc: String, vibrate() {}, isTyping(event) { return event.typing || false; } }
  });
  return { mode, fields, restart, doc, win, state, ghosts, cleanup };
}

test('progress follows the current question bank and ignores retired or duplicate IDs', () => {
  const env = setup(3, [1, 1, 99]);
  assert.equal(env.mode.progress(env.state), 1 / 3);
  assert.equal(env.mode.isComplete(env.state), false);
  env.state.modes.rumor.seen = [1, 2, 3];
  assert.equal(env.mode.isComplete(env.state), true);
  env.cleanup();
  const empty = setup(0);
  assert.equal(empty.mode.progress(empty.state), 0);
  assert.equal(empty.mode.isComplete(empty.state), false);
  empty.cleanup();
});

test('restarting in the same visit prioritizes questions that have not just been answered', () => {
  const env = setup();
  env.doc.emit('keydown', { key: '1' });
  assert.equal(env.fields.seenCount.textContent, '已答 1 条');
  env.restart.emit('click');
  assert.match(env.fields.stage.innerHTML, /rumor-2</);
  env.cleanup();
});

test('help dialogs and text inputs protect both answering and advancing from shortcuts', () => {
  const env = setup();
  env.doc.overlay = true;
  env.doc.emit('keydown', { key: '1' });
  assert.equal(env.state.score, 0);
  env.doc.overlay = false;
  env.doc.emit('keydown', { key: '1', typing: true });
  assert.equal(env.state.score, 0);
  env.doc.emit('keydown', { key: '1' });
  env.doc.overlay = true;
  env.doc.emit('keydown', { key: 'Enter' });
  assert.match(env.fields.stage.innerHTML, /rumor-1</);
  env.doc.overlay = false;
  env.doc.emit('keydown', { key: 'Enter', typing: true });
  assert.match(env.fields.stage.innerHTML, /rumor-1</);
  env.doc.emit('keydown', { key: 'Enter' });
  assert.match(env.fields.stage.innerHTML, /rumor-2</);
  env.cleanup();
});

test('cancelled and unrelated pointer events cannot submit an answer', () => {
  const env = setup();
  const card = env.fields.answerCol.cards[0];
  card.emit('pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
  env.doc.emit('pointermove', { pointerId: 1, clientX: 30, clientY: 30 });
  assert.equal(env.ghosts.size, 1);
  env.doc.emit('pointerup', { pointerId: 2, clientX: 30, clientY: 30 });
  assert.equal(env.ghosts.size, 1);
  assert.equal(env.state.score, 0);
  env.doc.emit('pointercancel', { pointerId: 1, clientX: 30, clientY: 30 });
  assert.equal(env.state.score, 0);
  assert.equal(env.ghosts.size, 0);
  assert.equal(env.doc.handlers.get('pointermove').size, 0);
  card.emit('click');
  assert.equal(env.state.score, 12, 'a cancelled gesture must not suppress the next tap');
  env.cleanup();
});

test('switching questions or leaving during a drag removes listeners and the drag image', () => {
  for (const leave of [false, true]) {
    const env = setup();
    const card = env.fields.answerCol.cards[0];
    card.emit('pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    env.doc.emit('pointermove', { pointerId: 1, clientX: 30, clientY: 30 });
    if (leave) env.cleanup();
    else env.restart.emit('click');
    assert.equal(env.ghosts.size, 0);
    for (const type of ['pointermove', 'pointerup', 'pointercancel']) assert.equal(env.doc.handlers.get(type).size, 0);
    assert.equal(card.handlers.get('pointerdown').size, 0);
    assert.equal(card.handlers.get('click').size, 0);
    env.cleanup();
  }
});

test('losing window focus cancels the drag and allows a fresh drag on return', () => {
  const env = setup();
  const card = env.fields.answerCol.cards[0];
  card.emit('pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
  env.doc.emit('pointermove', { pointerId: 1, clientX: 30, clientY: 30 });
  env.win.emit('blur');
  assert.equal(env.ghosts.size, 0);
  assert.equal(env.state.score, 0);
  card.emit('pointerdown', { pointerId: 2, button: 0, clientX: 0, clientY: 0 });
  env.doc.emit('pointermove', { pointerId: 2, clientX: 30, clientY: 30 });
  env.doc.emit('pointerup', { pointerId: 2, clientX: 30, clientY: 30 });
  assert.equal(env.state.score, 12);
  assert.equal(env.ghosts.size, 0);
  assert.equal(env.win.handlers.get('blur').size, 0);
  env.cleanup();
});
