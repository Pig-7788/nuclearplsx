'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const registrySource = fs.readFileSync(path.join(__dirname, '../assets/js/main-plays.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(__dirname, '../assets/js/modes/main.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');

function events(target = {}) {
  const listeners = new Map();
  return Object.assign(target, {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type, extra = {}) {
      const event = { type, target: this, preventDefault() {}, ...extra };
      for (const fn of [...(listeners.get(type) || [])]) fn(event);
    }
  });
}

// Only the small semantic DOM surface used by the generic chapter host is needed.
// Lesson content and every game in this fixture are artificial, non-technical text.
class Element {
  constructor(tag = 'div', attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.dataset = {};
    this.children = [];
    this.style = { setProperty() {}, removeProperty() {} };
    this.clientHeight = 0;
    this.scrollHeight = 0;
    this.disabled = Object.hasOwn(attrs, 'disabled');
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    const classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    this.classList = { add(...names) { names.forEach(n => classes.add(n)); }, remove(...names) { names.forEach(n => classes.delete(n)); }, contains(name) { return classes.has(name); } };
    events(this);
  }
  set innerHTML(html) {
    this.html = String(html);
    this.children = [];
    const stack = [this];
    for (const token of this.html.matchAll(/<\/?[^>]+>|[^<]+/g)) {
      const value = token[0];
      if (value.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (!value.startsWith('<')) { stack[stack.length - 1].text = (stack[stack.length - 1].text || '') + value; continue; }
      const tag = /^<([\w-]+)/.exec(value)?.[1];
      if (!tag) continue;
      const attrs = {};
      const rest = value.slice(tag.length + 1, -1);
      for (const attr of rest.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[attr[1]] = attr[2] ?? '';
      const element = new Element(tag, attrs);
      stack[stack.length - 1].children.push(element);
      if (!value.endsWith('/>') && !['input', 'br', 'hr', 'img', 'meta', 'link'].includes(tag)) stack.push(element);
    }
  }
  get innerHTML() { return this.html || ''; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }
  matches(selector) {
    if (selector.startsWith('#')) return this.attrs.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    const attr = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(selector);
    if (attr) return Object.hasOwn(this.attrs, attr[1]) && (attr[2] === undefined || this.attrs[attr[1]] === attr[2]);
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {
    const matches = [];
    for (const child of this.children) {
      if (child.matches(selector)) matches.push(child);
      matches.push(...child.querySelectorAll(selector));
    }
    return matches;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  get firstElementChild() { return this.children[0] || null; }
}

function runtime() {
  const window = events({ NEG: {} });
  const document = events({ body: new Element('body'), querySelector() { return null; } });
  const timers = new Map();
  let timer = 0;
  const context = vm.createContext({
    window, document, console: { warn() {}, error() {} },
    setTimeout(fn) { timers.set(++timer, fn); return timer; },
    clearTimeout(id) { timers.delete(id); },
    getComputedStyle() { return { fontSize: '16px' }; }
  });
  vm.runInContext(registrySource, context);
  let mode;
  const NEG = window.NEG;
  NEG.registerMode = (def) => { mode = def; };
  NEG.icon = () => '';
  NEG.shell = { full: () => () => {} };
  NEG.story = {
    order: ['lesson1', 'lesson2'],
    lesson1: { module_id: 'lesson1', title: 'Lesson one', narrative: { scenes: [{ text: 'Read the lesson.' }] }, gameplay: { type: 'test_game' }, knowledge_cards: [], next_module_id: 'lesson2' },
    lesson2: { module_id: 'lesson2', title: 'Lesson two', unlock_condition: 'lesson1_completed', narrative: { scenes: [{ text: 'Another lesson.' }] }, knowledge_cards: [] }
  };
  vm.runInContext(mainSource, context);
  const state = { modes: { main: { current: 'lesson1', panelIndex: 0, completed: [], cards: [], games: {} } } };
  let saves = 0;
  const savedStates = [];
  const ctx = {
    store: { get: () => state, save() { saves++; savedStates.push(JSON.parse(JSON.stringify(state))); } },
    ui: { qsa: (selector, root) => root.querySelectorAll(selector), toast() {} },
    util: { esc: value => String(value ?? ''), isTyping: () => false },
    audio: { play() {} }, achievements: { checkAll() {} }
  };
  const root = new Element();
  return {
    NEG, window, state, root, timers, mode, savedStates, saves: () => saves,
    render() { return mode.render(root, ctx); },
    click(selector) {
      const element = root.querySelector(selector);
      assert.ok(element, `missing control ${selector}`);
      element.emit('click');
    },
    runTimers() {
      for (const [id, fn] of [...timers]) {
        if (timers.delete(id)) fn();
      }
    }
  };
}

test('registry completes once, releases resources first and ignores callbacks after disposal', () => {
  const env = runtime();
  let complete;
  const log = [];
  env.NEG.mainPlays.register('test', { mount(_, __, ___, done) { complete = done; return () => log.push('cleanup'); } });
  const release = env.NEG.mainPlays.mount('test', {}, {}, {}, result => log.push(result.ok));
  complete({ ok: true });
  complete({ ok: true });
  release();
  assert.deepEqual(log, ['cleanup', true]);
  const release2 = env.NEG.mainPlays.mount('test', {}, {}, {}, () => log.push('late'));
  release2();
  complete({ ok: true });
  assert.deepEqual(log, ['cleanup', true, 'cleanup']);
});

test('registry handles synchronous completion and resource-free games, while explicit mount failure remains retryable', () => {
  const env = runtime();
  const log = [];
  env.NEG.mainPlays.register('sync', { mount(_, __, ___, done) { done({ ok: true }); done({ ok: true }); return () => log.push('cleanup'); } });
  const release = env.NEG.mainPlays.mount('sync', {}, {}, {}, () => log.push('done'));
  assert.equal(typeof release, 'function');
  assert.deepEqual(log, ['cleanup', 'done']);
  env.NEG.mainPlays.register('simple', { mount() {} });
  assert.equal(typeof env.NEG.mainPlays.mount('simple', {}, {}, {}, () => {}), 'function');
  env.NEG.mainPlays.register('unavailable', { mount() { return null; } });
  assert.equal(env.NEG.mainPlays.mount('unavailable', {}, {}, {}, () => {}), null);
  assert.equal(env.NEG.mainPlays.has('constructor'), false);
});

test('chapter completion only counts unique current lesson identifiers', () => {
  const env = runtime();
  env.state.modes.main.completed = ['lesson1', 'lesson1', 'retired'];
  assert.equal(env.mode.progress(env.state), 0.5);
  assert.equal(env.mode.isComplete(env.state), false);
});

function asyncLesson(env) {
  const attempts = [];
  env.NEG.mainPlays.register('test_game', { mount(container, payload, ctx, done) {
    container.innerHTML = '<p id="activeGame">Game in progress</p>';
    const attempt = { done, cleaned: 0 };
    attempts.push(attempt);
    return () => { attempt.cleaned++; };
  } });
  const cleanup = env.render();
  env.click('[data-resume]');
  env.click('[data-action="next"]');
  return { attempts, cleanup };
}

test('reading size is saved before entry and retained when opening a chapter', () => {
  const env = runtime();
  const cleanup = env.render();
  const select = env.root.querySelector('[data-reading-size]');
  assert.equal(select.value, 'standard');
  select.value = 'large';
  select.emit('change');
  assert.equal(env.state.settings.readingSize, 'large');
  env.click('[data-resume]');
  assert.equal(env.root.querySelector('[data-reading-size]').value, 'large');
  cleanup();
});

test('changing reading size during a game preserves the active game and its progress', () => {
  const env = runtime();
  const { attempts, cleanup } = asyncLesson(env);
  const game = env.root.querySelector('#activeGame');
  const select = env.root.querySelector('[data-reading-size]');
  select.value = 'extra';
  select.emit('change');
  assert.equal(env.state.settings.readingSize, 'extra');
  assert.equal(env.root.querySelector('#activeGame'), game);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].cleaned, 0);
  cleanup();
});

test('resize during a game preserves the game and skipping releases it before late completion can write progress', () => {
  const env = runtime();
  const { attempts, cleanup } = asyncLesson(env);
  const saves = env.saves();
  env.window.emit('resize');
  env.runTimers();
  assert.ok(env.root.querySelector('#activeGame'));
  assert.equal(env.saves(), saves);
  env.click('[data-action="skip"]');
  assert.equal(attempts[0].cleaned, 1);
  assert.ok(env.root.querySelector('.main-done'));
  attempts[0].done({ ok: true });
  assert.equal(env.state.modes.main.games['lesson1::test_game'], undefined);
  assert.equal(env.state.modes.main.current, 'lesson2');
  cleanup();
});

test('failed and unavailable games can be entered again without marking them complete', () => {
  const env = runtime();
  const { attempts, cleanup } = asyncLesson(env);
  attempts[0].done({ ok: false });
  assert.equal(env.state.modes.main.games['lesson1::test_game'], undefined);
  assert.match(env.root.querySelector('[data-action="next"]').textContent, /进入关卡/);
  env.click('[data-action="next"]');
  assert.equal(attempts.length, 2);
  cleanup();

  const missing = runtime();
  let mounts = 0;
  missing.NEG.mainPlays.register('test_game', { mount() { mounts++; return null; } });
  const release = missing.render();
  missing.click('[data-resume]');
  missing.click('[data-action="next"]');
  missing.click('[data-action="next"]');
  assert.equal(mounts, 2);
  assert.deepEqual(Object.keys(missing.state.modes.main.games), []);
  release();
});

test('synchronously completed games clean up once and resize cannot move a finished chapter back to the old lesson', () => {
  const env = runtime();
  let released = 0;
  env.NEG.mainPlays.register('test_game', { mount(_, __, ___, done) { done({ ok: true }); return () => { released++; }; } });
  const cleanup = env.render();
  env.click('[data-resume]');
  env.click('[data-action="next"]');
  assert.equal(released, 1);
  assert.equal(env.state.modes.main.games['lesson1::test_game'].ok, true);
  env.click('[data-action="next"]');
  assert.equal(env.state.modes.main.current, 'lesson2');
  env.window.emit('resize');
  env.runTimers();
  assert.equal(env.state.modes.main.current, 'lesson2');
  cleanup();
  assert.equal(released, 1);
});

test('leaving cancels pending resize work and invalidates an active game callback', () => {
  const env = runtime();
  env.NEG.mainPlays.register('test_game', { mount() {} });
  const cleanup = env.render();
  env.click('[data-resume]');
  env.window.emit('resize');
  assert.equal(env.timers.size, 1);
  const saves = env.saves();
  cleanup();
  assert.equal(env.timers.size, 0);
  env.runTimers();
  assert.equal(env.saves(), saves);

  const active = runtime();
  const lesson = asyncLesson(active);
  lesson.cleanup();
  lesson.attempts[0].done({ ok: true });
  assert.equal(active.state.modes.main.games['lesson1::test_game'], undefined);
  assert.equal(lesson.attempts[0].cleaned, 1);
});

function finalLesson(env) {
  env.NEG.story.lesson1.gameplay = { type: 'final_summary' };
  env.NEG.story.lesson1.module_type = 'final_summary';
  env.NEG.story.lesson1.next_module_id = null;
  let complete;
  env.NEG.mainPlays.register('final_summary', { mount(_, __, ___, done) { complete = done; return () => {}; } });
  const cleanup = env.render();
  env.click('[data-resume]');
  env.click('[data-action="next"]');
  return { complete, cleanup };
}

test('a completed final lesson persists the earned certificate in main progress', () => {
  const env = runtime();
  const lesson = finalLesson(env);
  lesson.complete({ ok: true, certificate: true });
  assert.equal(env.state.modes.main.certificate, true);
  assert.equal(env.savedStates.at(-1).modes.main.certificate, true);
  assert.equal(env.savedStates.at(-1).modes.main.games['lesson1::final_summary'].certificate, true);
  lesson.cleanup();
});

test('skipping the final lesson cannot award a certificate, including a late completion callback', () => {
  const env = runtime();
  const lesson = finalLesson(env);
  env.click('[data-action="skip"]');
  assert.equal(env.state.modes.main.certificate, false);
  assert.equal(env.savedStates.at(-1).modes.main.certificate, false);
  lesson.complete({ ok: true, certificate: true });
  assert.equal(env.state.modes.main.certificate, false);
  assert.equal(env.state.modes.main.games['lesson1::final_summary'], undefined);
  lesson.cleanup();
});

function deferredLoad() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function settleLoading() { for (let i = 0; i < 10; i++) await Promise.resolve(); }

test('skipping during a lazy lesson load cancels its future mount and ignores its completion', async () => {
  const env = runtime();
  const gate = deferredLoad();
  let loads = 0, mounts = 0;
  env.NEG.mainPlays.defineLoader('test_game', () => { loads++; return gate.promise; }, { label: '阅读关卡' });
  const cleanup = env.render();
  env.click('[data-resume]');
  env.click('[data-action="next"]');
  assert.match(env.root.querySelector('#mainPlayHost').textContent, /正在准备阅读关卡/);
  env.window.emit('resize'); env.runTimers();
  assert.ok(env.root.querySelector('#mainPlayHost'));
  env.click('[data-action="skip"]');
  env.NEG.mainPlays.register('test_game', { mount(_, __, ___, done) { mounts++; done({ ok: true }); } });
  gate.resolve();
  await settleLoading();
  assert.equal(loads, 1);
  assert.equal(mounts, 0);
  assert.ok(env.root.querySelector('.main-done'));
  assert.equal(env.state.modes.main.games['lesson1::test_game'], undefined);
  cleanup();
});

test('returning to the chapter menu during loading prevents a stale game but permits reentry', async () => {
  const env = runtime();
  const gate = deferredLoad();
  let mounts = 0, cleaned = 0;
  env.NEG.mainPlays.defineLoader('test_game', () => gate.promise);
  const cleanup = env.render();
  env.click('[data-resume]'); env.click('[data-action="next"]');
  env.click('[data-action="menu"]');
  env.NEG.mainPlays.register('test_game', { mount(host) {
    mounts++;
    host.innerHTML = '<p id="lazyGame">Ready</p>';
    return () => { cleaned++; };
  } });
  gate.resolve();
  await settleLoading();
  assert.equal(mounts, 0);
  assert.ok(env.root.querySelector('.main-grid'));
  env.click('[data-chapter="lesson1"]'); env.click('[data-action="next"]');
  assert.equal(mounts, 1);
  assert.ok(env.root.querySelector('#lazyGame'));
  cleanup();
  assert.equal(cleaned, 1);
});

test('a failed lazy import can retry in the chapter without saving a game result early', async () => {
  const env = runtime();
  const gate = deferredLoad();
  let loads = 0, complete;
  env.NEG.mainPlays.defineLoader('test_game', () => {
    loads++;
    if (loads === 1) return gate.promise;
    env.NEG.mainPlays.register('test_game', { mount(host, _, __, done) {
      host.innerHTML = '<p id="retriedGame">Ready</p>';
      complete = done;
    } });
  });
  const cleanup = env.render();
  env.click('[data-resume]'); env.click('[data-action="next"]');
  gate.reject(new Error('network unavailable'));
  await settleLoading();
  assert.ok(env.root.querySelector('[data-game-retry]'));
  assert.equal(env.state.modes.main.games['lesson1::test_game'], undefined);
  env.click('[data-game-retry]');
  await settleLoading();
  assert.equal(loads, 2);
  assert.ok(env.root.querySelector('#retriedGame'));
  assert.equal(env.state.modes.main.games['lesson1::test_game'], undefined);
  complete({ ok: true });
  assert.equal(env.state.modes.main.games['lesson1::test_game'].ok, true);
  assert.ok(env.root.querySelector('#mainText'));
  cleanup();
});
