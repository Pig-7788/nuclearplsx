'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadStories() {
  const window = {};
  window.window = window;
  const context = vm.createContext({ window });
  const dir = path.join(__dirname, '../assets/js/data/stories');
  for (const file of fs.readdirSync(dir).sort()) {
    if (!/^STORY_.*\.js$/.test(file)) continue;
    vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), context);
  }
  return window.NEG.story;
}

function countOk(list) {
  return (Array.isArray(list) ? list : []).filter((item) => item && item.ok).length;
}

test('third chapter uses research commissions with device and reason steps', () => {
  const story = loadStories();
  const ch = story.ch03_innovation_frontier;
  assert.equal(ch.module_type, 'narrative_deduction');
  assert.equal(ch.gameplay.type, 'research_desk');
  assert.equal(ch.gameplay.commissions.length, 3);
  for (const commission of ch.gameplay.commissions) {
    assert.ok(commission.client && commission.task && commission.goal);
    assert.equal(commission.devices.length, 4);
    assert.equal(countOk(commission.devices), 1, commission.id);
    assert.ok(commission.devices.every((d) => d.name && d.sub));
    assert.equal(countOk(commission.reason.options), 1, commission.id);
    assert.ok(commission.reason.question);
    assert.ok(commission.solve && commission.limit);
  }
});

test('fourth chapter uses a three-case service station with evidence and explanations', () => {
  const story = loadStories();
  const ch = story.ch04_people_safety;
  assert.equal(ch.gameplay.type, 'life_service_station');
  assert.equal(ch.gameplay.cases.length, 3);
  const ids = ch.gameplay.cases.map((c) => c.id);
  assert.deepEqual(Array.from(ids), ['hospital', 'food', 'industry']);
  for (const item of ch.gameplay.cases) {
    assert.ok(item.title && item.request && item.place);
    assert.equal(countOk(item.use.options), 1, item.id);
    assert.equal(countOk(item.explain.options), 1, item.id);
    assert.ok(item.use.question && item.explain.question);
    assert.equal(item.evidence.length, 3, item.id);
    assert.ok(item.evidence.every((ev) => ev.title && ev.text));
  }
});

test('seventh chapter separates external controls from internal protection choices', () => {
  const story = loadStories();
  const ch = story.ch07_radiation_protection;
  assert.equal(ch.gameplay.type, 'protection_lab');
  const ext = ch.gameplay.external;
  assert.ok(ext.setup);
  assert.ok(ext.shields.some((s) => s.ok));
  assert.ok(ext.shields.some((s) => !s.ok));
  assert.equal(ext.shields.find((s) => s.id === 'lead').ok, true);
  assert.equal(countOk(ext.quiz.options), 1);
  const inner = ch.gameplay.internal;
  assert.ok(inner.actions.length >= 3);
  assert.equal(inner.actions.filter((a) => a.ok).length, 3);
  assert.equal(inner.need, 3);
  assert.equal(countOk(inner.quiz.options), 1);
});

test('final chapter requires conclusion plus evidence and only certificates after resolution', () => {
  const story = loadStories();
  const ch = story.ch08_epilogue;
  const questions = ch.phase_2_response.questions;
  assert.equal(questions.length, 3);
  for (const question of questions) {
    assert.ok(question.context && question.question);
    assert.equal(countOk(question.conclusions), 1, question.id);
    assert.equal(countOk(question.evidence), 1, question.id);
    assert.ok(question.explain);
    assert.ok(question.review);
  }
  const certificate = ch.phase_3_certificate;
  assert.ok(certificate.cert_name && certificate.description);
  const source = fs.readFileSync(path.join(__dirname, '../assets/js/games/final.js'), 'utf8');
  assert.match(source, /certificate: true/);
  assert.match(source, /allResolved/);
  assert.match(source, /corrections|corrected/);
});


test('first chapter opens with a three-question pretest and a learning route', () => {
  const story = loadStories();
  const ch = story.ch01_overview;
  assert.equal(ch.learning_route, true);
  const pre = ch.opening_gameplay;
  assert.equal(pre.type, 'cognition_pretest');
  assert.equal(pre.questions.length, 3);
  assert.ok(pre.attitude_options.length >= 3);
  for (const q of pre.questions) assert.equal(countOk(q.options), 1, q.id);
  assert.equal(ch.acts.length, 3);
});

test('fifth chapter adds a power trace after the reactor build', () => {
  const story = loadStories();
  const ch = story.ch05_clean_energy;
  const trace = ch.extra_gameplay;
  assert.equal(trace.type, 'power_trace');
  assert.equal(trace.path.length, 6);
  assert.deepEqual(Array.from(trace.path.map((p) => p.id)),
    ['core', 'primary', 'sg', 'steam', 'generator', 'grid']);
  assert.equal(trace.roles.length, 2);
  for (const role of trace.roles) assert.equal(countOk(role.options), 1);
});

test('sixth chapter asks a function question for every barrier and a final mapping', () => {
  const story = loadStories();
  const ch = story.ch06_waste_process;
  const game = ch.gameplay;
  assert.equal(game.type, 'multi_barrier_sort');
  const ids = ['glass', 'container', 'buffer', 'rock'];
  for (const id of ids) {
    assert.ok(game.layer_questions[id], id);
    assert.equal(countOk(game.layer_questions[id].options), 1, id);
  }
  assert.ok(game.mapping_prompt);
  const source = fs.readFileSync(path.join(__dirname, '../assets/js/games/barriers.js'), 'utf8');
  assert.match(source, /data-map-fb/);
  assert.match(source, /mappingDone/);
});

test('new lesson loaders are registered lazily with shared styles', () => {
  const source = fs.readFileSync(path.join(__dirname, '../assets/js/lesson-loaders.js'), 'utf8');
  ['life_service_station', 'protection_lab', 'research_desk', 'final_summary', 'cognition_pretest', 'power_trace'].forEach((type) => {
    assert.match(source, new RegExp("defineLoader\\('" + type + "'"));
  });
  assert.match(source, /loadStyle\('lessons\.css'\)/);
  const css = fs.readFileSync(path.join(__dirname, '../assets/css/lessons.css'), 'utf8');
  assert.match(css, /\.svc-wrap/);
  assert.match(css, /\.pl-wrap/);
  assert.match(css, /\.rd-wrap/);
  assert.match(css, /\.pr-question/);
});
