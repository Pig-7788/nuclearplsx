'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/main-plays.js'), 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }

class Host {
  constructor() { this.attributes = {}; this.writes = []; this.button = null; }
  set innerHTML(value) {
    this.html = value;
    this.writes.push(value);
    if (value.includes('data-game-retry')) {
      const listeners = new Set();
      this.button = {
        addEventListener(_, fn) { listeners.add(fn); },
        removeEventListener(_, fn) { listeners.delete(fn); },
        click() { [...listeners].forEach(fn => fn()); },
        listeners
      };
      const reloadListeners = new Set();
      this.reloadButton = {
        addEventListener(_, fn) { reloadListeners.add(fn); },
        removeEventListener(_, fn) { reloadListeners.delete(fn); },
        click() { [...reloadListeners].forEach(fn => fn()); },
        listeners: reloadListeners
      };
    } else this.button = null;
  }
  get innerHTML() { return this.html || ''; }
  setAttribute(key, value) { this.attributes[key] = value; }
  querySelector(selector) { return selector === '[data-game-retry]' ? this.button : selector === '[data-game-reload]' ? this.reloadButton : null; }
}

function runtime(onReload = () => {}) {
  const window = { NEG: {}, location: { reload: onReload } };
  vm.runInNewContext(source, { window, console: { warn() {}, error() {} } });
  return window.NEG.mainPlays;
}

test('a cached native module failure offers a page reload without awarding completion', async () => {
  let reloads = 0, completed = 0;
  const registry = runtime(() => { reloads++; });
  registry.defineLoader('lesson', () => Promise.reject(new Error('cached module evaluation failure')));
  const host = new Host();
  const release = registry.mount('lesson', host, {}, {}, () => { completed++; });
  await settle();
  const reload = host.reloadButton;
  reload.click();
  assert.equal(reloads, 1);
  assert.equal(completed, 0);
  release();
  assert.equal(reload.listeners.size, 0);
});

test('declaring lesson metadata does not load its implementation', () => {
  const registry = runtime();
  let loads = 0;
  registry.defineLoader('lesson', () => { loads++; }, { label: '知识关卡' });
  assert.equal(registry.has('lesson'), true);
  assert.equal(registry.label('lesson'), '知识关卡');
  assert.equal(registry.get('lesson').lazy, true);
  assert.equal(registry.list().length, 1);
  assert.equal(registry.has('constructor'), false);
  assert.equal(loads, 0);
});

test('concurrent lesson entries share loading but mount independent live hosts', async () => {
  const registry = runtime();
  const gate = deferred();
  let loads = 0, mounts = 0;
  registry.defineLoader('lesson', () => { loads++; return gate.promise; });
  const first = new Host(), second = new Host();
  const releaseFirst = registry.mount('lesson', first, {}, {}, () => {});
  const releaseSecond = registry.mount('lesson', second, {}, {}, () => {});
  assert.equal(typeof releaseFirst, 'function');
  assert.match(first.innerHTML, /正在准备/);
  assert.equal(first.attributes['aria-busy'], 'true');
  const pending = registry.load('lesson');
  assert.equal(registry.load('lesson'), pending);
  await settle();
  assert.equal(loads, 1);
  registry.register('lesson', { mount(host) { mounts++; host.innerHTML = 'ready'; } });
  gate.resolve();
  await pending;
  await settle();
  assert.equal(mounts, 2);
  assert.equal(first.innerHTML, 'ready');
  assert.equal(second.innerHTML, 'ready');
  assert.equal(first.attributes['aria-busy'], 'false');
  releaseFirst(); releaseSecond();
});

test('leaving while loading prevents a late mount and completion', async () => {
  const registry = runtime();
  const gate = deferred();
  let mounts = 0, completions = 0;
  registry.defineLoader('lesson', () => gate.promise);
  const host = new Host();
  const release = registry.mount('lesson', host, {}, {}, () => { completions++; });
  release();
  const writes = host.writes.length;
  registry.register('lesson', { mount(_, __, ___, done) { mounts++; done({ ok: true }); } });
  gate.resolve();
  await settle();
  assert.equal(mounts, 0);
  assert.equal(completions, 0);
  assert.equal(host.writes.length, writes);
  assert.equal(host.attributes['aria-busy'], 'false');
});

