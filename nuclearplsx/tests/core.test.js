'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/core.js'), 'utf8');
const storageKey = 'nuclear-epoch:v1';

function events(target = {}) {
  const listeners = new Map();
  return Object.assign(target, {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type, event = {}) {
      for (const fn of [...(listeners.get(type) || [])]) fn(event);
    },
    listenerCount(type) { return listeners.get(type)?.size || 0; }
  });
}

function runtime(saved) {
  let timerId = 0;
  let focused = 0;
  const timers = new Map();
  const writes = [];
  const frames = [];
  const storage = new Map(saved === undefined ? [] : [[storageKey, saved]]);
  const overlays = [];
  const window = events({ NEG: {}, scrollTo() {} });
  const document = events({
    readyState: 'loading', visibilityState: 'visible',
    activeElement: { focus() { focused++; } },
    body: { style: { overflow: '' }, classList: { contains() { return false; } } },
    querySelectorAll() { return []; }
  });
  function element() {
    const children = new Map();
    return events({
      style: {}, dataset: {}, offsetParent: {},
      classList: { add() {}, remove() {}, toggle() {} },
      focus() { focused++; document.activeElement = this; },
      setAttribute() {},
      querySelector(sel) {
        if (!children.has(sel)) children.set(sel, element());
        return children.get(sel);
      },
      querySelectorAll() { return []; },
      remove() { const index = overlays.indexOf(this); if (index >= 0) overlays.splice(index, 1); }
    });
  }
  const view = element();
  const toastRoot = element();
  document.getElementById = (id) => ({
    overlayRoot: { appendChild(el) { overlays.push(el); } }, view, toastRoot
  }[id] || null);
  document.createElement = element;
  const context = vm.createContext({
    window, document, console, navigator: {}, location: { hash: '' },
    history: { replaceState() {} },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); writes.push(JSON.parse(value)); },
      removeItem(key) { storage.delete(key); }
    },
    performance: { now() { return 0; } },
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(source, context);
  return {
    NEG: window.NEG, window, document, context, storage, writes, overlays, timers, frames,
    focused: () => focused,
    runTimers() {
      for (const [id, fn] of [...timers]) {
        if (!timers.delete(id)) continue;
        fn();
      }
    }
  };
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('malformed saved shapes retain usable defaults without losing unrelated progress', () => {
  for (const patch of [
    { modes: null, score: 14 },
    { modes: { rumor: false, dose: [], china: 'broken' }, settings: null, score: 14 },
    { modes: { rumor: { seen: null } }, achievements: null, flags: [], daily: null, score: 14 }
  ]) {
    const { NEG } = runtime(JSON.stringify(patch));
    const state = NEG.store.get();
    assert.equal(state.score, 14);
    assert.deepEqual(plain(state.modes.rumor.seen), []);
    assert.deepEqual(plain(state.modes.dose.viewed), []);
    assert.deepEqual(plain(state.modes.china.viewed), []);
    assert.equal(state.settings.sound, true);
    assert.equal(state.daily.done, false);
    assert.doesNotThrow(() => NEG.achievements.checkAll({ silent: true }));
  }
});

test('valid progress survives loading while invalid numbers and duplicate IDs are removed', () => {
  const { NEG } = runtime(JSON.stringify({
    score: '21', bestScore: 'Infinity', settings: { sound: false },
    modes: {
      rumor: { answered: 9, seen: [1, 1, 2, -1, '3', null] },
      dose: { viewed: ['banana', 'banana', 4, null] },
      china: { viewed: [0, 0, 1, -1, null] },
      console: { bestEnergy: 42.5, completed: -3 }
    }
  }));
  const state = NEG.store.get();
  assert.equal(state.score, 21);
  assert.equal(state.bestScore, 21);
  assert.equal(state.settings.sound, false);
  assert.equal(state.modes.rumor.answered, 9);
  assert.equal(state.modes.console.bestEnergy, 42.5);
  assert.equal(state.modes.console.completed, 0);
  assert.deepEqual(plain(state.modes.rumor.seen), [1, 2]);
  assert.deepEqual(plain(state.modes.dose.viewed), ['banana']);
  assert.deepEqual(plain(state.modes.china.viewed), [0, 1]);
});

test('saved prototype keys cannot mutate the runtime object prototype', () => {
  const r = runtime('{"__proto__":{"polluted":true},"modes":{"constructor":{"prototype":{"polluted":true}}},"score":8}');
  assert.equal(vm.runInContext('({}).polluted', r.context), undefined);
  assert.equal(r.NEG.store.get().score, 8);
  assert.equal(Object.hasOwn(r.NEG.store.get().modes, 'constructor'), false);
});

