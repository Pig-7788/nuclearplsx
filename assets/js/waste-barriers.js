/* 核废料四重屏障：独立关卡组件，不依赖主路由、存档或其他实验室。 */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const layers = Object.freeze([
    Object.freeze({ id: 'glass', name: '玻璃固化体', color: '#ffc857', role: '把废物固定在稳定的固体中', detail: '将放射性废物包容在玻璃基体中，减少其与环境接触、随水迁移的机会。', type: '人工屏障' }),
    Object.freeze({ id: 'container', name: '金属容器', color: '#a5c6dc', role: '提供密封与机械保护', detail: '金属容器包容固化体，为废物提供额外的隔离与保护。具体材料随处置方案而异。', type: '人工屏障' }),
    Object.freeze({ id: 'buffer', name: '缓冲与回填层', color: '#d5a475', role: '限制水流与核素迁移', detail: '以膨润土等材料填充容器与围岩之间的空间，形成缓冲和低渗透的包覆层。', type: '人工屏障' }),
    Object.freeze({ id: 'rock', name: '天然围岩', color: '#80b6ad', role: '提供长期的地质隔离', detail: '稳定的地质岩体构成天然屏障，与内部工程屏障共同发挥隔离作用。', type: '天然屏障' })
  ]);

  function createState(options) {
    const opts = options || {};
    let progress = typeof opts.progress === 'number' && Number.isFinite(opts.progress)
      ? Math.max(0, Math.min(4, Math.floor(opts.progress))) : 0;
    return {
      getProgress() { return progress; },
      place(id) {
        const index = layers.findIndex((layer) => layer.id === id);
        let status = 'unknown';
        if (index >= 0 && index < progress) status = 'already';
        else if (index > progress) status = 'order';
        else if (index === progress) {
          progress++;
          status = 'placed';
          if (typeof opts.onProgress === 'function') opts.onProgress(progress);
          if (progress === layers.length && typeof opts.onComplete === 'function') opts.onComplete();
        }
        return { status, progress };
      },
      reset() {
        progress = 0;
        if (typeof opts.onProgress === 'function') opts.onProgress(progress);
      }
    };
  }

  function layerIcon(index) {
    const widths = [8, 12, 16, 20];
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<rect x="' + (12 - widths[index] / 2) + '" y="4" width="' + widths[index] + '" height="16" rx="3"/>' +
      '<path d="M9 9h6M9 15h6"/></svg>';
  }

  function fallbackMarkup() {
    return '<svg class="wb-fallback" viewBox="0 0 1000 480" role="img" aria-label="四重屏障剖面：固化体、金属容器、缓冲层与围岩由内向外嵌套" hidden>' +
      '<g class="wb-section" data-section="rock" style="--layer-color:#80b6ad"><rect x="45" y="72" width="910" height="338" rx="24"/><path d="M80 110h75l35 35h70M875 374h-85l-40-35h-60"/></g>' +
      '<g class="wb-section" data-section="buffer" style="--layer-color:#d5a475"><rect x="100" y="123" width="800" height="236" rx="58"/></g>' +
      '<g class="wb-section" data-section="container" style="--layer-color:#a5c6dc"><rect x="150" y="172" width="700" height="138" rx="50"/><path d="M200 175v132M800 175v132"/></g>' +
      '<g class="wb-section" data-section="glass" style="--layer-color:#ffc857"><rect x="199" y="216" width="602" height="50" rx="25"/></g>' +
      '</svg>';
  }

  function mount(root, options) {
    if (!root || typeof root.querySelector !== 'function') throw new TypeError('需要一个关卡容器');
    const opts = options || {};
    let destroyed = false;
    let selected = null;
    let dragging = null;
    let scene = null;
    const removers = [];
    const state = createState(opts);
    const order = [3, 1, 0, 2];

    root.innerHTML = '<section class="wb-lab" aria-label="核废料四重屏障组装">' +
      '<header class="wb-heading"><div><h1>核废料的四重屏障</h1>' +
      '<p>从内到外，把一道道屏障建起来，看看它们如何共同隔离放射性废物。</p></div>' +
      '<div class="wb-progress"><span class="wb-count">0 / 4</span><progress max="4" value="0" aria-label="已组装屏障数量"></progress></div></header>' +
      '<div class="wb-workspace"><div class="wb-view-column"><div class="wb-stage" data-drop-zone>' +
      '<div class="wb-stage-top"><span class="wb-render-status">长条剖面 · 3D</span><span>教学示意 · 非工程比例</span></div>' +
      '<canvas class="wb-canvas" tabindex="0" aria-label="四重屏障3D模型。拖动旋转，滚轮缩放；方向键旋转，加减键缩放。"></canvas>' + fallbackMarkup() +
      '<div class="wb-stage-bottom"><span class="wb-model-hint">拖动旋转 · 滚轮缩放</span><button type="button" class="wb-place" disabled>先选择一个部件</button></div></div>' +
      '<div class="wb-view-tools"><label class="wb-explode">分层展开<input type="range" min="0" max="1" step="0.01" value="0" aria-label="模型分层展开程度"></label>' +
      '<button class="wb-text-button" type="button" data-action="view-reset">恢复视角</button><button class="wb-text-button" type="button" data-action="reset">重新组装</button></div>' +
      '<p class="wb-feedback" role="status" aria-live="polite" aria-atomic="true"></p>' +
      '<ol class="wb-steps" aria-label="由内到外的四重屏障">' + layers.map((layer, i) => '<li data-step="' + layer.id + '"><span>' + (i + 1) + '</span><b>' + layer.name + '</b></li>').join('') + '</ol></div>' +
      '<aside class="wb-parts"><h2>选择屏障</h2><p class="wb-parts-help">点选后放入模型，也可以把部件拖到模型上。</p>' +
      '<div class="wb-parts-list">' + order.map((i) => '<button type="button" class="wb-part" data-layer="' + layers[i].id + '" style="--layer-color:' + layers[i].color + '" draggable="true" aria-pressed="false">' +
      '<span class="wb-part-icon">' + layerIcon(i) + '</span><span><b>' + layers[i].name + '</b><small>' + layers[i].type + '</small></span><span class="wb-part-state">待放入</span></button>').join('') + '</div>' +
      '<div class="wb-detail"><h3>多一道屏障，多一层隔离</h3><p>选择任意部件，了解它的作用。先放入最内层的玻璃固化体。</p></div>' +
      '<p class="wb-note">四层共同发挥作用。屏障的材料与具体设计因处置方案和场址而异。</p></aside></div></section>';

    const canvas = root.querySelector('.wb-canvas');
    const fallback = root.querySelector('.wb-fallback');
    const stage = root.querySelector('.wb-stage');
    const feedback = root.querySelector('.wb-feedback');
    const detail = root.querySelector('.wb-detail');
    const placeButton = root.querySelector('.wb-place');
    const explodeInput = root.querySelector('.wb-explode input');
    const viewReset = root.querySelector('[data-action="view-reset"]');
    const cards = Array.from(root.querySelectorAll('[data-layer]'));

    function on(element, type, handler, eventOptions) {
      element.addEventListener(type, handler, eventOptions);
      removers.push(() => element.removeEventListener(type, handler, eventOptions));
    }

    function useFallback() {
      if (destroyed) return;
      canvas.hidden = true;
      fallback.removeAttribute('hidden');
      root.querySelector('.wb-render-status').textContent = '长条剖面 · 示意图';
      root.querySelector('.wb-model-hint').textContent = '可继续点选或拖入部件';
      explodeInput.disabled = true;
      viewReset.disabled = true;
    }

    function update() {
      const progress = state.getProgress();
      root.querySelector('.wb-count').textContent = progress + ' / 4';
      root.querySelector('progress').value = progress;
      root.querySelectorAll('[data-step]').forEach((el, i) => {
        el.classList.toggle('is-built', i < progress);
        if (i === progress) el.setAttribute('aria-current', 'step');
        else el.removeAttribute('aria-current');
      });
      cards.forEach((card) => {
        const index = layers.findIndex((layer) => layer.id === card.dataset.layer);
        const built = index < progress;
        const active = card.dataset.layer === selected;
        card.classList.toggle('is-built', built);
        card.setAttribute('aria-pressed', String(active));
        card.draggable = !built;
        card.querySelector('.wb-part-state').textContent = built ? '已就位' : active ? '已选择' : '待放入';
      });
      root.querySelectorAll('[data-section]').forEach((el) => {
        el.classList.toggle('is-built', layers.findIndex((layer) => layer.id === el.dataset.section) < progress);
      });
      if (scene && scene.supported) scene.setProgress(progress);
      const selectedIndex = layers.findIndex((layer) => layer.id === selected);
      placeButton.disabled = selectedIndex < progress || selectedIndex < 0 || progress === 4;
      placeButton.textContent = progress === 4 ? '四重屏障已建成' : selectedIndex < 0 ? '先选择一个部件' : selectedIndex < progress ? '这个屏障已就位' : '放入：' + layers[selectedIndex].name;
      root.querySelector('.wb-lab').classList.toggle('is-complete', progress === 4);
    }

    function select(id) {
      const layer = layers.find((item) => item.id === id);
      if (!layer || destroyed) return;
      selected = id;
      detail.innerHTML = '<h3>' + layer.name + '</h3><p class="wb-role">' + layer.role + '</p><p>' + layer.detail + '</p>';
      update();
    }

    function place(id) {
      if (destroyed) return;
      const result = state.place(id);
      if (destroyed) return; // 宿主可在完成回调中销毁当前关卡并进入下一关。
      const current = layers[result.progress];
      if (result.status === 'placed') {
        feedback.textContent = result.progress === 4 ? '组装完成！人工屏障与天然围岩共同构成多重隔离。' : '已放入' + layers[result.progress - 1].name + '。下一层：' + current.name + '。';
      } else if (result.status === 'order') {
        feedback.textContent = '这一层还在外面。先放入' + current.name + '，再继续向外组装。';
      } else if (result.status === 'already') {
        feedback.textContent = '这个屏障已经就位，可以选择下一层。';
      }
      update();
    }

    function endDrag() {
      dragging = null;
      stage.classList.remove('is-drag-over');
    }

    cards.forEach((card) => {
      on(card, 'click', () => select(card.dataset.layer));
      on(card, 'dragstart', (event) => {
        if (!card.draggable) { event.preventDefault(); return; }
        dragging = card.dataset.layer;
        select(dragging);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', dragging);
        }
      });
      on(card, 'dragend', endDrag);
    });
    on(stage, 'dragover', (event) => {
      if (!dragging) return;
      event.preventDefault();
      stage.classList.add('is-drag-over');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    on(stage, 'dragleave', (event) => { if (!stage.contains(event.relatedTarget)) stage.classList.remove('is-drag-over'); });
    on(stage, 'drop', (event) => {
      if (!dragging) return;
      event.preventDefault();
      const id = dragging;
      endDrag();
      place(id);
    });
    on(window, 'blur', endDrag);
    on(placeButton, 'click', () => place(selected));
    on(root.querySelector('[data-action="reset"]'), 'click', () => {
      endDrag();
      selected = null;
      state.reset();
      if (destroyed) return;
      feedback.textContent = '已重新开始。先选择最内层的玻璃固化体。';
      detail.innerHTML = '<h3>从最内层开始</h3><p>选择部件后，点击“放入”或把部件拖到模型上。</p>';
      update();
    });
    on(viewReset, 'click', () => { if (scene) scene.resetView(); });
    on(explodeInput, 'input', () => { if (scene) scene.setExploded(Number(explodeInput.value)); });

    try {
      scene = NEG.WasteBarrierScene && NEG.WasteBarrierScene.create(canvas, { onUnavailable: useFallback });
    } catch (error) { scene = null; }
    if (!scene || !scene.supported) useFallback();
    update();
    feedback.textContent = state.getProgress() === 4 ? '四重屏障已建成，可选择各层查看作用，或重新组装。' : '先选择最内层的玻璃固化体。';

    return {
      getProgress: state.getProgress,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        removers.splice(0).forEach((remove) => remove());
        if (scene) scene.destroy();
        root.innerHTML = '';
      }
    };
  }

  NEG.WasteBarriers = { layers, createState, mount };
})(window.NEG);