test('a failed import displays a retry action and evicts the rejected promise', async () => {
  const registry = runtime();
  const first = deferred(), second = deferred();
  let loads = 0, mounted = 0;
  registry.defineLoader('lesson', () => (++loads === 1 ? first.promise : second.promise));
  const host = new Host();
  const release = registry.mount('lesson', host, {}, {}, () => {});
  await settle();
  first.reject(new Error('offline'));
  await settle();
  assert.match(host.innerHTML, /关卡暂时无法加载/);
  assert.equal(host.attributes['aria-busy'], 'false');
  const retry = host.button;
  retry.click(); retry.click();
  await settle();
  assert.equal(loads, 2);
  assert.equal(retry.listeners.size, 0);
  registry.register('lesson', { mount() { mounted++; } });
  second.resolve();
  await settle();
  assert.equal(mounted, 1);
  release();
});

test('registration before all imports finish cannot bypass pending dependencies', async () => {
  const registry = runtime();
  const gate = deferred();
  let mounts = 0;
  registry.defineLoader('lesson', () => gate.promise);
  const first = new Host(), second = new Host();
  const releaseFirst = registry.mount('lesson', first, {}, {}, () => {});
  registry.register('lesson', { mount() { mounts++; } });
  const releaseSecond = registry.mount('lesson', second, {}, {}, () => {});
  await settle();
  assert.equal(mounts, 0);
  gate.resolve();
  await settle();
  assert.equal(mounts, 2);
  releaseFirst(); releaseSecond();
});

test('an incomplete dependency load is retried even if the lesson registered early', async () => {
  const registry = runtime();
  let loads = 0, mounts = 0;
  registry.defineLoader('lesson', () => {
    loads++;
    registry.register('lesson', { mount() { mounts++; } });
    if (loads === 1) throw new Error('stylesheet unavailable');
  });
  const host = new Host();
  const release = registry.mount('lesson', host, {}, {}, () => {});
  await settle();
  assert.equal(mounts, 0);
  assert.ok(host.button);
  host.button.click();
  await settle();
  assert.equal(loads, 2);
  assert.equal(mounts, 1);
  release();
});

test('missing registration rejects the load and a disposed error host has no retry listener', async () => {
  const registry = runtime();
  let loads = 0;
  registry.defineLoader('lesson', () => { loads++; });
  await assert.rejects(registry.load('lesson'), /关卡未注册/);
  const host = new Host();
  const release = registry.mount('lesson', host, {}, {}, () => {});
  await settle();
  assert.equal(loads, 2);
  const retry = host.button;
  release();
  assert.equal(retry.listeners.size, 0);
  retry.click();
  await settle();
  assert.equal(loads, 2);
});

test('a new pending lesson in the same host replaces the previous owner', async () => {
  const registry = runtime();
  const first = deferred(), second = deferred();
  const mounted = [];
  registry.defineLoader('first', () => first.promise);
  registry.defineLoader('second', () => second.promise);
  const host = new Host();
  registry.mount('first', host, {}, {}, () => {});
  const release = registry.mount('second', host, {}, {}, () => {});
  registry.register('first', { mount() { mounted.push('first'); } });
  registry.register('second', { mount() { mounted.push('second'); } });
  first.resolve(); second.resolve();
  await settle();
  assert.deepEqual(mounted, ['second']);
  release();
});

test('a lazily loaded lesson cleans up before synchronous completion and completes once', async () => {
  const registry = runtime();
  const gate = deferred();
  const log = [];
  let late;
  registry.defineLoader('lesson', () => gate.promise);
  const release = registry.mount('lesson', new Host(), { value: 1 }, { context: true }, result => log.push(result.ok), { replay: true });
  registry.register('lesson', { mount(_, payload, ctx, done, opts) {
    assert.equal(payload.value, 1);
    assert.equal(ctx.context, true);
    assert.equal(opts.replay, true);
    late = done;
    done({ ok: true }); done({ ok: true });
    return () => log.push('cleanup');
  } });
  gate.resolve();
  await settle();
  late({ ok: true }); release();
  assert.deepEqual(log, ['cleanup', true]);
});

test('late callbacks from a failed mount cannot complete its successful retry', async () => {
  const registry = runtime();
  const gate = deferred();
  let failedDone, currentDone, mounts = 0, completions = 0, cleaned = 0;
  registry.defineLoader('lesson', () => gate.promise);
  const host = new Host();
  const release = registry.mount('lesson', host, {}, {}, () => { completions++; });
  registry.register('lesson', { mount(_, __, ___, done) {
    mounts++;
    if (mounts === 1) { failedDone = done; throw new Error('failed mount'); }
    currentDone = done;
    return () => { cleaned++; };
  } });
  gate.resolve();
  await settle();
  assert.ok(host.button);
  host.button.click();
  await settle();
  failedDone({ ok: true });
  assert.equal(completions, 0);
  currentDone({ ok: true });
  assert.equal(completions, 1);
  assert.equal(cleaned, 1);
  release();
});
