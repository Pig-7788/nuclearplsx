const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function renderDose() {
  let mode;
  const fields = {};
  for (const id of ['doseRows', 'doseDetail', 'convInput', 'convUnit', 'convResult', 'convNote']) {
    fields[id] = {
      value: id === 'convUnit' ? '1' : '0.1',
      innerHTML: '', textContent: '', attributes: {}, handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; },
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; }
    };
  }
  const NEG = { registerMode(def) { mode = def; }, icon() { return ''; } };
  const context = vm.createContext({ window: { NEG }, requestAnimationFrame(fn) { fn(); } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/modes/dose.js'), 'utf8'), context);
  const state = { modes: { dose: { viewed: [] } } };
  mode.render({ querySelector(id) { return fields[id.slice(1)]; }, querySelectorAll() { return []; } }, {
    store: { get() { return state; } },
    data: { doses: [0.0001, 0.01, 1, 100, 10000].map((value, i) => ({ id: String(i), value, name: String(value), group: 'daily' })) },
    ui: { pageHead() { return ''; }, qsa() { return []; } },
    util: { esc: String, formatDose: String, trimNum: String }
  });
  return fields;
}

test('logarithmic bars match the five labelled 100-fold ticks', () => {
  const fields = renderDose();
  const widths = [...fields.doseRows.innerHTML.matchAll(/data-target="([\d.]+)"/g)].map(match => Number(match[1]));
  // The minimum dose retains a 2% visual marker at the origin.
  assert.deepEqual(widths, [2, 25, 50, 75, 100]);
});

test('unit conversion preserves small nonzero doses', () => {
  const fields = renderDose();
  fields.convInput.value = '1';
  fields.convInput.handlers.input();
  assert.match(fields.convResult.innerHTML, /西弗 Sv<\/span><b>0\.001<\/b>/);
  fields.convInput.value = '0.0001';
  fields.convInput.handlers.input();
  assert.match(fields.convResult.innerHTML, /西弗 Sv<\/span><b>0\.0000001<\/b>/);
});

test('invalid input clears both the result and its old comparison, then recovers', () => {
  const fields = renderDose();
  for (const value of ['', '-1', 'NaN', '1e308']) {
    fields.convInput.value = value;
    fields.convInput.handlers.input();
    assert.equal(fields.convResult.innerHTML, '');
    assert.equal(fields.convInput.attributes['aria-invalid'], 'true');
    assert.match(fields.convNote.textContent, /请输入/);
  }
  fields.convInput.value = '0';
  fields.convInput.handlers.input();
  assert.equal(fields.convInput.attributes['aria-invalid'], undefined);
  assert.match(fields.convResult.innerHTML, /<b>0<\/b>/);
});
