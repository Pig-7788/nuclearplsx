/* ============================================================
   核纪元 · 深地质处置
   ------------------------------------------------------------
   3D 多重屏障 / 深部处置库剖面
   - 处置库全景与多重屏障两种视角
   - 一键拆解五重屏障
   - 轨道观察 / 部件拾取 / 标注追踪
   - 教学示意，不含具体场址工程参数
   ============================================================ */
(function (NEG) {
  'use strict';

  const DATA = (NEG.data && NEG.data.repository) || null;
  if (!DATA) return;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };
  const delayEase = (e, delay) => ease((e - delay) / (1 - delay));
  const pad2 = (n) => String(n).padStart(2, '0');

  function sideClass(offset) {
    if (Math.abs(offset[0]) < 4) return ' is-center';
    return offset[0] < 0 ? ' is-left' : '';
  }

  NEG.registerMode({
    id: 'repository',
    order: 7,
    title: '深地质处置',
    nav: '地质处置',
    icon: 'vault',
    accent: '#7fe0b0',
    blurb: '把高放废物封进玻璃、钢桶、膨润土与 500 米岩层，亲手拆开五重屏障。',

    progress(s) {
      const m = (s.modes && s.modes.repository) || {};
      const viewed = Array.isArray(m.viewed) ? m.viewed.length : 0;
      return Math.max(viewed / DATA.parts.length, m.exploded ? 1 : 0);
    },

    isComplete(s) {
      return !!((s.modes && s.modes.repository && s.modes.repository.exploded) || 0);
    },

    render(root, ctx) {
      const { store, ui, util: U } = ctx;
      const state = store.get();
      const modeState = (state.modes && state.modes.repository) || {};
      const viewed = new Set(Array.isArray(modeState.viewed) ? modeState.viewed : []);
      const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const selectedId = 'rock';

      const partButtons = DATA.parts.map((p) => (
        '<button class="ri-item" type="button" data-part="' + p.id + '" style="--p-accent:' + p.accent + '">' +
          '<span class="ri-num">' + pad2(p.index) + '</span>' +
          '<span class="ri-body"><b>' + U.esc(p.name) + '</b><em>' + U.esc(p.en) + '</em></span>' +
          '<span class="ri-dot" aria-hidden="true"></span>' +
        '</button>'
      )).join('');

      const labelHTML = DATA.parts.map((p) => (
        '<button class="repo-label" type="button" data-label-part="' + p.id + '" style="--p-accent:' + p.accent + '">' +
          '<span class="rl-dot" aria-hidden="true"></span>' +
          '<span class="rl-card' + sideClass(p.labelOffset) + '" style="--lx:' + p.labelOffset[0] + 'px;--ly:' + p.labelOffset[1] + 'px">' +
            '<span class="rl-idx">' + pad2(p.index) + '</span>' +
            '<span class="rl-name">' + U.esc(p.name) + '</span>' +
          '</span>' +
        '</button>'
      )).join('');

      const chainHTML = DATA.chain.map((c, i) => (
        '<span class="rc-node" style="--i:' + i + '">' +
          '<i aria-hidden="true"></i><b>' + U.esc(c.label) + '</b><em>' + U.esc(c.note) + '</em>' +
        '</span>' + (i < DATA.chain.length - 1 ? '<span class="rc-arrow" aria-hidden="true">→</span>' : '')
      )).join('');

      root.innerHTML =
        '<div class="repo-page mode-page" id="repoPage">' +
          '<div class="page-top repo-top">' +
            '<div class="pt-brand">' +
              '<span class="eyebrow">DEEP GEOLOGICAL DISPOSAL · 深地质处置</span>' +
              '<h2>' + NEG.icon('vault', 23) + '深地质处置 <span class="badge badge-green">3D / MULTI-BARRIER</span></h2>' +
              '<p class="lead-inline">' + U.esc(DATA.intro) + '</p>' +
            '</div>' +
            '<div class="pt-tools">' +
              '<span class="repo-status-chip"><i aria-hidden="true"></i><span>REFERENCE DEPTH 500 M</span></span>' +
              '<button class="btn btn-sm btn-quiet" type="button" data-action="sources">' + NEG.icon('info', 14) + '资料与说明</button>' +
            '</div>' +
          '</div>' +

          '<div class="repo-layout">' +
            '<aside class="repo-index panel" aria-label="多重屏障索引">' +
              '<div class="ri-head">' +
                '<span class="eyebrow">BARRIER STACK</span>' +
                '<b>05</b>' +
              '</div>' +
              '<p class="ri-sub">从废物体到围岩：点击任意屏障，或在 3D 场景中直接选取。</p>' +
              '<div class="ri-list" role="list">' + partButtons + '</div>' +
              '<div class="ri-legend">' +
                '<span><i class="eng"></i>工程屏障 · 04</span>' +
                '<span><i class="nat"></i>天然屏障 · 01</span>' +
              '</div>' +
              '<div class="ri-progress"><span>已查看屏障</span><b id="repoViewed">0 / 5</b></div>' +
              '<div class="ri-bar"><i id="repoViewedBar"></i></div>' +
              '<div class="ri-note">' +
                '<span class="ri-note-title">' + NEG.icon('shield', 13) + '安全逻辑</span>' +
                '<p>多重屏障不是“绝对封印”，而是把可能的释放路径拆成多个独立、互补的环节；具体隔离时间取决于废物类型、场址地质条件与监管要求。</p>' +
              '</div>' +
              '<div class="ri-foot"><span>SCHEMATIC / EDU ONLY</span><span>REV 1.0</span></div>' +
            '</aside>' +

            '<section class="repo-stage-shell" aria-label="深地质处置库 3D 场景">' +
              '<div class="repo-stage" id="repoStage" tabindex="0" aria-label="可交互的深地质处置库 3D 剖面。拖拽旋转，滚轮缩放，按 E 拆解屏障。" aria-describedby="repoStageHint">' +
                '<canvas id="repoCanvas"></canvas>' +
                '<div class="repo-atmosphere" aria-hidden="true"></div>' +
                '<div class="repo-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
                '<div class="repo-hud repo-hud-top">' +
                  '<span class="rh-live"><i></i> LIVE SCENE</span>' +
                  '<span class="rh-sep"></span>' +
                  '<span>DEEP DISPOSAL</span>' +
                  '<span class="rh-right"><em id="repoState">ASSEMBLED</em><b id="repoBarrierCount">05</b> BARRIERS</span>' +
                '</div>' +
                '<div class="repo-hud repo-hud-right">' +
                  '<span>VIEW</span><b id="repoViewName">OVERVIEW</b><span>ZOOM</span><b id="repoZoom">1.00×</b>' +
                '</div>' +
                '<div class="depth-ruler" aria-hidden="true">' +
                  '<span class="dr-title">DEPTH</span>' +
                  '<span class="dr-tick" style="--y:0%"><b>0</b><em>m</em></span>' +
                  '<span class="dr-tick" style="--y:25%"><b>100</b><em>m</em></span>' +
                  '<span class="dr-tick" style="--y:60%"><b>300</b><em>m</em></span>' +
                  '<span class="dr-tick" style="--y:100%"><b>500</b><em>m</em></span>' +
                  '<i class="dr-line"></i>' +
                  '<i class="dr-marker"></i>' +
                  '<span class="dr-label">REPOSITORY</span>' +
                '</div>' +
                '<svg class="repo-leaders" id="repoLeaders" aria-hidden="true"></svg>' +
                '<div class="repo-labels" id="repoLabels">' + labelHTML + '</div>' +
                '<div class="repo-infra" id="repoInfra" aria-hidden="true">' +
                  '<span data-infra="surface"><i></i>地表设施</span>' +
                  '<span data-infra="shaft"><i></i>竖井</span>' +
                  '<span data-infra="tunnel"><i></i>处置巷道</span>' +
                  '<span data-infra="canister"><i></i>废物包</span>' +
                '</div>' +
                '<div class="repo-reticle" aria-hidden="true"><span></span><i></i></div>' +
                '<div class="repo-loading" id="repoLoading">' +
                  '<span class="loader-ring" aria-hidden="true"></span>' +
                  '<b>正在建立地质剖面</b><em>WEBGL / THREE.JS</em>' +
                '</div>' +
                '<div class="repo-fallback" id="repoFallback" hidden>' +
                  '<b>此浏览器无法启动 WebGL 3D 场景</b>' +
                  '<p>你仍然可以在左侧索引中阅读五重屏障的说明。请尝试更新浏览器或启用硬件加速。</p>' +
                '</div>' +
                '<div class="repo-view-switch" role="tablist" aria-label="场景视角">' +
                  '<button class="is-active" type="button" data-view="wide" role="tab" aria-selected="true">处置库全景</button>' +
                  '<button type="button" data-view="barrier" role="tab" aria-selected="false">多重屏障</button>' +
                '</div>' +
                '<div class="repo-tools">' +
                  '<button class="repo-icon-btn" type="button" data-tool="auto" aria-pressed="' + (reduceMotion ? 'false' : 'true') + '" title="自动旋转">' + NEG.icon('orbit', 17) + '</button>' +
                  '<button class="repo-icon-btn" type="button" data-tool="labels" aria-pressed="true" title="显示 / 隐藏标注">' + NEG.icon('tag', 17) + '</button>' +
                  '<button class="repo-icon-btn" type="button" data-tool="reset" title="复位视角">' + NEG.icon('refresh', 17) + '</button>' +
                '</div>' +
                '<div class="repo-actions">' +
                  '<button class="btn btn-repo btn-lg" type="button" data-action="explode" id="repoExplodeBtn">' +
                    NEG.icon('unfold', 18) + '<span>拆解屏障</span>' +
                  '</button>' +
                  '<button class="btn btn-repo-ghost btn-lg" type="button" data-action="depth">' + NEG.icon('target', 17) + '<span>聚焦处置库</span></button>' +
                  '<div class="repo-scrub">' +
                    '<div class="rs-head"><span>BARRIER EXPLODE</span><b id="repoExplodeValue">0%</b></div>' +
                    '<input id="repoExplodeRange" type="range" min="0" max="100" value="0" step="1" aria-label="屏障拆解进度">' +
                  '</div>' +
                '</div>' +
                '<div class="repo-hint" id="repoStageHint">' +
                  '<span><kbd>DRAG</kbd> 旋转</span><span><kbd>SCROLL</kbd> 缩放</span><span><kbd>E</kbd> 拆解</span><span><kbd>R</kbd> 复位</span>' +
                '</div>' +
              '</div>' +
            '</section>' +

            '<aside class="repo-detail panel" aria-label="屏障详情" aria-live="polite">' +
              '<div class="rd-top"><span class="rd-index" id="repoDetailIndex">01</span><span class="rd-count"><b id="repoDetailCount">01</b> / 05</span></div>' +
              '<div class="rd-title">' +
                '<span class="eyebrow" id="repoDetailEn">VITRIFIED WASTE FORM</span>' +
                '<h3 id="repoDetailName">玻璃固化体</h3>' +
                '<span class="badge badge-line" id="repoDetailTag">工程屏障 / 废物体</span>' +
              '</div>' +
              '<p class="rd-role" id="repoDetailRole"></p>' +
              '<p class="rd-desc" id="repoDetailDesc"></p>' +
              '<div class="rd-specs">' +
                '<div><span>MATERIAL / 材料</span><b id="repoDetailMaterial"></b></div>' +
                '<div><span>BARRIER / 屏障类型</span><b id="repoDetailLayer"></b></div>' +
              '</div>' +
              '<div class="rd-fact"><span>' + NEG.icon('bolt', 14) + '</span><p id="repoDetailFact"></p></div>' +
              '<p class="rd-note" id="repoDetailNote"></p>' +
              '<div class="rd-actions">' +
                '<button class="btn btn-sm btn-repo-ghost" type="button" data-action="focus">' + NEG.icon('target', 14) + '聚焦此层</button>' +
                '<button class="btn btn-sm btn-quiet" type="button" data-action="sources">' + NEG.icon('book', 14) + '资料</button>' +
              '</div>' +
              '<div class="rd-scanline" aria-hidden="true"></div>' +
            '</aside>' +
          '</div>' +

          '<div class="repo-chain" aria-label="多重屏障序列">' +
            '<div class="rc-head"><span class="eyebrow">MULTI-BARRIER</span><b>从废物到岩体</b></div>' +
            '<div class="rc-track">' + chainHTML + '</div>' +
            '<p class="rc-caveat">' + U.esc(DATA.caveat) + '</p>' +
          '</div>' +
        '</div>';

      const exitShell = (NEG.shell && typeof NEG.shell.full === 'function') ? NEG.shell.full('repository') : function () {};
      const stageEl = root.querySelector('#repoStage');
      const canvas = root.querySelector('#repoCanvas');
      const loadingEl = root.querySelector('#repoLoading');
      const fallbackEl = root.querySelector('#repoFallback');
      const labelsEl = root.querySelector('#repoLabels');
      const leadersEl = root.querySelector('#repoLeaders');
      const infraEl = root.querySelector('#repoInfra');
      const explodeBtn = root.querySelector('#repoExplodeBtn');
      const explodeRange = root.querySelector('#repoExplodeRange');
      const explodeValue = root.querySelector('#repoExplodeValue');
      const stateEl = root.querySelector('#repoState');
      const countEl = root.querySelector('#repoBarrierCount');
      const zoomEl = root.querySelector('#repoZoom');
      const viewNameEl = root.querySelector('#repoViewName');
      const viewedEl = root.querySelector('#repoViewed');
      const viewedBar = root.querySelector('#repoViewedBar');
      const detailEl = root.querySelector('.repo-detail');

      let selected = selectedId;
      let labelsOn = true;
      let autoOn = !reduceMotion;
      let explodeTarget = 0;
      let explodeCurrent = 0;
      let mode = 'wide';
      let credited = false;
      let destroyed = false;
      let view = null;
      let raf = null;
      let renderer = null;
      let scene = null;
      let camera = null;
      let resizeObserver = null;
      let hovered = null;

      const cleanups = [];
      const on = (el, type, fn, opts) => {
        if (!el) return;
        el.addEventListener(type, fn, opts);
        cleanups.push(() => el.removeEventListener(type, fn, opts));
      };

      function markViewed(id) {
        if (viewed.has(id)) return false;
        viewed.add(id);
        store.set((s) => {
          if (!s.modes.repository) s.modes.repository = { plays: 0, exploded: 0, viewed: [] };
          if (!Array.isArray(s.modes.repository.viewed)) s.modes.repository.viewed = [];
          if (s.modes.repository.viewed.indexOf(id) < 0) s.modes.repository.viewed.push(id);
        }, 'repository-view');
        updateViewedUI();
        return true;
      }

      function updateViewedUI() {
        viewedEl.textContent = viewed.size + ' / ' + DATA.parts.length;
        viewedBar.style.width = Math.round(viewed.size / DATA.parts.length * 100) + '%';
      }

      function paintDetail(part) {
        root.querySelector('#repoDetailIndex').textContent = pad2(part.index);
        root.querySelector('#repoDetailCount').textContent = pad2(part.index);
        root.querySelector('#repoDetailEn').textContent = part.en;
        root.querySelector('#repoDetailName').textContent = part.name;
        root.querySelector('#repoDetailTag').textContent = part.tag;
        root.querySelector('#repoDetailRole').textContent = part.role;
        root.querySelector('#repoDetailDesc').textContent = part.desc;
        root.querySelector('#repoDetailMaterial').textContent = part.material;
        root.querySelector('#repoDetailLayer').textContent = part.tag;
        root.querySelector('#repoDetailFact').textContent = part.fact;
        root.querySelector('#repoDetailNote').textContent = part.note;
        detailEl.style.setProperty('--p-accent', part.accent);
        root.querySelectorAll('.ri-item').forEach((btn) => {
          const active = btn.dataset.part === part.id;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-current', active ? 'true' : 'false');
        });
        root.querySelectorAll('.repo-label').forEach((label) => {
          label.classList.toggle('is-active', label.dataset.labelPart === part.id);
        });
      }

      function setSelected(id, opts) {
        const part = DATA.parts.find((p) => p.id === id);
        if (!part) return;
        if (mode !== 'barrier') setMode('barrier', { sound: false });
        selected = id;
        paintDetail(part);
        markViewed(id);
        if (view) view.setSelected(id);
        if (!opts || opts.sound !== false) ctx.audio.play('click');
      }

      function setMode(next, opts) {
        mode = next === 'barrier' ? 'barrier' : 'wide';
        root.querySelectorAll('[data-view]').forEach((b) => {
          const active = b.dataset.view === mode;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        viewNameEl.textContent = mode === 'barrier' ? 'MULTI-BARRIER' : 'OVERVIEW';
        if (view && view.setMode) view.setMode(mode);
        if (!opts || opts.sound !== false) ctx.audio.play('click');
      }

      function setExplode(value, opts) {
        explodeTarget = clamp(value, 0, 1);
        const pct = Math.round(explodeTarget * 100);
        explodeRange.value = String(pct);
        explodeValue.textContent = pct + '%';
        countEl.textContent = '05';
        stateEl.textContent = explodeTarget > 0.98 ? 'DISSECTED' : explodeTarget > 0.02 ? 'IN MOTION' : 'ASSEMBLED';
        explodeBtn.classList.toggle('is-exploded', explodeTarget > 0.5);
        explodeBtn.innerHTML = (explodeTarget > 0.5 ? NEG.icon('build', 18) : NEG.icon('unfold', 18)) +
          '<span>' + (explodeTarget > 0.5 ? '组装屏障' : '拆解屏障') + '</span>';
        if (explodeTarget > 0.985) {
          if (!credited) {
            credited = true;
            const before = (store.get().modes.repository || {}).exploded || 0;
            store.set((s) => {
              if (!s.modes.repository) s.modes.repository = { plays: 0, exploded: 0, viewed: [] };
              s.modes.repository.exploded = before + 1;
            }, 'repository-explode');
            if (before === 0) {
              store.addScore(25, 'repository-explode');
              ui.toast('五重屏障已展开 · 屏障守护者 +25', 'success', { title: '从玻璃体到围岩' });
            }
            ctx.achievements.checkAll();
          }
        } else if (explodeTarget < 0.01) {
          credited = false;
        }
        if (view && view.updateCameraTarget) view.updateCameraTarget();
        if (!opts || opts.sound !== false) {
          if (explodeTarget > 0.5) ctx.audio.play('build');
          else ctx.audio.play('click');
        }
      }

      function toggleExplode() {
        if (explodeTarget <= 0.5) {
          if (mode !== 'barrier') setMode('barrier', { sound: false });
          setExplode(1);
        } else {
          setExplode(0);
        }
      }

      function openSources() {
        const sources = DATA.sources.map((s) =>
          '<li><a href="' + U.esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + U.esc(s.name) + '</a></li>'
        ).join('');
        const notes = DATA.notes.map((n) =>
          '<div class="repo-source-note"><b>' + U.esc(n.title) + '</b><p>' + U.esc(n.text) + '</p></div>'
        ).join('');
        ui.modal({
          eyebrow: 'SOURCES · 资料与说明',
          title: '深地质处置的安全逻辑',
          html:
            '<p style="color:var(--text-2);font-size:13px;line-height:1.8">' + U.esc(DATA.caveat) + '</p>' +
            '<h3 style="margin:18px 0 8px;font-size:14px">两个常见延伸</h3>' + notes +
            '<h3 style="margin:18px 0 8px;font-size:14px">公开资料来源</h3>' +
            '<ul class="repo-source-list">' + sources + '</ul>' +
            '<p style="color:var(--text-3);font-size:11.5px;line-height:1.7;margin-top:16px">' +
              '本页只解释多重屏障的概念与功能，不构成场址选择、工程设计或监管结论。' +
            '</p>',
          wide: true,
          actions: [{ label: '关闭', kind: 'ghost' }]
        });
      }

      root.querySelectorAll('[data-part]').forEach((btn) => {
        on(btn, 'click', () => setSelected(btn.dataset.part));
      });
      root.querySelectorAll('[data-label-part]').forEach((btn) => {
        on(btn, 'click', (e) => { e.stopPropagation(); setSelected(btn.dataset.labelPart); });
        on(btn, 'pointerdown', (e) => e.stopPropagation());
      });
      on(explodeBtn, 'click', toggleExplode);
      on(explodeRange, 'input', () => {
        const value = Number(explodeRange.value) / 100;
        if (value > 0.05 && mode !== 'barrier') setMode('barrier', { sound: false });
        setExplode(value, { sound: false });
      });
      root.querySelectorAll('[data-view]').forEach((btn) => {
        on(btn, 'click', () => {
          if (btn.dataset.view === 'wide' && explodeTarget > 0.5) setExplode(0, { sound: false });
          setMode(btn.dataset.view);
        });
      });
      on(root.querySelector('[data-tool="auto"]'), 'click', (e) => {
        autoOn = !autoOn;
        e.currentTarget.setAttribute('aria-pressed', autoOn ? 'true' : 'false');
        e.currentTarget.classList.toggle('is-off', !autoOn);
        if (view) view.setAuto(autoOn);
        ctx.audio.play('click');
      });
      on(root.querySelector('[data-tool="labels"]'), 'click', (e) => {
        labelsOn = !labelsOn;
        e.currentTarget.setAttribute('aria-pressed', labelsOn ? 'true' : 'false');
        e.currentTarget.classList.toggle('is-off', !labelsOn);
        labelsEl.classList.toggle('is-hidden', !labelsOn);
        ctx.audio.play('click');
      });
      on(root.querySelector('[data-tool="reset"]'), 'click', () => {
        if (view) view.resetView();
        ctx.audio.play('click');
      });
      on(root.querySelector('[data-action="depth"]'), 'click', () => {
        if (explodeTarget > 0.5) setExplode(0, { sound: false });
        setMode('wide', { sound: false });
        if (view) view.focusRepository();
        ctx.audio.play('click');
      });
      root.querySelectorAll('[data-action="sources"]').forEach((btn) => on(btn, 'click', openSources));
      on(root.querySelector('[data-action="focus"]'), 'click', () => {
        setMode('barrier', { sound: false });
        if (view) view.focusSelected();
        ctx.audio.play('click');
      });

      updateViewedUI();
      paintDetail(DATA.parts.find((p) => p.id === selectedId) || DATA.parts[0]);
      markViewed(selectedId);

      function onKey(e) {
        if (document.querySelector('.overlay')) return;
        if (U.isTyping(e)) return;
        if (!NEG.tasks || NEG.tasks.currentId() !== 'repository') return;
        const k = e.key.toLowerCase();
        if (k === 'e') { e.preventDefault(); toggleExplode(); }
        else if (k === 'r') { e.preventDefault(); if (view) view.resetView(); }
        else if (k === 'l') {
          e.preventDefault();
          const btn = root.querySelector('[data-tool="labels"]');
          if (btn) btn.click();
        } else if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') {
          if (!stageEl.contains(document.activeElement) && document.activeElement !== stageEl) return;
          e.preventDefault();
          if (view) view.nudge(k);
        } else if (k === '+' || k === '=') {
          if (view) view.zoomBy(-1.1);
        } else if (k === '-') {
          if (view) view.zoomBy(1.1);
        }
      }
      on(document, 'keydown', onKey);

      if (!window.THREE || typeof window.THREE.WebGLRenderer !== 'function') {
        loadingEl.hidden = true;
        fallbackEl.hidden = false;
        return function cleanup() {
          cleanups.forEach((fn) => fn());
          exitShell();
        };
      }

      try {
        view = createView();
      } catch (err) {
        console.error('[Repository] WebGL 初始化失败', err);
        loadingEl.hidden = true;
        fallbackEl.hidden = false;
        return function cleanup() {
          cleanups.forEach((fn) => fn());
          exitShell();
        };
      }

      loadingEl.classList.add('is-done');
      setTimeout(() => { if (!destroyed) loadingEl.hidden = true; }, 480);
      setMode('wide', { sound: false });
      setExplode(0, { sound: false });
      if (view) view.setAuto(autoOn);

      return function cleanup() {
        destroyed = true;
        cleanups.forEach((fn) => fn());
        if (raf) cancelAnimationFrame(raf);
        if (resizeObserver) resizeObserver.disconnect();
        if (view && view.dispose) view.dispose();
        if (renderer) {
          renderer.dispose();
          if (renderer.forceContextLoss) {
            try { renderer.forceContextLoss(); } catch (e) { /* noop */ }
          }
        }
        exitShell();
      };

      /* ==========================================================
         3D 场景
         ========================================================== */
      function createView() {
        const T = window.THREE;
        const rect = stageEl.getBoundingClientRect();
        if (!rect.width || !rect.height) throw new Error('舞台尺寸为 0');

        renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(rect.width, rect.height, false);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.03;
        renderer.setClearColor(0x000000, 0);

        scene = new T.Scene();
        scene.fog = new T.FogExp2(0x04080d, 0.012);
        camera = new T.PerspectiveCamera(45, rect.width / rect.height, 0.1, 140);

        const envTex = makeEnvTexture(T);
        const pmrem = new T.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const envRT = pmrem.fromEquirectangular(envTex);
        scene.environment = envRT.texture;
        envTex.dispose();
        pmrem.dispose();

        scene.add(new T.HemisphereLight(0xc5e9ff, 0x140f09, 0.7));
        const key = new T.DirectionalLight(0xffe1b5, 1.65);
        key.position.set(6, 10, 7);
        scene.add(key);
        const fill = new T.DirectionalLight(0x5aa7d8, 1.15);
        fill.position.set(-8, 4, -5);
        scene.add(fill);
        const frontFill = new T.DirectionalLight(0xa8e5ff, 0.72);
        frontFill.position.set(2, 3, 8);
        scene.add(frontFill);
        const rim = new T.PointLight(0xffb347, 5.5, 20, 2);
        rim.position.set(3.5, -1.5, 5.5);
        scene.add(rim);
        const green = new T.PointLight(0x62e6b0, 4.5, 16, 2);
        green.position.set(-3.2, -3.2, 1.2);
        scene.add(green);
        const coreLight = new T.PointLight(0xffc766, 2.6, 3.8, 2);
        coreLight.position.set(2.8, -3.0, 2.0);
        scene.add(coreLight);

        const world = new T.Group();
        scene.add(world);

        const rockTex = makeRockTexture(T);
        const grassTex = makeGrassTexture(T);
        const rockMat = new T.MeshStandardMaterial({ map: rockTex, color: 0xb7c4c0, roughness: 0.96, metalness: 0.04 });
        const darkRockMat = new T.MeshStandardMaterial({ map: rockTex, color: 0x59665f, roughness: 0.98, metalness: 0.03 });
        const grassMat = new T.MeshStandardMaterial({ map: grassTex, color: 0x7fbf8a, roughness: 1, metalness: 0 });
        const concreteMat = new T.MeshStandardMaterial({ color: 0x7c8584, roughness: 0.88, metalness: 0.06 });
        const steelMat = new T.MeshStandardMaterial({ color: 0x748697, metalness: 0.9, roughness: 0.3 });
        const darkSteelMat = new T.MeshStandardMaterial({ color: 0x26313c, metalness: 0.86, roughness: 0.38 });
        const copperMat = new T.MeshStandardMaterial({ color: 0xb87333, metalness: 0.86, roughness: 0.32, emissive: 0x2a1002, emissiveIntensity: 0.35 });
        const clayMat = new T.MeshStandardMaterial({ color: 0xb77b4f, metalness: 0.05, roughness: 0.92, emissive: 0x1b0c05, emissiveIntensity: 0.25 });
        const bufferMat = new T.MeshStandardMaterial({ color: 0xd1a16f, metalness: 0.04, roughness: 0.9, emissive: 0x221005, emissiveIntensity: 0.2 });
        const glassMat = new T.MeshPhysicalMaterial({
          color: 0x9a6a21,
          metalness: 0.2,
          roughness: 0.22,
          clearcoat: 0.8,
          clearcoatRoughness: 0.12,
          emissive: 0xffa938,
          emissiveIntensity: 0.42
        });

        const partsMap = {};
        DATA.parts.forEach((p) => {
          partsMap[p.id] = { data: p, objects: [], anchor: null, materials: [] };
        });
        const pickables = [];
        const animatables = [];

        function register(obj, partId, opts) {
          const rec = partsMap[partId];
          if (!rec) return;
          obj.traverse((child) => {
            if (child.isMesh) {
              child.userData.partId = partId;
              rec.objects.push(child);
              pickables.push(child);
              if (child.material) {
                if (Array.isArray(child.material)) rec.materials.push.apply(rec.materials, child.material);
                else rec.materials.push(child.material);
              }
            }
          });
          if (opts && opts.anchor) {
            const a = new T.Object3D();
            a.position.set(opts.anchor[0], opts.anchor[1], opts.anchor[2]);
            obj.add(a);
            rec.anchor = a;
          }
        }

        function addAnim(obj, explode, delay) {
          obj.userData.basePos = obj.position.clone();
          obj.userData.exp = (explode && explode.isVector3)
            ? explode.clone()
            : new T.Vector3(explode[0], explode[1], explode[2]);
          obj.userData.delay = delay || 0;
          animatables.push(obj);
        }

        /* ---------- 地质剖面 ---------- */
        const geology = makeGeology(T, { rockMat, darkRockMat, grassMat, concreteMat, steelMat, darkSteelMat });
        world.add(geology.group);

        /* ---------- 地表设施 / 竖井 ---------- */
        const surface = makeSurface(T, { grassMat, concreteMat, steelMat, darkSteelMat });
        world.add(surface.group);

        const shaft = makeShaft(T, { steelMat, concreteMat, darkSteelMat });
        world.add(shaft.group);

        const repository = makeRepository(T, { rockMat, darkRockMat, copperMat, clayMat, steelMat });
        world.add(repository.group);

        /* ---------- 多重屏障展件 ---------- */
        const barrier = makeBarrier(T, { rockMat, clayMat, bufferMat, concreteMat, steelMat, copperMat, glassMat, coreLight });
        barrier.group.rotation.y = 0.74;
        barrier.group.scale.setScalar(0.78);
        barrier.group.position.set(3.5, -3.05, 2.0);
        world.add(barrier.group);

        const barrierBackdrop = makeBarrierBackdrop(T, barrier.group.position);
        barrierBackdrop.visible = false;
        world.add(barrierBackdrop);

        // 让竖井、巷道和屏障展件都带有可拾取部件标识
        register(barrier.glass, 'glass', { anchor: [0, 0.72, 0.12] });
        register(barrier.canister, 'canister', { anchor: [0, 0.98, 0.18] });
        register(barrier.bentonite, 'bentonite', { anchor: [0, 1.14, 0.2] });
        register(barrier.backfill, 'backfill', { anchor: [0, 1.3, 0.22] });
        register(barrier.rock, 'rock', { anchor: [0, 1.46, 0.24] });
        register(repository.canisters, 'canister');

        barrier.shells.forEach((shell) => addAnim(shell, shell.userData.exp, shell.userData.delay));
        addAnim(barrier.group, [0, 0, 0], 0);

        const halo = makeHalo(T);
        world.add(halo);

        const dust = makeDust(T);
        scene.add(dust);

        const cam = {
          theta: 0.72,
          phi: 1.02,
          radius: 14,
          thetaT: 0.72,
          phiT: 1.02,
          radiusT: 14,
          target: new T.Vector3(0, -2.0, 0),
          targetT: new T.Vector3(0, -2.0, 0),
          auto: autoOn,
          autoPause: 0,
          dragging: false,
          pointerId: null,
          lastX: 0,
          lastY: 0,
          moved: 0,
          pointers: new Map(),
          pinchDist: 0,
          baseRadius: 14,
          lastMode: 'wide'
        };

        function fitRadius(nextMode, exploded) {
          const aspect = Math.max(0.55, camera.aspect);
          if (nextMode === 'barrier') {
            const r = (exploded ? 8.8 : 6.1) / aspect;
            return clamp(r, 4.8, 21);
          }
          const r = 15.2 / aspect;
          return clamp(r, 10.5, 26);
        }

        function setWorldVisible(show) {
          [geology.group, surface.group, shaft.group, repository.group].forEach((g) => { g.visible = show; });
          barrier.group.visible = !show;
          barrierBackdrop.visible = !show;
        }

        function applyMode(nextMode, immediate) {
          mode = nextMode;
          setWorldVisible(nextMode === 'wide');
          if (nextMode === 'barrier') {
            cam.thetaT = 0.74;
            cam.phiT = 1.13;
            const cx = explodeTarget > 0.5 ? 5.3 : 3.8;
            cam.targetT.set(cx, -3.1, 2.0);
            cam.radiusT = fitRadius('barrier', explodeTarget > 0.5);
          } else {
            cam.thetaT = 0.72;
            cam.phiT = 1.02;
            cam.targetT.set(0, -2.0, 0);
            cam.radiusT = fitRadius('wide', false);
          }
          cam.lastMode = nextMode;
          if (immediate) {
            cam.theta = cam.thetaT;
            cam.phi = cam.phiT;
            cam.radius = cam.radiusT;
            cam.target.copy(cam.targetT);
          }
        }

        function updateCameraTarget(immediate) {
          cam.targetT.set(mode === 'barrier' ? (explodeTarget > 0.5 ? 5.3 : 3.8) : 0, mode === 'barrier' ? -3.1 : -2.0, mode === 'barrier' ? 2.0 : 0);
          cam.radiusT = fitRadius(mode, explodeTarget > 0.5);
          if (immediate) {
            cam.radius = cam.radiusT;
            cam.target.copy(cam.targetT);
          }
        }

        function resetView() {
          cam.thetaT = mode === 'barrier' ? 0.74 : 0.72;
          cam.phiT = mode === 'barrier' ? 1.13 : 1.02;
          cam.targetT.set(mode === 'barrier' ? (explodeTarget > 0.5 ? 5.3 : 3.8) : 0, mode === 'barrier' ? -3.1 : -2.0, mode === 'barrier' ? 2.0 : 0);
          cam.radiusT = fitRadius(mode, explodeTarget > 0.5);
          cam.autoPause = performance.now() + 1800;
        }

        function focusSelected() {
          const rec = partsMap[selected];
          if (!rec || !rec.anchor) return;
          const v = new T.Vector3();
          rec.anchor.getWorldPosition(v);
          cam.targetT.copy(v).multiplyScalar(0.7).add(new T.Vector3(0, -2.2, 1.4).multiplyScalar(0.3));
          cam.thetaT = 0.6;
          cam.phiT = 1.18;
          cam.radiusT = clamp(fitRadius('barrier', true) * 0.72, 5.4, 14);
          cam.autoPause = performance.now() + 3500;
        }

        function focusRepository() {
          cam.thetaT = 0.7;
          cam.phiT = 1.04;
          cam.targetT.set(0.2, -4.0, 0.4);
          cam.radiusT = clamp(fitRadius('wide', false) * 0.62, 7, 14);
          cam.autoPause = performance.now() + 3000;
        }

        function nudge(key) {
          if (key === 'arrowleft') cam.thetaT += 0.14;
          else if (key === 'arrowright') cam.thetaT -= 0.14;
          else if (key === 'arrowup') cam.phiT = clamp(cam.phiT - 0.1, 0.48, 2.5);
          else if (key === 'arrowdown') cam.phiT = clamp(cam.phiT + 0.1, 0.48, 2.5);
          cam.autoPause = performance.now() + 3000;
        }

        function zoomBy(k) {
          cam.radiusT = clamp(cam.radiusT * k, 5, 30);
        }

        function setAuto(v) { cam.auto = !!v; }
        function setModeExternal(next) { applyMode(next, false); }

        function setSelected3D(id) {
          const rec = partsMap[id];
          if (!rec) return;
          halo.material.color.set(rec.data.accent);
          halo.visible = true;
          if (rec.anchor) {
            const v = new T.Vector3();
            rec.anchor.getWorldPosition(v);
            halo.position.copy(v);
          }
        }

        /* ---------- 交互 ---------- */
        function fromUI(e) {
          return !!(e.target && e.target.closest &&
            e.target.closest('.repo-actions, .repo-tools, .repo-view-switch, .repo-label, button, input, a'));
        }

        function resize() {
          if (!renderer || !camera) return;
          const w = stageEl.clientWidth;
          const h = stageEl.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          cam.baseRadius = fitRadius('wide', false);
          cam.radiusT = fitRadius(mode, explodeTarget > 0.5);
        }
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(stageEl);

        const ray = new T.Raycaster();
        function raycast(clientX, clientY) {
          const r = canvas.getBoundingClientRect();
          ray.setFromCamera(new T.Vector2(
            ((clientX - r.left) / r.width) * 2 - 1,
            -((clientY - r.top) / r.height) * 2 + 1
          ), camera);
          const hits = ray.intersectObjects(pickables, false);
          return hits.length ? hits[0].object.userData.partId : null;
        }

        function hoverAt(x, y) {
          const id = raycast(x, y);
          if (id === hovered) return;
          hovered = id;
          stageEl.classList.toggle('is-hovering', !!id);
          root.querySelectorAll('.ri-item').forEach((b) => b.classList.toggle('is-hover', b.dataset.part === id));
        }

        function onPointerDown(e) {
          if (fromUI(e)) return;
          if (e.button != null && e.button !== 0) return;
          stageEl.focus({ preventScroll: true });
          cam.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (cam.pointers.size === 1) {
            cam.dragging = true;
            cam.pointerId = e.pointerId;
            cam.lastX = e.clientX;
            cam.lastY = e.clientY;
            cam.moved = 0;
            cam.autoPause = performance.now() + 5000;
            stageEl.classList.add('is-dragging');
            try { stageEl.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
          } else if (cam.pointers.size === 2) {
            const pts = Array.from(cam.pointers.values());
            cam.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          }
        }

        function onPointerMove(e) {
          if (!cam.pointers.has(e.pointerId)) {
            if (e.pointerType === 'mouse' && !fromUI(e)) hoverAt(e.clientX, e.clientY);
            return;
          }
          cam.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (cam.pointers.size === 2) {
            const pts = Array.from(cam.pointers.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (cam.pinchDist > 0) {
              const k = cam.pinchDist / Math.max(1, dist);
              cam.radiusT = clamp(cam.radiusT * (1 + (k - 1) * 0.65), 5, 30);
            }
            cam.pinchDist = dist;
            return;
          }
          if (e.pointerId !== cam.pointerId || !cam.dragging) return;
          const dx = e.clientX - cam.lastX;
          const dy = e.clientY - cam.lastY;
          cam.lastX = e.clientX;
          cam.lastY = e.clientY;
          cam.moved += Math.abs(dx) + Math.abs(dy);
          cam.thetaT -= dx * 0.0055;
          cam.phiT = clamp(cam.phiT - dy * 0.0045, 0.48, 2.5);
          cam.autoPause = performance.now() + 5000;
        }

        function onPointerUp(e) {
          if (fromUI(e) && !cam.dragging) return;
          cam.pointers.delete(e.pointerId);
          if (cam.pointers.size === 0 && cam.dragging) {
            const wasDrag = cam.moved > 7;
            cam.dragging = false;
            cam.pointerId = null;
            cam.pinchDist = 0;
            stageEl.classList.remove('is-dragging');
            try { stageEl.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
            if (!wasDrag) {
              const id = raycast(e.clientX, e.clientY);
              if (id) setSelected(id);
            }
          }
          if (cam.pointers.size < 2) cam.pinchDist = 0;
          if (cam.pointers.size === 1) {
            const rest = Array.from(cam.pointers.entries())[0];
            cam.pointerId = rest[0];
            cam.lastX = rest[1].x;
            cam.lastY = rest[1].y;
            cam.dragging = true;
            cam.moved = 99;
          }
        }

        function onWheel(e) {
          if (fromUI(e)) return;
          e.preventDefault();
          cam.radiusT = clamp(cam.radiusT * (1 + Math.sign(e.deltaY) * 0.09), 5, 30);
          cam.autoPause = performance.now() + 4000;
        }

        on(stageEl, 'pointerdown', onPointerDown);
        on(stageEl, 'pointermove', onPointerMove);
        on(stageEl, 'pointerup', onPointerUp);
        on(stageEl, 'pointercancel', onPointerUp);
        on(stageEl, 'pointerleave', () => {
          if (cam.dragging) return;
          hovered = null;
          stageEl.classList.remove('is-hovering');
          root.querySelectorAll('.ri-item').forEach((b) => b.classList.remove('is-hover'));
        });
        on(stageEl, 'wheel', onWheel, { passive: false });
        on(stageEl, 'contextmenu', (e) => e.preventDefault());

        const labelEls = Array.from(labelsEl.querySelectorAll('.repo-label')).map((el) => ({
          el,
          id: el.dataset.labelPart,
          part: DATA.parts.find((p) => p.id === el.dataset.labelPart)
        }));
        const leaderLines = {};
        DATA.parts.forEach((p) => {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('stroke', p.accent);
          line.setAttribute('stroke-opacity', '0.28');
          leadersEl.appendChild(line);
          leaderLines[p.id] = line;
        });

        const infraPoints = {
          surface: new T.Vector3(0.75, 0.8, -2.3),
          shaft: new T.Vector3(-2.55, -2.2, -2.0),
          tunnel: new T.Vector3(0.2, -3.82, 0.85),
          canister: new T.Vector3(1.55, -3.82, 0.85)
        };
        const infraEls = Array.from(infraEl.querySelectorAll('[data-infra]'));

        const tmp = new T.Vector3();
        function updateLabels() {
          const w = stageEl.clientWidth;
          const h = stageEl.clientHeight;
          labelEls.forEach((item) => {
            const rec = partsMap[item.id];
            if (!rec || !rec.anchor) { item.el.style.display = 'none'; return; }
            rec.anchor.getWorldPosition(tmp);
            tmp.project(camera);
            const x = (tmp.x * 0.5 + 0.5) * w;
            const y = (-tmp.y * 0.5 + 0.5) * h;
            const show = labelsOn && tmp.z <= 1 && mode === 'barrier';
            item.el.style.display = show ? '' : 'none';
            item.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
            item.el.style.zIndex = item.id === selected ? 8 : 5;
            item.el.classList.toggle('is-active', item.id === selected);

            const line = leaderLines[item.id];
            if (line) {
              const lx = item.part.labelOffset[0];
              const ly = item.part.labelOffset[1];
              const centered = Math.abs(lx) < 4;
              line.setAttribute('x1', x.toFixed(1));
              line.setAttribute('y1', y.toFixed(1));
              line.setAttribute('x2', (centered ? x : x + lx).toFixed(1));
              line.setAttribute('y2', (y + ly).toFixed(1));
              line.setAttribute('stroke-opacity', item.id === selected ? '0.55' : '0.2');
              line.style.display = show ? '' : 'none';
            }
          });
        }

        function updateInfraLabels() {
          const show = labelsOn && mode === 'wide';
          infraEl.style.display = show ? '' : 'none';
          if (!show) return;
          const w = stageEl.clientWidth;
          const h = stageEl.clientHeight;
          infraEls.forEach((el) => {
            const point = infraPoints[el.dataset.infra];
            if (!point) return;
            tmp.copy(point).project(camera);
            const x = (tmp.x * 0.5 + 0.5) * w;
            const y = (-tmp.y * 0.5 + 0.5) * h;
            el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%)';
            el.style.display = tmp.z <= 1 ? '' : 'none';
          });
        }

        function updateHalo() {
          if (mode !== 'barrier') { halo.visible = false; return; }
          const rec = partsMap[selected];
          if (!rec || !rec.anchor) { halo.visible = false; return; }
          rec.anchor.getWorldPosition(tmp);
          halo.visible = true;
          halo.position.copy(tmp);
          const s = explodeCurrent > 0.2 ? 0.86 : 0.7;
          halo.scale.set(s, s, 1);
        }

        let last = performance.now();
        function animate(now) {
          if (destroyed) return;
          raf = requestAnimationFrame(animate);
          const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
          last = now;

          if (explodeTarget > explodeCurrent) explodeCurrent = Math.min(explodeTarget, explodeCurrent + dt * 2.2);
          else if (explodeTarget < explodeCurrent) explodeCurrent = Math.max(explodeTarget, explodeCurrent - dt * 2.2);

          const e = explodeCurrent;
          animatables.forEach((obj) => {
            const local = delayEase(e, obj.userData.delay);
            obj.position.copy(obj.userData.basePos).addScaledVector(obj.userData.exp, local);
          });

          if (cam.auto && !cam.dragging && now > cam.autoPause) cam.thetaT += dt * 0.035;
          const damp = 1 - Math.exp(-dt * 7);
          cam.theta += (cam.thetaT - cam.theta) * damp;
          cam.phi += (cam.phiT - cam.phi) * damp;
          cam.radius += (cam.radiusT - cam.radius) * damp;
          cam.target.lerp(cam.targetT, damp);

          const sinPhi = Math.sin(cam.phi);
          camera.position.set(
            cam.target.x + cam.radius * sinPhi * Math.sin(cam.theta),
            cam.target.y + cam.radius * Math.cos(cam.phi),
            cam.target.z + cam.radius * sinPhi * Math.cos(cam.theta)
          );
          camera.lookAt(cam.target);

          zoomEl.textContent = (cam.baseRadius / cam.radius).toFixed(2) + '×';
          shaft.elevator.position.y = -0.95 + Math.sin(now * 0.00035) * 1.55;
          barrier.glassGlow.material.opacity = 0.4 + Math.sin(now * 0.0022) * 0.06;
          dust.rotation.y += dt * 0.008;
          updateLabels();
          updateInfraLabels();
          updateHalo();
          renderer.render(scene, camera);
        }

        const api = {
          setSelected(id) { setSelected3D(id); },
          setMode: setModeExternal,
          setAuto,
          resetView,
          focusSelected,
          focusRepository,
          updateCameraTarget,
          nudge,
          zoomBy,
          dispose() {
            destroyed = true;
            if (raf) cancelAnimationFrame(raf);
            raf = null;
            if (resizeObserver) resizeObserver.disconnect();
            scene.traverse((obj) => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((m) => {
                  if (m.map) m.map.dispose();
                  m.dispose();
                });
              }
            });
            if (envRT) envRT.dispose();
            renderer.dispose();
          }
        };
        view = api;
        resize();
        applyMode('wide', true);
        setSelected3D(selected);
        raf = requestAnimationFrame(animate);
        return api;
      }

      /* ==========================================================
         几何与材质工具
         ========================================================== */
      function makeRockTexture(T) {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 512;
        const g = c.getContext('2d');
        const bg = g.createLinearGradient(0, 0, 0, 512);
        bg.addColorStop(0, '#5c665f');
        bg.addColorStop(0.35, '#4a514c');
        bg.addColorStop(0.7, '#3d433f');
        bg.addColorStop(1, '#2f3532');
        g.fillStyle = bg;
        g.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 22; i++) {
          const y = (i / 22) * 512 + Math.random() * 8;
          g.globalAlpha = 0.08 + Math.random() * 0.1;
          g.fillStyle = i % 3 === 0 ? '#95a49a' : i % 3 === 1 ? '#2a302c' : '#6d776d';
          g.fillRect(0, y, 512, 2 + Math.random() * 8);
        }
        g.globalAlpha = 0.16;
        for (let i = 0; i < 900; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const s = Math.random() * 2.2;
          g.fillStyle = Math.random() > 0.5 ? '#a2b1a6' : '#1f2421';
          g.fillRect(x, y, s, s);
        }
        g.globalAlpha = 0.2;
        g.strokeStyle = '#1b211e';
        g.lineWidth = 1;
        for (let i = 0; i < 9; i++) {
          g.beginPath();
          let x = Math.random() * 512;
          let y = Math.random() * 512;
          g.moveTo(x, y);
          for (let k = 0; k < 5; k++) {
            x += (Math.random() - 0.5) * 44;
            y += (Math.random() - 0.5) * 38;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.globalAlpha = 1;
        const tex = new T.CanvasTexture(c);
        tex.wrapS = T.RepeatWrapping;
        tex.wrapT = T.RepeatWrapping;
        tex.repeat.set(3, 1.5);
        tex.colorSpace = T.SRGBColorSpace;
        return tex;
      }

      function makeGrassTexture(T) {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = '#2d5b3d';
        g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 3500; i++) {
          g.fillStyle = Math.random() > 0.5 ? 'rgba(118,180,112,0.22)' : 'rgba(24,54,39,0.38)';
          g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        const tex = new T.CanvasTexture(c);
        tex.wrapS = T.RepeatWrapping;
        tex.wrapT = T.RepeatWrapping;
        tex.repeat.set(2, 2);
        tex.colorSpace = T.SRGBColorSpace;
        return tex;
      }

      function makeEnvTexture(T) {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 512;
        const g = c.getContext('2d');
        const bg = g.createLinearGradient(0, 0, 0, 512);
        bg.addColorStop(0, '#04080d');
        bg.addColorStop(0.38, '#11242a');
        bg.addColorStop(0.56, '#26372f');
        bg.addColorStop(1, '#020405');
        g.fillStyle = bg;
        g.fillRect(0, 0, 1024, 512);
        function glow(x, y, r, color) {
          const grd = g.createRadialGradient(x, y, 0, x, y, r);
          grd.addColorStop(0, color);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grd;
          g.fillRect(0, 0, 1024, 512);
        }
        glow(220, 170, 260, 'rgba(90,215,190,0.55)');
        glow(800, 210, 260, 'rgba(255,169,72,0.38)');
        glow(520, 70, 240, 'rgba(210,240,235,0.55)');
        const tex = new T.CanvasTexture(c);
        tex.mapping = T.EquirectangularReflectionMapping;
        tex.colorSpace = T.SRGBColorSpace;
        return tex;
      }

      function makeGeology(T, mats) {
        const group = new T.Group();
        const back = new T.Mesh(new T.BoxGeometry(9.2, 5.2, 0.36), mats.rockMat);
        back.position.set(0, -2.6, -3.02);
        group.add(back);
        const left = new T.Mesh(new T.BoxGeometry(0.36, 5.2, 6.2), mats.rockMat);
        left.position.set(-4.42, -2.6, 0);
        group.add(left);
        const floor = new T.Mesh(new T.BoxGeometry(9.2, 0.3, 6.2), mats.darkRockMat);
        floor.position.set(0, -5.12, 0);
        group.add(floor);

        const topBack = new T.Mesh(new T.BoxGeometry(9.2, 0.24, 1.2), mats.grassMat);
        topBack.position.set(0, -0.11, -2.42);
        group.add(topBack);
        const topLeft = new T.Mesh(new T.BoxGeometry(1.2, 0.24, 6.2), mats.grassMat);
        topLeft.position.set(-3.82, -0.11, 0);
        group.add(topLeft);
        const pad = new T.Mesh(new T.BoxGeometry(2.7, 0.22, 1.7), new T.MeshStandardMaterial({ color: 0x314c3c, roughness: 0.94 }));
        pad.position.set(-2.55, -0.09, -2.12);
        group.add(pad);

        // 岩层线与剖面边缘
        const lineMat = new T.LineBasicMaterial({ color: 0x9ad8c3, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false });
        [-1.1, -2.2, -3.3, -4.35].forEach((y) => {
          const pts = [new T.Vector3(-4.55, y, -2.83), new T.Vector3(4.55, y, -2.83)];
          group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), lineMat));
        });
        const edgePts = [
          new T.Vector3(-4.42, 0.03, 3.0), new T.Vector3(4.58, 0.03, 3.0),
          new T.Vector3(4.58, 0.03, 3.0), new T.Vector3(4.58, -5.0, 3.0),
          new T.Vector3(-4.42, 0.03, -3.0), new T.Vector3(-4.42, 0.03, 3.0)
        ];
        group.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(edgePts), new T.LineBasicMaterial({ color: 0x9ad8c3, transparent: true, opacity: 0.32, blending: T.AdditiveBlending })));

        // 深部参考面
        const depthPlane = new T.Mesh(
          new T.PlaneGeometry(9.0, 6.0),
          new T.MeshBasicMaterial({ color: 0x62e6b0, transparent: true, opacity: 0.035, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })
        );
        depthPlane.rotation.x = -Math.PI / 2;
        depthPlane.position.y = -4.28;
        group.add(depthPlane);

        return { group };
      }

      function makeSurface(T, mats) {
        const group = new T.Group();
        const hf = new T.Group();
        hf.position.set(-2.55, 0.02, -2.0);
        const legGeo = new T.BoxGeometry(0.045, 1.45, 0.045);
        [-1, 1].forEach((sx) => {
          [-1, 1].forEach((sz) => {
            const leg = new T.Mesh(legGeo, mats.darkSteelMat);
            leg.position.set(sx * 0.3, 0.72, sz * 0.3);
            hf.add(leg);
          });
        });
        for (let i = 0; i < 3; i++) {
          const y = 0.3 + i * 0.4;
          const bar = new T.Mesh(new T.BoxGeometry(0.64, 0.025, 0.025), mats.steelMat);
          bar.position.set(0, y, -0.3);
          hf.add(bar);
          const bar2 = bar.clone();
          bar2.position.z = 0.3;
          hf.add(bar2);
          const cross = new T.Mesh(new T.BoxGeometry(0.025, 0.025, 0.64), mats.steelMat);
          cross.position.set(0.3, y, 0);
          hf.add(cross);
          const cross2 = cross.clone();
          cross2.position.x = -0.3;
          hf.add(cross2);
        }
        const wheel = new T.Mesh(
          new T.TorusGeometry(0.24, 0.035, 8, 28),
          new T.MeshStandardMaterial({ color: 0xa4b4c4, metalness: 0.9, roughness: 0.24 })
        );
        wheel.position.set(0, 1.5, 0);
        wheel.rotation.y = Math.PI / 2;
        hf.add(wheel);
        const axle = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.8, 12), mats.steelMat);
        axle.rotation.x = Math.PI / 2;
        axle.position.set(0, 1.5, 0);
        hf.add(axle);
        const beaconMat = new T.MeshBasicMaterial({ color: 0xffb347 });
        const beacon = new T.Mesh(new T.SphereGeometry(0.035, 8, 8), beaconMat);
        beacon.position.set(0, 1.72, 0);
        hf.add(beacon);
        const collar = new T.Mesh(new T.CylinderGeometry(0.3, 0.34, 0.13, 24), mats.concreteMat);
        collar.position.set(0, 0.08, 0);
        hf.add(collar);
        group.add(hf);

        const building = new T.Mesh(new T.BoxGeometry(1.15, 0.46, 0.82), mats.concreteMat);
        building.position.set(0.75, 0.24, -2.3);
        group.add(building);
        const roof = new T.Mesh(new T.BoxGeometry(1.2, 0.06, 0.88), mats.darkSteelMat);
        roof.position.set(0.75, 0.49, -2.3);
        group.add(roof);
        for (let i = 0; i < 3; i++) {
          const win = new T.Mesh(new T.BoxGeometry(0.18, 0.1, 0.02), new T.MeshBasicMaterial({ color: 0x9fe9d2 }));
          win.position.set(0.45 + i * 0.27, 0.28, -1.88);
          group.add(win);
        }
        const vent = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 0.95, 16), mats.steelMat);
        vent.position.set(2.15, 0.47, -2.3);
        group.add(vent);
        const ventRing = new T.Mesh(new T.TorusGeometry(0.12, 0.01, 5, 24), new T.MeshBasicMaterial({ color: 0xffb347 }));
        ventRing.rotation.x = Math.PI / 2;
        ventRing.position.set(2.15, 0.95, -2.3);
        group.add(ventRing);

        [-3.55, -3.25, -2.95, -3.7].forEach((x, i) => {
          const trunk = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.28, 6), new T.MeshStandardMaterial({ color: 0x5b4630, roughness: 0.9 }));
          trunk.position.set(x, 0.14, 1.7 + i * 0.55);
          group.add(trunk);
          const crown = new T.Mesh(new T.ConeGeometry(0.2, 0.55, 7), new T.MeshStandardMaterial({ color: 0x3f7a4d, roughness: 0.92 }));
          crown.position.set(x, 0.48, 1.7 + i * 0.55);
          group.add(crown);
        });
        return { group };
      }

      function makeShaft(T, mats) {
        const group = new T.Group();
        const x = -2.55;
        const z = -2.0;
        const railMat = new T.MeshStandardMaterial({ color: 0x9eb1c2, metalness: 0.9, roughness: 0.28 });
        [-1, 1].forEach((sx) => {
          [-1, 1].forEach((sz) => {
            const rail = new T.Mesh(new T.BoxGeometry(0.025, 4.25, 0.025), railMat);
            rail.position.set(x + sx * 0.16, -2.12, z + sz * 0.16);
            group.add(rail);
          });
        });
        const ringMat = new T.MeshBasicMaterial({ color: 0x62e6b0, transparent: true, opacity: 0.36 });
        for (let i = 0; i < 8; i++) {
          const ring = new T.Mesh(new T.TorusGeometry(0.17, 0.004, 4, 22), ringMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(x, -0.2 - i * 0.55, z);
          group.add(ring);
        }
        const elevator = new T.Mesh(
          new T.BoxGeometry(0.23, 0.32, 0.23),
          new T.MeshStandardMaterial({ color: 0xc9a25c, metalness: 0.7, roughness: 0.35, emissive: 0x3a1b02, emissiveIntensity: 0.4 })
        );
        elevator.position.set(x, -1.1, z);
        group.add(elevator);
        const cable = new T.Line(
          new T.BufferGeometry().setFromPoints([new T.Vector3(x, 0.0, z), new T.Vector3(x, -4.0, z)]),
          new T.LineBasicMaterial({ color: 0x9fe9d2, transparent: true, opacity: 0.25 })
        );
        group.add(cable);

        const vent = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 4.15, 12), new T.MeshStandardMaterial({ color: 0x40535a, metalness: 0.7, roughness: 0.4 }));
        vent.position.set(2.15, -2.08, -2.3);
        group.add(vent);
        return { group, elevator };
      }

      function makeRepository(T, mats) {
        const group = new T.Group();
        const tunnelMat = new T.MeshStandardMaterial({
          color: 0x537363,
          roughness: 0.82,
          metalness: 0.05,
          transparent: true,
          opacity: 0.24,
          side: T.DoubleSide,
          depthWrite: false
        });
        const wireMat = new T.MeshBasicMaterial({ color: 0x8fe4c2, wireframe: true, transparent: true, opacity: 0.15 });

        function tunnel(x, z, len, axis) {
          const geo = new T.CylinderGeometry(0.34, 0.34, len, 18, 1, true);
          const mesh = new T.Mesh(geo, tunnelMat);
          if (axis === 'x') { mesh.rotation.z = Math.PI / 2; mesh.position.set(x, -4.0, z); }
          else { mesh.rotation.x = Math.PI / 2; mesh.position.set(x, -4.0, z); }
          group.add(mesh);
          const wire = new T.Mesh(geo, wireMat);
          wire.rotation.copy(mesh.rotation);
          wire.position.copy(mesh.position);
          group.add(wire);
        }

        tunnel(-2.1, -0.2, 3.7, 'z');
        [-1.35, -0.25, 0.85].forEach((z) => tunnel(0.2, z, 4.4, 'x'));

        const canisters = new T.Group();
        [-1.35, -0.25, 0.85].forEach((z) => {
          [-1.05, 0.25, 1.55].forEach((x) => {
            const can = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.48, 16), mats.copperMat);
            can.position.set(x, -4.07, z);
            canisters.add(can);
            const band = new T.Mesh(new T.TorusGeometry(0.115, 0.012, 5, 20), new T.MeshBasicMaterial({ color: 0xffc857 }));
            band.rotation.x = Math.PI / 2;
            band.position.set(x, -3.98, z);
            canisters.add(band);
          });
        });
        group.add(canisters);

        // 竖井到主巷道的连接线
        const route = new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(-2.55, -4.0, -2.0),
            new T.Vector3(-2.25, -4.0, -1.4),
            new T.Vector3(-2.1, -4.0, -0.2)
          ]),
          new T.LineDashedMaterial({ color: 0xffc857, transparent: true, opacity: 0.48, dashSize: 0.09, gapSize: 0.09 })
        );
        route.computeLineDistances();
        group.add(route);

        // 巷道环
        const ringMat = new T.MeshBasicMaterial({ color: 0x77e4bf, transparent: true, opacity: 0.26 });
        [-1.35, -0.25, 0.85].forEach((z) => {
          [-1.8, 0.2, 2.1].forEach((x) => {
            const ring = new T.Mesh(new T.TorusGeometry(0.345, 0.005, 4, 24), ringMat);
            ring.rotation.y = Math.PI / 2;
            ring.position.set(x, -4.0, z);
            group.add(ring);
          });
        });
        return { group, canisters };
      }

      function makeBarrierBackdrop(T, at) {
        const group = new T.Group();
        group.position.set(at.x, -4.2, at.z);

        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 512;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(256, 256, 20, 256, 256, 250);
        grd.addColorStop(0, 'rgba(127,224,176,0.18)');
        grd.addColorStop(0.42, 'rgba(74,146,124,0.09)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 512, 512);
        const tex = new T.CanvasTexture(c);
        tex.colorSpace = T.SRGBColorSpace;
        const glow = new T.Mesh(
          new T.PlaneGeometry(7, 7),
          new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })
        );
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.01;
        group.add(glow);

        const disc = new T.Mesh(
          new T.CircleGeometry(2.1, 64),
          new T.MeshBasicMaterial({ color: 0x05100b, transparent: true, opacity: 0.92 })
        );
        disc.rotation.x = -Math.PI / 2;
        group.add(disc);

        [1.35, 1.72, 2.04].forEach((r, i) => {
          const ring = new T.Mesh(
            new T.TorusGeometry(r, 0.006, 4, 96),
            new T.MeshBasicMaterial({ color: i === 1 ? 0xffc857 : 0x7fe0b0, transparent: true, opacity: i === 1 ? 0.28 : 0.17, blending: T.AdditiveBlending, depthWrite: false })
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.03;
          group.add(ring);
        });
        return group;
      }

      function makeBarrier(T, mats) {
        const group = new T.Group();
        group.position.set(2.8, -3.05, 2.0);

        function cutFace(T, r, h, angle, color, th) {
          const inner = r - th;
          const verts = [];
          const y0 = -h / 2;
          const y1 = h / 2;
          const ox = Math.sin(angle);
          const oz = Math.cos(angle);
          const o = [ox * r, oz * r];
          const i = [ox * inner, oz * inner];
          verts.push(
            o[0], y0, o[1], i[0], y0, i[1], o[0], y1, o[1],
            o[0], y1, o[1], i[0], y0, i[1], i[0], y1, i[1]
          );
          const geo = new T.BufferGeometry();
          geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
          geo.computeVertexNormals();
          return new T.Mesh(geo, new T.MeshStandardMaterial({
            color: color,
            metalness: 0.15,
            roughness: 0.7,
            side: T.DoubleSide,
            flatShading: true
          }));
        }

        function shell(r, h, gap, material, color, thickness) {
          const g = new T.Group();
          const geo = new T.CylinderGeometry(r, r, h, 56, 1, true, gap / 2, Math.PI * 2 - gap);
          const mesh = new T.Mesh(geo, material);
          g.add(mesh);
          g.add(cutFace(T, r, h, gap / 2, color, thickness || 0.06));
          g.add(cutFace(T, r, h, Math.PI * 2 - gap / 2, color, thickness || 0.06));
          const lineMat = new T.LineBasicMaterial({ color: color, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false });
          [gap / 2, Math.PI * 2 - gap / 2].forEach((a) => {
            const pts = [];
            for (let i = 0; i <= 16; i++) {
              const y = -h / 2 + (i / 16) * h;
              pts.push(new T.Vector3(Math.sin(a) * r, y, Math.cos(a) * r));
            }
            g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), lineMat));
          });
          return g;
        }

        const cutMat = (m, color) => {
          const c = m.clone();
          c.side = T.DoubleSide;
          if (color != null) c.color.set(color);
          c.emissiveIntensity = 0.04;
          return c;
        };
        const rock = shell(1.0, 2.18, 1.18, cutMat(mats.rockMat, 0x34483e), 0x4d6559, 0.09);
        const backfill = shell(0.82, 2.0, 1.12, cutMat(mats.concreteMat, 0x61665f), 0x777d73, 0.075);
        const bentonite = shell(0.64, 1.82, 1.08, cutMat(mats.bufferMat, 0x8d4d2a), 0xa86b43, 0.07);
        const canister = shell(0.41, 1.58, 1.02, cutMat(mats.steelMat, 0x6f8da2), 0x93aebe, 0.055);

        const glass = new T.Group();
        const glassMesh = new T.Mesh(
          new T.CylinderGeometry(0.235, 0.235, 1.28, 32, 1, false),
          mats.glassMat
        );
        glass.add(glassMesh);
        const capMat = new T.MeshStandardMaterial({ color: 0xc9a25c, metalness: 0.88, roughness: 0.28 });
        [-1, 1].forEach((s) => {
          const cap = new T.Mesh(new T.CylinderGeometry(0.255, 0.255, 0.045, 28), capMat);
          cap.position.y = s * 0.665;
          glass.add(cap);
        });
        const glassGlow = makeGlowSprite(T, 0xffb347, 0.75, 0.45);
        glass.add(glassGlow);

        // 金属桶的加强环
        const ringMat = new T.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.55 });
        [-0.52, 0, 0.52].forEach((y) => {
          const ring = new T.Mesh(new T.TorusGeometry(0.414, 0.006, 4, 44), ringMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = y;
          canister.add(ring);
        });

        group.add(rock, backfill, bentonite, canister, glass);
        rock.position.x = 0;
        backfill.position.x = 0;
        bentonite.position.x = 0;
        canister.position.x = 0;
        glass.position.x = 0;

        rock.userData.exp = new T.Vector3(4.6, 0.1, 0); rock.userData.delay = 0.34;
        backfill.userData.exp = new T.Vector3(3.45, 0.08, 0); backfill.userData.delay = 0.25;
        bentonite.userData.exp = new T.Vector3(2.3, 0.06, 0); bentonite.userData.delay = 0.16;
        canister.userData.exp = new T.Vector3(1.15, 0, 0); canister.userData.delay = 0.08;
        glass.userData.exp = new T.Vector3(0, 0, 0); glass.userData.delay = 0;

        const base = new T.Mesh(
          new T.CylinderGeometry(1.18, 1.18, 0.05, 48),
          new T.MeshStandardMaterial({ color: 0x1d2c25, metalness: 0.5, roughness: 0.6 })
        );
        base.position.y = -1.15;
        group.add(base);
        const baseRing = new T.Mesh(new T.TorusGeometry(1.18, 0.012, 5, 64), new T.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.56 }));
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = -1.12;
        group.add(baseRing);

        return {
          group,
          shells: [glass, canister, bentonite, backfill, rock],
          glass,
          canister,
          bentonite,
          backfill,
          rock,
          glassGlow
        };
      }

      function makeGlowSprite(T, color, size, opacity) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.16, 'rgba(255,230,180,0.5)');
        grd.addColorStop(0.5, 'rgba(255,170,60,0.13)');
        grd.addColorStop(1, 'rgba(255,130,30,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 256, 256);
        const tex = new T.CanvasTexture(c);
        tex.colorSpace = T.SRGBColorSpace;
        const mat = new T.SpriteMaterial({ map: tex, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, depthTest: false });
        const sprite = new T.Sprite(mat);
        sprite.scale.set(size, size, 1);
        return sprite;
      }

      function makeHalo(T) {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 512;
        const g = c.getContext('2d');
        g.translate(256, 256);
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.lineWidth = 2;
        g.setLineDash([10, 12]);
        g.beginPath(); g.arc(0, 0, 190, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          g.strokeStyle = i % 6 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)';
          g.beginPath();
          g.moveTo(Math.cos(a) * 198, Math.sin(a) * 198);
          g.lineTo(Math.cos(a) * (i % 6 === 0 ? 222 : 210), Math.sin(a) * (i % 6 === 0 ? 222 : 210));
          g.stroke();
        }
        const tex = new T.CanvasTexture(c);
        tex.colorSpace = T.SRGBColorSpace;
        const mat = new T.SpriteMaterial({ map: tex, color: 0xffc857, transparent: true, opacity: 0.86, blending: T.AdditiveBlending, depthWrite: false, depthTest: false });
        const sprite = new T.Sprite(mat);
        sprite.scale.set(0.85, 0.85, 1);
        sprite.visible = true;
        return sprite;
      }

      function makeDust(T) {
        const n = 280;
        const arr = new Float32Array(n * 3);
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          arr[i * 3] = (Math.random() - 0.5) * 18;
          arr[i * 3 + 1] = -5 + Math.random() * 6;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
          const warm = Math.random() > 0.6;
          col[i * 3] = warm ? 1 : 0.45;
          col[i * 3 + 1] = warm ? 0.76 : 0.82;
          col[i * 3 + 2] = warm ? 0.36 : 0.7;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(arr, 3));
        geo.setAttribute('color', new T.BufferAttribute(col, 3));
        return new T.Points(geo, new T.PointsMaterial({
          size: 0.035,
          vertexColors: true,
          transparent: true,
          opacity: 0.55,
          blending: T.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true
        }));
      }
    }
  });
})(window.NEG);
