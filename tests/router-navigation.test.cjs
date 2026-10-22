'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = fs.readFileSync(path.join(__dirname, '../assets/js/core.js'), 'utf8');
const routerSource = core.slice(core.indexOf('  let navigation = 0;'), core.indexOf('  NEG.router = router;')) + '\nNEG.router = router;';
const managerSource = fs.readFileSync(path.join(__dirname, '../assets/js/task-manager.js'), 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function button() {
  const listeners = new Set();
  return {
    addEventListener(_, fn) { listeners.add(fn); },
    click() { [...listeners].forEach(fn => fn()); }
  };
}

function fixture() {
  const log = [], loads = [], writes = [], state = { modes: {}, lastMode: 'home' };
  let reloads = 0;
  const view = {
    attributes: {}, buttons: {}, scrollTop: 0, focused: 0,
    set innerHTML(value) {
      this.html = value; this.buttons = {};
      if (value.includes('data-route-retry')) this.buttons['[data-route-retry]'] = button();
      if (value.includes('data-route-home')) this.buttons['[data-route-home]'] = button();
    },
    get innerHTML() { return this.html || ''; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    querySelector(selector) { return this.buttons[selector] || null; },
    focus() { this.focused++; }
  };
  const links = ['home', 'a', 'b'].map(id => ({
    dataset: { mode: id }, attributes: {}, active: false,
    classList: { toggle(_, active) { this.active = active; } },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  }));
  const plans = new Map();
  const NEG = {};
  const document = {
    body: { style: {} }, title: '',
    getElementById(id) { return id === 'view' ? view : id === 'toastRoot' ? { innerHTML: '' } : null; },
    querySelectorAll() { return []; }
  };
  const context = vm.createContext({
    window: { NEG, scrollTo() {} }, document, NEG,
    console: { warn() {}, error() {} },
    history: { replaceState(_, __, hash) { log.push('hash:' + hash); } },
    location: { reload() { reloads++; } },
    U: { esc: text => String(text).replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char])) },
    Sound: {}, achievements: { checkAll() { log.push('achievements'); } },
    ui: { qsa() { return links; } },
    store: {
      set(mutator, reason) { mutator(state); writes.push({ reason, snapshot: JSON.parse(JSON.stringify(state)) }); },
      flush() { log.push('flush'); }
    },
    loadRoute(id) {
      log.push('load:' + id); loads.push(id);
      const queue = plans.get(id) || [];
      const next = queue.shift();
      return next ? next.promise : Promise.reject(new Error('No load configured: ' + id));
    }
  });
  vm.runInContext(managerSource, context);
  ['home', 'a', 'b'].forEach(id => NEG.tasks.define({ id, title: id.toUpperCase() }));
  vm.runInContext(routerSource, context);
  return {
    router: NEG.router, tasks: NEG.tasks, view, state, log, loads, writes, links,
    reloads: () => reloads,
    plan(id) {
      const gate = deferred();
      if (!plans.has(id)) plans.set(id, []);
      plans.get(id).push(gate);
      return gate;
    },
    ready(id, render) {
      NEG.tasks.register({ id, title: id.toUpperCase(), render: render || (() => {
        log.push('render:' + id); view.innerHTML = 'screen:' + id;
        return () => log.push('cleanup:' + id);
      }) });
    }
  };
}

test('a slow older route cannot mount or write progress after a newer route wins', async () => {
  const f = fixture();
  const a = f.plan('a'), b = f.plan('b');
  const first = f.router.go('a');
  const second = f.router.go('b');
  f.ready('b'); b.resolve();
  assert.equal(await second, true);
  f.ready('a'); a.resolve();
  assert.equal(await first, false);
  assert.deepEqual(f.log.filter(item => item.startsWith('render:')), ['render:b']);
  assert.equal(f.router.currentId, 'b');
  assert.equal(f.view.innerHTML, 'screen:b');
  assert.equal(f.state.modes.a, undefined);
  assert.equal(f.state.modes.b.plays, 1);
  assert.equal(f.state.lastMode, 'b');
  assert.equal(f.view.attributes['aria-busy'], undefined);
});

test('repeated clicks on one pending route share navigation and do not count plays early', async () => {
  const f = fixture();
  const gate = f.plan('a');
  const first = f.router.go('a');
  assert.equal(f.router.go('a'), first);
  assert.deepEqual(f.loads, ['a']);
  assert.equal(f.state.modes.a, undefined);
  assert.equal(f.writes.length, 0);
  assert.equal(f.router.currentId, null);
  assert.equal(f.router.pendingId, 'a');
  assert.equal(f.view.attributes['aria-busy'], 'true');
  assert.match(f.view.innerHTML, /正在打开A/);
  f.ready('a'); gate.resolve();
  assert.equal(await first, true);
  assert.equal(f.state.modes.a.plays, 1);
  assert.equal(f.router.pendingId, null);
  assert.equal(f.router.pending, null);
});

