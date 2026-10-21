const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const app = path.join(__dirname, '..');
function create(options) {
  const context = vm.createContext({ window: {} });
  for (const file of ['assets/js/data/reactor.js', 'assets/js/console-model.js']) {
    vm.runInContext(fs.readFileSync(path.join(app, file), 'utf8'), context);
  }
  return context.window.NEG.ReactorModel.create(options);
}

test('time speed advances every part of the model by the same simulated duration', () => {
  function run(speed) {
    const model = create({ speed });
    model.setControl('rod', 65);
    model.setControl('load', 80);
    for (let i = 0; i < 2400 / speed; i++) model.step(1 / 60);
    return model.state;
  }
  const normal = run(1);
  for (const speed of [2, 4]) {
    const fast = run(speed);
    for (const key of ['t', 'power', 'fuelTemp', 'coolantTemp', 'pressure', 'iodine', 'xenon', 'energy', 'safety']) {
      assert.ok(Math.abs(normal[key] - fast[key]) < 1e-8, key + ' differs at speed ' + speed);
    }
    assert.equal(fast.status, normal.status);
    assert.equal(fast.scramCount, normal.scramCount);
  }
});

test('pump range matches the UI and cooling remains adjustable after a scram', () => {
  const model = create();
  model.setControl('pump', 120);
  assert.equal(model.state.pump, 120);
  model.scram('test');
  model.setControl('pump', 70);
  model.setControl('rod', 10);
  model.setControl('load', 90);
  assert.equal(model.state.pump, 70);
  assert.equal(model.state.rod, 100);
  assert.equal(model.state.load, 0);
  model.setControl('pump', 0);
  assert.equal(model.state.pump, 40);
});

test('scram is idempotent and reset respects both power and the lockout period', () => {
  const model = create();
  assert.equal(model.scram('test'), true);
  const lockUntil = model.state.rodLockUntil;
  assert.equal(model.scram('test again'), false);
  assert.equal(model.state.scramCount, 1);
  assert.equal(model.state.safety, 85);
  assert.equal(model.resetAfterScram(), false);
  while (model.state.t < lockUntil) model.step(1 / 60);
  model.state.power = 6;
  assert.equal(model.resetAfterScram(), false);
  model.state.power = 5;
  assert.equal(model.resetAfterScram(), true);
  assert.equal(model.state.status, 'standby');
});

test('control input cannot overwrite simulation state or inject non-finite numbers', () => {
  const model = create();
  const rod = model.state.rod;
  for (const key of ['energy', 'safety', 'speed', 'status', 'constructor', '__proto__']) {
    model.setControl(key, 100);
  }
  for (const value of [NaN, Infinity, -Infinity, 'invalid']) model.setControl('rod', value);
  for (const value of [NaN, Infinity, -Infinity]) {
    model.step(value);
    model.applyDecayHeat(value);
  }
  assert.equal(model.state.energy, 0);
  assert.equal(model.state.safety, 100);
  assert.equal(model.state.speed, 1);
  assert.equal(model.state.status, 'standby');
  assert.equal(model.state.rod, rod);
  assert.equal(model.state.t, 0);
  assert.equal(model.state.decayHeat, 0);
});

test('mission stops at its boundary and terminal state cannot be changed through controls', () => {
  const model = create({ speed: 4 });
  model.state.t = model.state.missionHours - 0.0001;
  model.state.power = 60;
  model.state.load = 100;
  const expectedEnergy = Math.min(35 * (290 - 240), (60 / 100 * model.state.thermalMW) * 1.15 + 40) * 0.33 * 0.0001;
  model.step(0.12);
  assert.equal(model.state.t, model.state.missionHours);
  assert.equal(model.state.status, 'complete');
  assert.ok(Math.abs(model.state.energy - expectedEnergy) < 0.001);
  const state = JSON.stringify(model.state);
  model.step(0.12);
  model.setControl('pump', 70);
  assert.equal(model.scram('late'), false);
  assert.equal(JSON.stringify(model.state), state);
});

test('the unchanged teaching parameters still allow a successful full shift', () => {
  const model = create();
  const s = model.state;
  const k = model.config;
  for (let i = 0; i < 9000 && s.status !== 'complete' && s.status !== 'failed'; i++) {
    const feedback = k.fuelCoeff * Math.min(500, Math.max(-280, s.fuelTemp - 600)) +
      k.modCoeff * Math.min(80, Math.max(-45, s.coolantTemp - 326)) + k.xeCoeff * (s.xenon - 1);
    const requestedReactivity = (100 - s.power) * 10;
    model.setControl('rod', 50 - (requestedReactivity - feedback) * 50 / k.rodWorth);
    model.setControl('load', s.loadDemand);
    model.step(1 / 60);
  }
  assert.equal(s.status, 'complete');
  assert.equal(s.success, true);
  assert.ok(s.energy >= s.energyTarget);
  assert.ok(s.safety >= 60);
  assert.equal(s.scramCount, 0);
});
