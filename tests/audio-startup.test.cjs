'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const core = fs.readFileSync(path.join(__dirname, '../assets/js/core.js'), 'utf8');
const source = core.slice(core.indexOf('  const Sound = (function () {'), core.indexOf('  NEG.audio = Sound;')) + '\nSound;';

function fixture(sound = true) {
  const frames = [], timers = [];
  const data = { settings: { sound } };
  let starts = 0, tones = 0;
  const parameter = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  const audio = vm.runInNewContext(source, {
    data, store: { save() {} }, notify() {},
    requestAnimationFrame(fn) { frames.push(fn); }, setTimeout(fn) { timers.push(fn); },
    window: { AudioContext: class {
      constructor() { starts++; this.state = 'running'; this.currentTime = 0; }
      createGain() { return { gain: { ...parameter }, connect() {} }; }
      createOscillator() { tones++; return { frequency: parameter, connect() {}, start() {}, stop() {} }; }
    } }
  });
  return { audio, data, frames, timers, starts: () => starts, tones: () => tones,
    paint() { frames.splice(0).forEach(fn => fn()); }, drain() { timers.splice(0).forEach(fn => fn()); } };
}

test('the first interaction yields a paint before starting the audio device', () => {
  const f = fixture();
  assert.equal(f.audio.play('click'), false);
  assert.equal(f.starts(), 0);
  assert.equal(f.timers.length, 0);
  f.paint();
  assert.equal(f.starts(), 0);
  f.drain();
  assert.equal(f.starts(), 1);
  assert.equal(f.tones(), 0, 'a stale first-click sound is not replayed later');
  assert.equal(f.audio.play('click'), true);
  assert.equal(f.starts(), 1);
  assert.equal(f.tones(), 1);
});

test('pointer unlock and repeated clicks share one pending audio startup', () => {
  const f = fixture();
  f.audio.warmup();
  f.audio.play('click');
  f.audio.play('correct');
  assert.equal(f.frames.length, 1);
  f.paint(); f.drain();
  assert.equal(f.starts(), 1);
});

test('muting before warmup completes prevents audio allocation', () => {
  const f = fixture();
  f.audio.warmup();
  f.audio.toggle();
  f.paint(); f.drain();
  assert.equal(f.starts(), 0);
  assert.equal(f.audio.isEnabled(), false);
});

test('a muted visit does not start audio and enabling it warms up after paint', () => {
  const f = fixture(false);
  f.audio.warmup(); f.audio.play('click');
  assert.equal(f.frames.length, 0);
  f.audio.toggle();
  assert.equal(f.starts(), 0);
  f.paint(); f.drain();
  assert.equal(f.starts(), 1);
});