test('leaving a mounted route cleans it up immediately before the next import settles', async () => {
  const f = fixture();
  const firstGate = f.plan('a');
  f.ready('a'); const first = f.router.go('a'); firstGate.resolve(); await first;
  const secondGate = f.plan('b');
  const second = f.router.go('b');
  assert.equal(f.tasks.currentId(), null);
  assert.equal(f.router.currentId, null);
  assert.equal(f.state.modes.b, undefined);
  assert.ok(f.log.indexOf('cleanup:a') < f.log.indexOf('load:b'));
  assert.equal(f.log.filter(item => item === 'cleanup:a').length, 1);
  f.ready('b'); secondGate.resolve(); await second;
  assert.equal(f.state.modes.b.plays, 1);
  assert.equal(f.state.modes.a.plays, 1);
});

test('failed loading shows retry and home actions while preserving saved progress', async () => {
  const f = fixture();
  f.state.modes.a = { plays: 4, completed: ['saved'] };
  const snapshot = JSON.stringify(f.state);
  const gate = f.plan('a');
  const pending = f.router.go('a');
  gate.reject(new Error('offline'));
  assert.equal(await pending, false);
  assert.equal(JSON.stringify(f.state), snapshot);
  assert.match(f.view.innerHTML, /暂时无法打开A/);
  assert.ok(f.view.querySelector('[data-route-home]'));
  assert.equal(f.router.pendingId, null);
  assert.equal(f.view.attributes['aria-busy'], undefined);
  f.view.querySelector('[data-route-retry]').click();
  assert.equal(f.reloads(), 1);
  assert.ok(f.log.includes('flush'));
  assert.equal(JSON.stringify(f.state), snapshot);
});

test('a renderer that redirects cannot record or retain the abandoned route', async () => {
  const f = fixture();
  const a = f.plan('a'), b = f.plan('b');
  let redirect;
  f.ready('a', () => {
    redirect = f.router.go('b');
    return () => f.log.push('cleanup:a');
  });
  const first = f.router.go('a');
  a.resolve();
  assert.equal(await first, false);
  assert.equal(f.state.modes.a, undefined);
  assert.equal(f.tasks.currentId(), null);
  assert.ok(f.log.includes('cleanup:a'));
  f.ready('b'); b.resolve();
  assert.equal(await redirect, true);
  assert.equal(f.router.currentId, 'b');
  assert.equal(f.state.lastMode, 'b');
});

test('a failed route can retry successfully without an extra play count from the failure', async () => {
  const f = fixture();
  const failed = f.plan('a');
  const first = f.router.go('a'); failed.reject(new Error('offline')); await first;
  const gate = f.plan('a');
  const retry = f.router.go('a', { reload: true });
  assert.equal(f.state.modes.a, undefined);
  f.ready('a'); gate.resolve();
  assert.equal(await retry, true);
  assert.deepEqual(f.loads, ['a', 'a']);
  assert.equal(f.state.modes.a.plays, 1);
  assert.equal(f.state.lastMode, 'a');
});

test('a stale rejection cannot replace the active screen with a retry message', async () => {
  const f = fixture();
  const a = f.plan('a'), b = f.plan('b');
  const first = f.router.go('a'), second = f.router.go('b');
  f.ready('b'); b.resolve(); await second;
  a.reject(new Error('late failure'));
  assert.equal(await first, false);
  assert.equal(f.view.innerHTML, 'screen:b');
  assert.equal(f.router.currentId, 'b');
  assert.equal(f.state.modes.a, undefined);
  assert.equal(f.state.lastMode, 'b');
});

test('an import that fails to register a renderer cannot increment visits', async () => {
  const f = fixture();
  const gate = f.plan('a');
  const pending = f.router.go('a'); gate.resolve();
  assert.equal(await pending, false);
  assert.equal(f.state.modes.a, undefined);
  assert.equal(f.state.lastMode, 'home');
  assert.match(f.view.innerHTML, /暂时无法打开A/);
});

test('a renderer exception is a failed route and does not save a successful visit', async () => {
  const f = fixture();
  const gate = f.plan('a');
  f.ready('a', () => { throw new Error('render failed'); });
  const pending = f.router.go('a'); gate.resolve();
  assert.equal(await pending, false);
  assert.equal(f.tasks.currentId(), null);
  assert.equal(f.router.currentId, null);
  assert.equal(f.state.modes.a, undefined);
  assert.equal(f.state.lastMode, 'home');
  assert.match(f.view.innerHTML, /暂时无法打开A/);
});
