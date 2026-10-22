'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const catalogPromise = import(pathToFileURL(path.join(root, 'assets/js/catalog.js')).href);
const chapterFiles = [
  'STORY_START.js', 'STORY_CONTRYSAFE.js', 'STORY_NEWTHEC.js', 'STORY_PEOPLE.js',
  'STORY_CLEANPOWER.js', 'STORY_ENVIRON.js', 'STORY_RADIATION.js', 'STORY_END.js'
];
const expectedOrder = [
  'ch01_overview', 'ch02_national_security', 'ch03_innovation_frontier', 'ch04_people_safety',
  'ch05_clean_energy', 'ch06_waste_process', 'ch07_radiation_protection', 'ch08_epilogue'
];

function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

function dataRuntime() {
  const NEG = { data: {}, story: {} };
  const context = vm.createContext({ window: { NEG }, NEG });
  for (const name of ['china', 'doses', 'reactor', 'repository', 'rumors']) {
    vm.runInContext(read(`assets/js/data/${name}.js`), context, { filename: `${name}.js` });
  }
  for (const name of chapterFiles) {
    vm.runInContext(read(`assets/js/data/stories/${name}`), context, { filename: name });
  }
  return { NEG, context };
}

function savedState(catalog, overrides = {}) {
  return { modes: Object.fromEntries(catalog.map(route => [route.id, overrides[route.id] || {}])) };
}

function modeDefinitions(catalog) {
  const { NEG, context } = dataRuntime();
  const registered = new Map();
  NEG.registerMode = def => registered.set(def.id, def);
  Object.assign(context, catalog, { THREE: {} });
  for (const route of catalog.routeCatalog) {
    // Evaluate registration only: no imported dependencies or renderers run in this fixture.
    const source = read(`assets/js/modes/${route.id}.js`).replace(
      /^import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"]+['"]\s*;\s*/gm, ''
    );
    vm.runInContext(source, context, { filename: `modes/${route.id}.js` });
  }
  return registered;
}

test('the navigation catalog imports without feature, data or browser globals', async () => {
  const { routeCatalog } = await catalogPromise;
  assert.doesNotMatch(read('assets/js/catalog.js'), /^\s*import\s/m);
  assert.deepEqual(routeCatalog.map(route => [route.id, route.order]), [
    ['home', 0], ['main', 0.5], ['rumor', 1], ['city', 2],
    ['console', 3], ['dose', 4], ['china', 5], ['repository', 7]
  ]);
  for (const route of routeCatalog) {
    assert.equal(typeof route.progress, 'function', route.id);
    assert.equal(typeof route.isComplete, 'function', route.id);
    assert.equal(typeof route.title, 'string', route.id);
    assert.equal(typeof route.nav, 'string', route.id);
  }
  assert.deepEqual(routeCatalog.filter(route => route.hidden).map(route => route.id), ['console']);
  assert.deepEqual(routeCatalog.filter(route => !route.hidden).map(route => route.id), [
    'home', 'main', 'rumor', 'city', 'dose', 'china', 'repository'
  ]);
});

test('chapter summaries match the eight source chapters and nineteen knowledge cards', async () => {
  const { storySummary } = await catalogPromise;
  const { story } = dataRuntime().NEG;
  assert.deepEqual(storySummary.order, expectedOrder);
  assert.deepEqual(Array.from(story.order), expectedOrder);
  assert.deepEqual(storySummary.chapters.map(chapter => chapter.id), expectedOrder);
  let cards = 0;
  for (const id of expectedOrder) {
    const chapter = story[id];
    const summary = storySummary[id];
    assert.equal(summary.id, id);
    assert.equal(summary.title, chapter.title, id);
    assert.equal(summary.cardCount, (chapter.knowledge_cards || []).length, id);
    assert.equal(storySummary.chapters.find(item => item.id === id), summary);
    assert.ok(typeof summary.summary === 'string' && summary.summary.length > 0, id);
    assert.deepEqual(Object.keys(summary).sort(), ['cardCount', 'id', 'summary', 'title']);
    cards += summary.cardCount;
  }
  assert.equal(cards, 19);
  assert.equal(storySummary.totalCards, cards);
});

