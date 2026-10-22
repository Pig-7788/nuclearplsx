import '../main-plays.js';
import '../history-exhibit-scene.js';

/* Historical reading lesson with an abstract, closed exterior exhibit. */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  let serial = 0;
  const defaults = [
    { title: '认识历史', text: '阅读历史背景，理解重要事件所处的时代。' },
    { title: '和平用途', text: '核科学也应用于发电、医疗和科研。了解这些用途与人们生活的联系。' },
    { title: '责任与防护', text: '科学知识与安全责任相伴。尊重专业规范，认真理解风险与防护。' }
  ];
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function normalizeExhibits(payload) {
    const source = payload && Array.isArray(payload.exhibits) ? payload.exhibits : [];
    const used = new Set();
    return defaults.map((fallback, index) => {
      const item = source[index] && typeof source[index] === 'object' ? source[index] : {};
      let id = typeof item.id === 'string' && item.id.trim() ? item.id : 'exhibit-' + index;
      if (used.has(id)) id = 'exhibit-' + index;
      while (used.has(id)) id += '-';
      used.add(id);
      return {
        id,
        title: typeof item.title === 'string' && item.title.trim() ? item.title : fallback.title,
        text: typeof item.text === 'string' && item.text.trim() ? item.text : fallback.text
      };
    });
  }

  function createReadingState(ids, done) {
    const valid = new Set(ids);
    const viewed = new Set();
    let active = true, complete = false;
    return {
      read(id) {
        if (!active || complete || !valid.has(id)) return false;
        const fresh = !viewed.has(id);
        viewed.add(id);
        return fresh;
      },
      viewedCount() { return viewed.size; },
      canComplete() { return active && !complete && valid.size > 0 && viewed.size === valid.size; },
      complete() {
        if (!this.canComplete()) return false;
        complete = true;
        if (typeof done === 'function') done({ ok: true, viewed: viewed.size });
        return true;
      },
      destroy() { active = false; }
    };
  }

  function staticExhibit(id) {
    return '<svg class="hx-static" viewBox="0 0 500 430" role="img" aria-label="底座上的封闭球形抽象展品，只展示外观" hidden>' +
      '<defs><radialGradient id="hx-metal-' + id + '" cx="30%" cy="24%" r="78%"><stop stop-color="#d9e7ed"/><stop offset=".46" stop-color="#839fac"/><stop offset="1" stop-color="#233c4b"/></radialGradient></defs>' +
      '<ellipse cx="250" cy="383" rx="130" ry="17" fill="#02070e" opacity=".7"/>' +
      '<path d="M170 340h160v23c0 21-160 21-160 0z" fill="#203e4d"/><ellipse cx="250" cy="340" rx="80" ry="18" fill="#375a69"/>' +
      '<path d="M235 309h30v33h-30z" fill="#426773"/>' +
      '<circle cx="250" cy="196" r="123" fill="url(#hx-metal-' + id + ')" stroke="#a1c1cc" stroke-width="1"/>' +
      '<path d="M130 203c57 23 174 23 240 0" fill="none" stroke="#52717e" stroke-width="3"/>' +
      '<circle cx="301" cy="143" r="9" fill="#54d9df"/>' +
      '</svg>';
  }

  function mount(container, payload, ctx, done) {
    if (!container || typeof container.querySelector !== 'function') return null;
    const data = payload && typeof payload === 'object' ? payload : {};
    const exhibits = normalizeExhibits(data);
    const id = ++serial;
    const detailId = 'hx-detail-' + id;
    let disposed = false, scene = null;
    const removers = [];
    const reading = createReadingState(exhibits.map(exhibit => exhibit.id), done);
    const title = typeof data.title === 'string' && data.title.trim() ? data.title : '历史、和平与责任';
    const intro = typeof data.intro_text === 'string' && data.intro_text.trim() ? data.intro_text : '阅读三张知识卡，了解核科学的历史、和平用途与安全责任。';

    container.innerHTML = '<section class="hx-lesson" aria-label="历史科普与外观展示">' +
      '<header class="hx-head"><h3>' + escape(title) + '</h3><span class="hx-count">0 / 3 已阅读</span></header>' +
      '<p class="hx-intro">' + escape(intro) + '</p>' +
      '<div class="hx-workspace"><section class="hx-showcase" aria-label="抽象展品外观">' +
      '<div class="hx-stage"><span class="hx-render-label">封闭外观 · 可旋转</span>' +
      '<canvas class="hx-canvas" tabindex="0" aria-label="封闭球形抽象展品。拖动或按方向键旋转，加减键缩放，Home恢复视角。"></canvas>' + staticExhibit(id) +
      '<p class="hx-model-caption">抽象展品，仅展示封闭外观</p></div>' +
      '<div class="hx-controls" aria-label="调整展品视角">' +
      '<button type="button" data-view="left" aria-label="向左旋转展品">向左</button>' +
      '<button type="button" data-view="right" aria-label="向右旋转展品">向右</button>' +
      '<button type="button" data-view="closer">放大</button><button type="button" data-view="farther">缩小</button>' +
      '<button type="button" data-view="reset">恢复视角</button></div></section>' +
      '<section class="hx-reading" aria-label="历史知识卡"><h4>选择一张知识卡</h4>' +
      '<div class="hx-card-list">' + exhibits.map((exhibit, index) => '<button type="button" class="hx-card" data-exhibit-index="' + index + '" aria-pressed="false" aria-controls="' + detailId + '">' +
      '<span class="hx-card-title">' + escape(exhibit.title) + '</span><span class="hx-card-state">未读</span></button>').join('') + '</div>' +
      '<article class="hx-detail" id="' + detailId + '" aria-live="polite" aria-atomic="true"><h4>从历史走向理解</h4><p>点选上方的知识卡，阅读内容。三张都读完后，即可完成本节。</p></article>' +
      '<div class="hx-finish"><p class="hx-read-progress" role="status">还有 3 张知识卡未阅读。</p>' +
      '<button class="hx-complete" type="button" disabled>完成本节</button></div></section></div></section>';

    const lesson = container.querySelector('.hx-lesson');
    const canvas = lesson.querySelector('.hx-canvas');
    const fallback = lesson.querySelector('.hx-static');
    const detail = lesson.querySelector('.hx-detail');
    const count = lesson.querySelector('.hx-count');
    const progress = lesson.querySelector('.hx-read-progress');
    const finish = lesson.querySelector('.hx-complete');
    const cards = Array.from(lesson.querySelectorAll('[data-exhibit-index]'));
    const viewButtons = Array.from(lesson.querySelectorAll('[data-view]'));

    function on(target, type, handler) {
      target.addEventListener(type, handler);
      removers.push(() => target.removeEventListener(type, handler));
    }
    function fallbackView() {
      if (disposed) return;
      canvas.hidden = true;
      fallback.removeAttribute('hidden');
      lesson.querySelector('.hx-render-label').textContent = '封闭外观 · 静态展示';
      viewButtons.forEach(button => { button.disabled = true; });
    }
    cards.forEach((card, index) => {
      on(card, 'click', () => {
        if (disposed) return;
        const exhibit = exhibits[index];
        reading.read(exhibit.id);
        card.classList.add('is-read');
        card.querySelector('.hx-card-state').textContent = '已读';
        cards.forEach(other => other.setAttribute('aria-pressed', String(other === card)));
        detail.innerHTML = '<h4>' + escape(exhibit.title) + '</h4><p>' + escape(exhibit.text) + '</p>';
        const read = reading.viewedCount();
        count.textContent = read + ' / 3 已阅读';
        progress.textContent = read === 3 ? '三张知识卡已读完，可以完成本节。' : '还有 ' + (3 - read) + ' 张知识卡未阅读。';
        finish.disabled = !reading.canComplete();
      });
    });
    viewButtons.forEach(button => {
      on(button, 'click', () => {
        if (disposed || !scene || !scene.supported) return;
        const action = button.dataset.view;
        if (action === 'left') scene.rotate(-0.24, 0);
        else if (action === 'right') scene.rotate(0.24, 0);
        else if (action === 'closer') scene.zoom(-0.25);
        else if (action === 'farther') scene.zoom(0.25);
        else if (action === 'reset') scene.resetView();
      });
    });
    on(finish, 'click', () => {
      if (disposed || !reading.canComplete()) return;
      // The host may immediately dispose this view from done().
      finish.disabled = true;
      reading.complete();
    });
    try {
      scene = NEG.HistoryExhibitScene && NEG.HistoryExhibitScene.create(canvas, { onUnavailable: fallbackView });
    } catch (error) { scene = null; }
    if (!scene || !scene.supported) fallbackView();

    return function cleanup() {
      if (disposed) return;
      disposed = true;
      reading.destroy();
      removers.splice(0).forEach(remove => remove());
      if (scene && typeof scene.destroy === 'function') scene.destroy();
      // Only remove this instance; a late cleanup must not erase a later lesson.
      if (lesson.parentNode) lesson.remove();
    };
  }

  NEG.HistoryExhibit = { normalizeExhibits, createReadingState, mount };
  if (NEG.mainPlays && typeof NEG.mainPlays.register === 'function') {
    NEG.mainPlays.register('nuclear_history_exhibit', { label: '历史科普与外观展示', mount });
  }
})(window.NEG);
