'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/console-trends.js'), 'utf8');
// No DOM globals: recording and export must also work independently of the UI.
const sandbox = { window: { NEG: {} } };
vm.runInNewContext(source, sandbox, { filename: 'console-trends.js' });

function history() {
  return sandbox.window.NEG.ConsoleTrends.createHistory();
}

function state(overrides = {}) {
  return {
    t: 0,
    power: 50,
    thermalMW: 3000,
    fuelTemp: 600,
    xenon: 0.75,
    electricalMW: 450,
    loadDemand: 60,
    status: 'running',
    ...overrides
  };
}

function plain(point) {
  return Object.fromEntries(Object.entries(point));
}

test('captures the initial state and uses rated thermal power for MWt', () => {
  const h = history();
  assert.equal(h.capture(state()), true);
  assert.deepEqual(plain(h.points[0]), {
    t: 0,
    power: 50,
    thermalMW: 1500,
    fuelTemp: 600,
    xenon: 0.75,
    electricalMW: 450,
    loadDemand: 60,
    status: 'running'
  });
});

test('records ordinary updates once per simulated minute, independently of wall time', () => {
  const h = history();
  for (let second = 0; second <= 120; second++) {
    h.capture(state({ t: second / 3600, power: second / 2 }));
  }
  assert.deepEqual(Array.from(h.points, (p) => p.t), [0, 1 / 60, 2 / 60]);
  assert.deepEqual(Array.from(h.points, (p) => p.power), [0, 30, 60]);
});

test('minute boundary tolerates floating point drift but rejects genuinely early updates', () => {
  const h = history();
  h.capture(state({ t: 4 }));
  assert.equal(h.capture(state({ t: 4 + 1 / 60 - 0.00001 })), false);
  assert.equal(h.capture(state({ t: 4 + 1 / 60 - 1e-10 })), true);
  assert.equal(h.points.length, 2);
});

test('history stores scalar snapshots that do not change with the live reactor state', () => {
  const h = history();
  const live = state();
  h.capture(live);
  const first = plain(h.points[0]);
  Object.assign(live, {
    t: 1, power: 100, thermalMW: 6000, fuelTemp: 900, xenon: 1.4,
    electricalMW: 850, loadDemand: 100, status: 'scram'
  });
  assert.deepEqual(plain(h.points[0]), first);
  assert.equal(h.capture(live), true);
  assert.equal(h.points[1].thermalMW, 6000);
  assert.equal(h.points[0].thermalMW, 1500);
});

test('status transitions are recorded immediately even when the simulated clock is unchanged', () => {
  const h = history();
  for (const status of ['standby', 'running', 'scram', 'standby', 'failed']) {
    assert.equal(h.capture(state({ t: 0.005, status })), true);
  }
  assert.deepEqual(Array.from(h.points, (p) => p.status), ['standby', 'running', 'scram', 'standby', 'failed']);
  assert.ok(h.points.every((p) => p.t === 0.005));
});

test('forced terminal updates keep the exact final time and values inside the sampling interval', () => {
  const h = history();
  h.capture(state({ t: 11.99 }));
  const final = state({ t: 12, power: 93.25, fuelTemp: 650.125, status: 'complete' });
  assert.equal(h.capture(final, true), true);
  assert.equal(h.points.at(-1).t, 12);
  assert.equal(h.points.at(-1).power, 93.25);
  assert.equal(h.points.at(-1).fuelTemp, 650.125);
  assert.equal(h.points.at(-1).status, 'complete');
  assert.equal(h.capture(final, true), false, 'the same forced snapshot must not be duplicated');
});

test('force can retain a more recent state before the next regular minute', () => {
  const h = history();
  h.capture(state({ t: 2 }));
  const pending = state({ t: 2 + 1 / 120, fuelTemp: 615.25, xenon: 0.81 });
  assert.equal(h.capture(pending), false);
  assert.equal(h.capture(pending, true), true);
  assert.equal(h.points.length, 2);
  assert.equal(h.points.at(-1).fuelTemp, 615.25);
});

test('forced same-time snapshots retain changes to every recorded physical field', async (t) => {
  const changes = {
    fuelTemp: 601,
    xenon: 0.8,
    loadDemand: 100,
    thermalMW: 3300
  };
  for (const [key, value] of Object.entries(changes)) {
    await t.test(key, () => {
      const h = history();
      h.capture(state());
      assert.equal(h.capture(state({ [key]: value }), true), true,
        `a changed ${key} is a new snapshot even when time, power and electrical output are unchanged`);
      assert.equal(h.points.length, 2);
      assert.equal(h.points.at(-1)[key], key === 'thermalMW' ? 1650 : value);
    });
  }
});

test('CSV specifies physical units, preserves the full sampled record and opens as UTF-8', () => {
  const h = history();
  h.capture(state({
    t: 1.234567, power: 87.123456, thermalMW: 1000 / 0.33,
    fuelTemp: 612.34567, xenon: 0.654321, electricalMW: 765.43219,
    loadDemand: 80, status: 'scram'
  }));
  const csv = h.csv();
  assert.ok(csv.startsWith('\uFEFF'), 'UTF-8 BOM supports spreadsheet readers');
  const [header, row] = csv.slice(1).split('\r\n');
  assert.equal(header, 'simulation_hour,thermal_percent,thermal_MWt,fuel_C,xenon_relative,electrical_MWe,grid_demand_percent,status');
  assert.equal(row, '1.23457,87.1235,2640.1047,612.346,0.65432,765.4322,80,scram');
  assert.equal(row.split(',').length, header.split(',').length);
});

test('empty CSV still has a valid header and no invented data rows', () => {
  const csv = history().csv();
  assert.equal(csv.split('\r\n').length, 2);
  assert.equal(csv.split('\r\n')[1], '');
});

test('retains a full 12-hour shift at minute resolution including both endpoints', () => {
  const h = history();
  for (let minute = 0; minute <= 720; minute++) {
    h.capture(state({ t: minute / 60, power: minute / 10 }));
  }
  assert.equal(h.points.length, 721);
  assert.equal(h.points[0].t, 0);
  assert.equal(h.points.at(-1).t, 12);
  assert.equal(h.csv().split('\r\n').length, 722);
});

test('bounded history preserves the initial state and the latest record under frequent events', () => {
  const h = history();
  for (let event = 0; event < 1800; event++) {
    h.capture(state({ t: event / 3600, power: event % 131 }), true);
    assert.ok(h.points.length <= 1500);
  }
  assert.equal(h.points.length, 1500);
  assert.equal(h.points[0].t, 0);
  assert.equal(h.points[1].t, 301 / 3600);
  assert.equal(h.points.at(-1).t, 1799 / 3600);
  assert.ok(h.points.every((p, i) => i === 0 || p.t > h.points[i - 1].t));
  assert.equal(h.csv().split('\r\n').length, 1501);
});

test('independent histories cannot leak samples between reactor sessions', () => {
  const first = history();
  const second = history();
  first.capture(state({ t: 8 }));
  assert.equal(second.points.length, 0);
  second.capture(state({ t: 0, status: 'standby' }));
  assert.equal(first.points[0].t, 8);
  assert.equal(second.points[0].t, 0);
});