test('fixed progress denominators match the current source datasets', async () => {
  const { CONTENT_COUNTS } = await catalogPromise;
  const { data } = dataRuntime().NEG;
  assert.deepEqual(CONTENT_COUNTS, {
    chinaTimeline: 19, rumors: 32, doses: 25, plantParts: 12, repositoryParts: 5
  });
  assert.equal(CONTENT_COUNTS.chinaTimeline, data.china.timeline.length);
  assert.equal(CONTENT_COUNTS.rumors, data.rumors.length);
  assert.equal(CONTENT_COUNTS.doses, data.doses.length);
  assert.equal(CONTENT_COUNTS.plantParts, data.plant.parts.length);
  assert.equal(CONTENT_COUNTS.repositoryParts, data.repository.parts.length);
});

test('unloaded routes restore partial and complete saved progress without datasets', async () => {
  const { routeCatalog, storySummary } = await catalogPromise;
  const routes = Object.fromEntries(routeCatalog.map(route => [route.id, route]));
  for (const route of routeCatalog) {
    for (const empty of [{}, { modes: {} }, savedState(routeCatalog)]) {
      assert.equal(route.progress(empty), 0, `${route.id} empty progress`);
      assert.equal(route.isComplete(empty), false, `${route.id} empty completion`);
    }
  }
  const partial = savedState(routeCatalog, {
    home: { plays: 1 },
    main: { completed: [expectedOrder[0], expectedOrder[1], expectedOrder[1], 'obsolete_chapter'] },
    rumor: { seen: Array.from({ length: 16 }, (_, i) => i + 1) },
    city: { bestSteps: 6 },
    console: { bestEnergy: 2750, bestSafety: 50 },
    dose: { viewed: Array.from({ length: 5 }, (_, i) => `dose_${i}`) },
    china: { viewed: Array.from({ length: 9 }, (_, i) => `milestone_${i}`) },
    repository: { viewed: ['glass', 'canister'], exploded: false }
  });
  const expectedProgress = { home: 1, main: 2 / 8, rumor: 0.5, city: 0.5, console: 0.45, dose: 0.2, china: 9 / 19, repository: 0.4 };
  for (const route of routeCatalog) {
    assert.equal(route.progress(partial), expectedProgress[route.id], `${route.id} saved progress`);
    assert.equal(route.isComplete(partial), route.id === 'home', `${route.id} saved completion`);
  }
  const complete = savedState(routeCatalog, {
    home: { plays: 1 }, main: { completed: [...storySummary.order, 'obsolete_chapter', storySummary.order[0]] },
    rumor: { seen: Array(32).fill(1) }, city: { completed: 1 }, console: { completed: 1 },
    dose: { viewed: Array(25).fill('viewed') }, china: { viewed: Array(19).fill('viewed') },
    repository: { exploded: true }
  });
  for (const route of routeCatalog) {
    assert.equal(route.progress(complete), 1, `${route.id} complete progress`);
    assert.equal(route.isComplete(complete), true, `${route.id} complete status`);
  }
  assert.equal(routes.console.hidden, true);
  assert.equal(routes.console.progress(savedState(routeCatalog, { console: { bestEnergy: 55000, bestSafety: 100 } })), 0.9);
});

test('catalog metadata and saved-progress rules agree with loaded mode registrations', async () => {
  const catalog = await catalogPromise;
  const definitions = modeDefinitions(catalog);
  const state = savedState(catalog.routeCatalog, {
    home: { plays: 1 }, main: { completed: expectedOrder.slice(0, 3) }, rumor: { seen: Array(7).fill(1) },
    city: { bestSteps: 8 }, console: { bestEnergy: 3300, bestSafety: 75 },
    dose: { viewed: Array(11).fill('viewed') }, china: { viewed: Array(12).fill('viewed') },
    repository: { viewed: ['glass', 'canister', 'bentonite'] }
  });
  for (const route of catalog.routeCatalog) {
    const mode = definitions.get(route.id);
    assert.ok(mode, `${route.id} registered`);
    for (const key of ['id', 'order', 'title', 'nav', 'icon', 'accent', 'blurb']) {
      assert.equal(route[key], mode[key], `${route.id}.${key}`);
    }
    assert.equal(route.hidden, !!mode.hidden, `${route.id}.hidden`);
    const progress = mode.progress ? mode.progress(state) : (state.modes[route.id].plays || 0) > 0 ? 1 : 0;
    const complete = mode.isComplete ? mode.isComplete(state) : progress >= 1;
    assert.equal(route.progress(state), progress, `${route.id} loaded progress`);
    assert.equal(route.isComplete(state), complete, `${route.id} loaded completion`);
  }
});