test('invalid JSON and unavailable storage both fall back to usable in-memory progress', () => {
  const r = runtime('{');
  assert.equal(r.NEG.store.get().score, 0);
  vm.runInContext('localStorage.setItem = () => { throw new Error("denied"); }', r.context);
  assert.doesNotThrow(() => {
    r.NEG.store.addScore(10);
    r.NEG.store.flush();
    r.window.emit('pagehide');
  });
  assert.equal(r.NEG.store.get().score, 10);
});

test('page hiding flushes the latest debounced progress once before timers run', () => {
  const r = runtime();
  r.NEG.store.addScore(10);
  r.NEG.store.addScore(5);
  assert.equal(r.writes.length, 0);
  r.document.visibilityState = 'hidden';
  r.document.emit('visibilitychange');
  assert.equal(r.writes.length, 1);
  assert.equal(r.writes[0].score, 15);
  r.window.emit('pagehide');
  r.runTimers();
  assert.equal(r.writes.length, 1);
  r.NEG.store.addScore(2);
  r.window.emit('pagehide');
  assert.equal(r.writes[1].score, 17);
});

test('regular saves remain debounced and reset cannot restore a queued old score', () => {
  const r = runtime();
  r.NEG.store.addScore(10);
  r.NEG.store.addScore(5);
  r.runTimers();
  assert.equal(r.writes.length, 1);
  assert.equal(r.writes[0].score, 15);
  r.NEG.store.addScore(20);
  r.NEG.store.reset();
  r.window.emit('pagehide');
  r.runTimers();
  assert.equal(r.writes.length, 2);
  assert.equal(r.writes[1].score, 0);
});

test('routing closes dialogs through their lifecycle and settles pending confirmations', { timeout: 1000 }, async () => {
  const r = runtime();
  const confirmation = r.NEG.ui.confirm({ title: 'Confirm' });
  assert.equal(r.document.listenerCount('keydown'), 1);
  assert.equal(r.overlays.length, 1);
  r.NEG.tasks = {
    get() { return { id: 'home', title: 'Home' }; }, mount() {}
  };
  r.NEG.router.go('home');
  assert.equal(await confirmation, false);
  assert.equal(r.document.listenerCount('keydown'), 0);
  assert.equal(r.overlays.length, 0);
  assert.equal(r.document.body.style.overflow, '');
  // Only route focus runs; the removed dialog cannot steal focus via its timer.
  assert.equal(r.focused(), 1);
  r.runTimers();
  assert.equal(r.focused(), 1);
});

test('Escape closes only the top dialog and retains scroll lock until the final close', () => {
  const r = runtime();
  let closed = 0;
  const lower = r.NEG.ui.modal({ title: 'Lower', onClose() { closed++; } });
  r.NEG.ui.modal({ title: 'Upper', onClose() { closed++; } });
  r.document.emit('keydown', { key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(closed, 1);
  assert.equal(r.overlays.length, 1);
  assert.equal(r.document.body.style.overflow, 'hidden');
  lower.close();
  lower.close();
  assert.equal(closed, 2);
  assert.equal(r.document.body.style.overflow, '');
  assert.equal(r.document.listenerCount('keydown'), 0);
});


test('the all-rumors achievement follows current question IDs instead of stale counts', () => {
  const { NEG } = runtime();
  NEG.data.rumors = [{ id: 101 }, { id: 102 }];
  const achievement = NEG.achievements.get('debunk_all');
  const state = NEG.store.get();
  state.modes.rumor.seen = Array.from({ length: 32 }, (_, index) => index + 1);
  assert.equal(achievement.check(state), false);
  state.modes.rumor.seen = [101, 102];
  assert.equal(achievement.check(state), true);
  NEG.data.rumors = [];
  assert.equal(achievement.check(state), false);
});

test('count-up renders the final formatted number without animation for reduced motion', () => {
  for (const preference of ['system', 'app']) {
    const r = runtime();
    if (preference === 'system') r.window.matchMedia = () => ({ matches: true });
    else r.document.body.classList.contains = (value) => value === 'reduce-motion';
    const el = { isConnected: true, dataset: {} };
    r.NEG.ui.countUp(el, 42.5, { decimals: 1, format: (value) => value.toFixed(1) });
    assert.equal(el.textContent, '42.5');
    assert.equal(el.dataset.dec, 1);
    assert.equal(r.frames.length, 0);
  }
});

test('count-up animates normally but stops scheduling once its element is detached', () => {
  const r = runtime();
  const el = { isConnected: true, dataset: {} };
  r.NEG.ui.countUp(el, 100);
  assert.equal(r.frames.length, 1);
  r.frames[0](100);
  assert.equal(r.frames.length, 2);
  el.isConnected = false;
  r.frames[1](200);
  assert.equal(r.frames.length, 2);
});
