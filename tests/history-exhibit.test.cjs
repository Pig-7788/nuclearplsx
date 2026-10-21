'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const registered = new Map();
const context = { window: { NEG: { mainPlays: { register(type, definition) { registered.set(type, definition); } } } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/games/history.js'), 'utf8'), context);
const exhibit = context.window.NEG.HistoryExhibit;
const ids = ['history', 'peace', 'responsibility'];
const plain = value => JSON.parse(JSON.stringify(value));

test('registers the historical reading lesson with the main lesson registry', () => {
  const definition = registered.get('nuclear_history_exhibit');
  assert.ok(definition);
  assert.equal(typeof definition.mount, 'function');
});

test('normalizes exactly three readable cards and unique identifiers', () => {
  const cards = exhibit.normalizeExhibits({ exhibits: [
    { id: 'same', title: '历史', text: '历史内容' },
    { id: 'same', title: '和平', text: '和平内容' },
    null,
    { id: 'extra', title: '不会额外加入' }
  ] });
  assert.equal(cards.length, 3);
  assert.equal(new Set(Array.from(cards, card => card.id)).size, 3);
  assert.equal(cards[0].title, '历史');
  assert.equal(cards[1].text, '和平内容');
  assert.ok(cards.every(card => typeof card.title === 'string' && card.title && typeof card.text === 'string' && card.text));
  assert.equal(exhibit.normalizeExhibits(null).length, 3);
});

test('only distinct valid knowledge cards count as read', () => {
  const reading = exhibit.createReadingState(ids);
  assert.equal(reading.read('__proto__'), false);
  assert.equal(reading.read('unknown'), false);
  assert.equal(reading.read('history'), true);
  assert.equal(reading.read('history'), false);
  assert.equal(reading.viewedCount(), 1);
  assert.equal(reading.canComplete(), false);
});

test('completion requires all three cards and delivers a single result', () => {
  const results = [];
  const reading = exhibit.createReadingState(ids, result => results.push(plain(result)));
  assert.equal(reading.complete(), false);
  reading.read('peace');
  reading.read('history');
  assert.equal(reading.complete(), false);
  assert.deepEqual(results, []);
  reading.read('responsibility');
  assert.equal(reading.canComplete(), true);
  assert.equal(reading.complete(), true);
  assert.deepEqual(results, [{ ok: true, viewed: 3 }]);
  assert.equal(reading.complete(), false);
  assert.equal(reading.read('history'), false);
  assert.equal(results.length, 1);
});

test('cleanup prevents both late reads and late completion', () => {
  let delivered = 0;
  const reading = exhibit.createReadingState(ids, () => delivered++);
  ids.forEach(id => reading.read(id));
  reading.destroy();
  reading.destroy();
  assert.equal(reading.canComplete(), false);
  assert.equal(reading.complete(), false);
  assert.equal(reading.read('history'), false);
  assert.equal(delivered, 0);
});

test('a host can dispose synchronously during the completion callback', () => {
  let delivered = 0;
  const reading = exhibit.createReadingState(ids, () => { delivered++; reading.destroy(); });
  ids.forEach(id => reading.read(id));
  assert.doesNotThrow(() => reading.complete());
  assert.equal(delivered, 1);
  assert.equal(reading.complete(), false);
});

test('separate lesson visits keep their read state independent', () => {
  const first = exhibit.createReadingState(ids);
  const second = exhibit.createReadingState(ids);
  ids.forEach(id => first.read(id));
  assert.equal(first.canComplete(), true);
  assert.equal(second.canComplete(), false);
  assert.equal(second.viewedCount(), 0);
  first.destroy();
  assert.equal(second.read('history'), true);
});

test('empty content cannot count as a completed reading lesson', () => {
  const reading = exhibit.createReadingState([]);
  assert.equal(reading.canComplete(), false);
  assert.equal(reading.complete(), false);
});

test('unavailable WebGL returns a safe static-view contract without DOM dependencies', () => {
  const sceneContext = { window: { NEG: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/history-exhibit-scene.js'), 'utf8'), sceneContext);
  const scene = sceneContext.window.NEG.HistoryExhibitScene.create({ getContext() { return null; } });
  assert.equal(scene.supported, false);
  assert.doesNotThrow(() => { scene.rotate(1, 1); scene.zoom(1); scene.resetView(); scene.destroy(); });
});
