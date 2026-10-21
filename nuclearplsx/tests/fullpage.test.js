const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function element() {
  const classes = new Set();
  return {
    children: [], style: {}, dataset: {}, attributes: {}, handlers: {}, scrollTop: 0,
    clientHeight: 300,
    classList: { add(c) { classes.add(c); }, remove(c) { classes.delete(c); }, toggle(c, on) { on ? classes.add(c) : classes.delete(c); }, contains(c) { return classes.has(c); } },
    setAttribute(k, v) { this.attributes[k] = v; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener(k, fn) { this.handlers[k] = fn; },
    removeEventListener(k) { delete this.handlers[k]; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { height: 1000 }; },
    cloneNode() { return element(); },
    appendChild(node) { this.children.push(node); node.remove = () => { this.children = this.children.filter(n => n !== node); }; }
  };
}

function setup({ wide = true, reduced = false } = {}) {
  const frames = new Map();
  let frameId = 0;
  const desktop = { matches: wide, addEventListener(_, fn) { this.change = fn; }, removeEventListener() {} };
  const motion = { matches: reduced, addEventListener(_, fn) { this.change = fn; }, removeEventListener() {} };
  const doc = { ...element(), hidden: false, querySelector() { return null; } };
  const NEG = {};
  const win = { ...element(), NEG, matchMedia(query) { return query.includes('min-width') ? desktop : motion; } };
  const ctx = vm.createContext({
    window: win, document: doc, setTimeout, clearTimeout,
    getComputedStyle(node) { return { overflowY: node.overflowY || 'visible' }; },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/fullpage.js'), 'utf8'), ctx);
  return { NEG, frames, desktop, motion, doc };
}

test('pager exposes both sections on narrow screens and removes hidden desktop controls from focus', () => {
  const { NEG, desktop } = setup();
  const pages = [element(), element()];
  const dots = [element(), element()];
  const track = { ...element(), children: pages };
  const el = { ...element(), querySelectorAll() { return dots; } };
  const pager = NEG.pager.create({ el, track });
  assert.equal(pages[1].inert, true);
  pager.next();
  assert.equal(pages[0].inert, true);
  assert.equal(pages[1].inert, false);
  assert.equal(dots[1].attributes['aria-selected'], 'true');
  desktop.matches = false;
  desktop.change();
  pages.forEach(page => {
    assert.equal(page.inert, false);
    assert.equal(page.attributes['aria-hidden'], 'false');
  });
  assert.equal(track.style.transform, '');
  pager.destroy();
});

test('wheel scrolling inside a tall panel remains available before turning a page', () => {
  const { NEG } = setup();
  const track = { ...element(), children: [element(), element()] };
  const el = element();
  const pager = NEG.pager.create({ el, track });
  const panel = { parentElement: el, scrollHeight: 500, clientHeight: 200, scrollTop: 0, overflowY: 'auto' };
  let prevented = false;
  const event = { target: panel, deltaY: 100, preventDefault() { prevented = true; } };
  el.handlers.wheel(event);
  assert.equal(prevented, false);
  assert.equal(pager.index, 0);
  panel.scrollTop = 300;
  el.handlers.wheel(event);
  assert.equal(prevented, true);
  assert.equal(pager.index, 1);
  pager.destroy();
});

function createMarquee(options = {}) {
  const env = setup(options);
  const viewport = element();
  const chunk = element();
  const track = { ...element(), children: [chunk], querySelector() { return chunk; } };
  const changes = [];
  const marquee = env.NEG.marquee.create({ viewport, track, onPauseChange(value) { changes.push(value); } });
  return { ...env, viewport, track, marquee, changes };
}

test('reduced motion uses manual scrolling without scheduling animation frames', () => {
  const { viewport, track, marquee, frames, changes } = createMarquee({ reduced: true });
  assert.equal(marquee.paused, true);
  assert.equal(viewport.classList.contains('is-paused'), true);
  assert.equal(track.style.transform, '');
  assert.equal(frames.size, 0);
  assert.deepEqual(changes, [true]);
  marquee.destroy();
  assert.equal(track.children.length, 1);
});

test('manual reading pauses the loop, preserves position on resume and cancels work when hidden', () => {
  const { viewport, track, marquee, frames, doc } = createMarquee();
  assert.equal(frames.size, 1);
  viewport.handlers.wheel();
  assert.equal(marquee.paused, true);
  assert.equal(frames.size, 0);
  viewport.scrollTop = 420;
  marquee.resume();
  assert.equal(viewport.scrollTop, 0);
  assert.equal(track.style.transform, 'translate3d(0,-420.00px,0)');
  assert.equal(frames.size, 1);
  doc.hidden = true;
  doc.handlers.visibilitychange();
  assert.equal(frames.size, 0);
  doc.hidden = false;
  doc.handlers.visibilitychange();
  assert.equal(frames.size, 1);
  marquee.destroy();
  assert.equal(frames.size, 0);
  assert.equal(viewport.handlers.wheel, undefined);
});
