'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const modulePromise = import(pathToFileURL(path.join(__dirname, '../assets/js/route-loader.js')).href);

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('native route imports deduplicate concurrent entries and cache successful results', async () => {
  const { createRouteLoader } = await modulePromise;
  const gate = deferred();
  const loaded = { route: 'lesson' };
  let imports = 0, styles = 0;
  const load = createRouteLoader({ lesson: { styles: ['lesson.css'], load() { imports++; return gate.promise; } } }, () => { styles++; });
  const first = load('lesson');
  const second = load('lesson');
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(imports, 1);
  assert.equal(styles, 1);
  gate.resolve(loaded);
  assert.equal(await first, loaded);
  assert.equal(load('lesson'), first);
  assert.equal(await load('lesson'), loaded);
  assert.equal(imports, 1);
  assert.equal(styles, 1);
});

test('a failed route import is evicted so the next entry can retry', async () => {
  const { createRouteLoader } = await modulePromise;
  const gate = deferred();
  let imports = 0;
  const load = createRouteLoader({ lesson: { styles: [], load() {
    imports++;
    return imports === 1 ? gate.promise : { ready: true };
  } } });
  const first = load('lesson');
  gate.reject(new Error('network unavailable'));
  await assert.rejects(first, /network unavailable/);
  const second = load('lesson');
  assert.notEqual(second, first);
  assert.equal((await second).ready, true);
  assert.equal(imports, 2);
});

test('a synchronous import failure also permits a later retry', async () => {
  const { createRouteLoader } = await modulePromise;
  let imports = 0;
  const load = createRouteLoader({ lesson: { styles: [], load() {
    if (++imports === 1) throw new Error('loader unavailable');
    return 'ready';
  } } });
  await assert.rejects(load('lesson'), /loader unavailable/);
  assert.equal(await load('lesson'), 'ready');
  assert.equal(imports, 2);
});

test('a route waits for every stylesheet even when its module is already available', async () => {
  const { createRouteLoader } = await modulePromise;
  const firstStyle = deferred(), secondStyle = deferred();
  const requested = [];
  let ready = false;
  const load = createRouteLoader({ lesson: { styles: ['layout.css', 'lesson.css'], load: () => 'module' } }, style => {
    requested.push(style);
    return style === 'layout.css' ? firstStyle.promise : secondStyle.promise;
  });
  const pending = load('lesson').then(result => { ready = true; return result; });
  await Promise.resolve();
  assert.deepEqual(requested, ['layout.css', 'lesson.css']);
  firstStyle.resolve();
  for (let i = 0; i < 4; i++) await Promise.resolve();
  assert.equal(ready, false);
  secondStyle.resolve();
  assert.equal(await pending, 'module');
  assert.equal(ready, true);
});

test('a stylesheet failure is not cached as a successful route', async () => {
  const { createRouteLoader } = await modulePromise;
  let imports = 0, styles = 0;
  const load = createRouteLoader({ lesson: { styles: ['lesson.css'], load() { imports++; return 'ready'; } } }, () => {
    if (++styles === 1) return Promise.reject(new Error('stylesheet offline'));
  });
  await assert.rejects(load('lesson'), /stylesheet offline/);
  assert.equal(await load('lesson'), 'ready');
  assert.equal(imports, 2);
  assert.equal(styles, 2);
});

test('unknown routes and inherited object keys do not trigger modules or styles', async () => {
  const { createRouteLoader } = await modulePromise;
  let imports = 0, styles = 0;
  const load = createRouteLoader({ lesson: { styles: ['lesson.css'], load() { imports++; } } }, () => { styles++; });
  await assert.rejects(load('missing'), /Unknown route/);
  await assert.rejects(load('constructor'), /Unknown route/);
  await assert.rejects(load('__proto__'), /Unknown route/);
  assert.equal(imports, 0);
  assert.equal(styles, 0);
});
