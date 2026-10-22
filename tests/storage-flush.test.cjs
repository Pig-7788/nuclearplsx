'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = fs.readFileSync(path.join(__dirname, '../assets/js/core.js'), 'utf8');
const source = core.slice(core.indexOf('  const listeners = [];'), core.indexOf('  /* ==========================================================\n     4. 音效'));

function fixture() {
  const timers = new Map(), events = {}, writes = [];
  let next = 0;
  const NEG = { updateHeader() {} };
  vm.runInNewContext(source, {
    NEG, Date, JSON, STORAGE_KEY: 'progress', defaults: () => ({ score: 0 }), load: () => ({ score: 0 }),
    localStorage: { setItem(key, value) { writes.push({ key, value: JSON.parse(value) }); } },
    setTimeout(fn) { timers.set(++next, fn); return next; },
    clearTimeout(id) { timers.delete(id); },
    window: { addEventListener(name, fn) { events[name] = fn; } }
  });
  return { store: NEG.store, timers, events, writes };
}

test('refresh can flush the latest chapter position before the debounced save fires', () => {
  const f = fixture();
  f.store.set(state => { state.chapter = 'ch06_waste_process'; });
  f.store.set(state => { state.panelIndex = 4; });
  assert.equal(f.writes.length, 0);
  assert.equal(f.timers.size, 1);
  f.store.flush();
  assert.equal(f.timers.size, 0);
  assert.equal(f.writes[0].value.chapter, 'ch06_waste_process');
  assert.equal(f.writes[0].value.panelIndex, 4);
});

test('leaving the document saves pending progress synchronously', () => {
  const f = fixture();
  f.store.addScore(5);
  f.events.pagehide();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].value.score, 5);
  assert.equal(f.timers.size, 0);
});
