/* ============================================================
   核纪元 · 核装置解剖室
   ------------------------------------------------------------
   原生 Three.js 场景：轨道观察 / 逐层拆解 / 点击拾取 / 标注追踪
   - 3D 模型为教学示意，不含任何工程参数
   - 切换路由时完整释放 WebGL 资源与事件监听
   ============================================================ */
(function (NEG) {
  'use strict';

  const DATA = (NEG.data && NEG.data.device) || null;
  if (!DATA) return;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };
  const delayEase = (e, delay) => ease((e - delay) / (1 - delay));

  function fmtIndex(n) {
    return String(n).padStart(2, '0');
  }

  function labelSide(offset) {
    if (Math.abs(offset[0]) < 4) return ' is-center';
    return offset[0] < 0 ? ' is-left' : '';
  }

  NEG.registerMode({
    id: 'device',
    order: 6,
    title: '核装置解剖室',
    nav: '核装置解剖',
    icon: 'scan',
    accent: '#ffb347',
    blurb: '在 3D 场景中旋转、缩放，一键拆开一枚 1945 年内爆式核装置，逐层看清它的结构。',

    progress(s) {
      const m = (s.modes && s.modes.device) || {};
      const viewed = Array.isArray(m.viewed) ? m.viewed.length : 0;
      return Math.max(viewed / DATA.parts.length, m.exploded ? 1 : 0);
    },

    isComplete(s) {
      return !!((s.modes && s.modes.device && s.modes.device.exploded) || 0);
    },

    render(root, ctx) {
      const { store, ui, util: U } = ctx;
      const state = store.get();
      const modeState = (state.modes && state.modes.device) || {};
      const selectedId = DATA.parts[0].id;
      const viewed = new Set(Array.isArray(modeState.viewed) ? modeState.viewed : []);
      const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const esc = U.esc;

      const partButtons = DATA.parts.map((p) => (
        '<button class="di-item" type="button" data-part="' + p.id + '" style="--p-accent:' + p.accent + '">' +
          '<span class="di-num">' + fmtIndex(p.index) + '</span>' +
          '<span class="di-body"><b>' + esc(p.name) + '</b><em>' + esc(p.en) + '</em></span>' +
          '<span class="di-dot" aria-hidden="true"></span>' +
        '</button>'
      )).join('');

      const labelHTML = DATA.parts.map((p) => (
        '<button class="device-label" type="button" data-label-part="' + p.id + '" style="--p-accent:' + p.accent + '">' +
          '<span class="dl-dot" aria-hidden="true"></span>' +
          '<span class="dl-card' + labelSide(p.labelOffset) + '" style="--lx:' + p.labelOffset[0] + 'px;--ly:' + p.labelOffset[1] + 'px">' +
            '<span class="dl-idx">' + fmtIndex(p.index) + '</span>' +
            '<span class="dl-name">' + esc(p.name) + '</span>' +
          '</span>' +
        '</button>'
      )).join('');

      const chainHTML = DATA.chain.map((c, i) => (
        '<span class="dc-node" style="--i:' + i + '">' +
          '<i aria-hidden="true"></i><b>' + esc(c.label) + '</b><em>' + esc(c.note) + '</em>' +
        '</span>' + (i < DATA.chain.length - 1 ? '<span class="dc-arrow" aria-hidden="true">→</span>' : '')
      )).join('');

      root.innerHTML =
        '<div class="device-page mode-page" id="devicePage">' +
          '<div class="page-top device-top">' +
            '<div class="pt-brand">' +
              '<span class="eyebrow">' + esc(DATA.eyebrow) + '</span>' +
              '<h2>' + NEG.icon('scan', 23) + '核装置解剖室 <span class="badge badge-amber">3D / WEBGL</span></h2>' +
              '<p class="lead-inline">' + esc(DATA.intro) + '</p>' +
            '</div>' +
            '<div class="pt-tools">' +
              '<span class="device-status-chip"><i aria-hidden="true"></i><span>PUBLIC SCHEMATIC</span></span>' +
              '<button class="btn btn-sm btn-quiet" type="button" data-action="sources">' + NEG.icon('info', 14) + '资料与免责声明</button>' +
            '</div>' +
          '</div>' +

          '<div class="device-layout">' +
            '<aside class="device-index panel" aria-label="结构层级索引">' +
              '<div class="di-head">' +
                '<span class="eyebrow">STACK INDEX</span>' +
                '<b>07</b>' +
              '</div>' +
              '<p class="di-sub">点击层级，或在 3D 场景中直接选取。拖拽旋转，滚轮缩放。</p>' +
              '<div class="di-list" role="list">' + partButtons + '</div>' +
              '<div class="di-progress"><span>已查看层级</span><b id="deviceViewed">0 / 7</b></div>' +
              '<div class="di-bar"><i id="deviceViewedBar"></i></div>' +
              '<div class="di-ethics">' +
                '<span class="di-ethics-title">' + NEG.icon('alert', 13) + '历史注记</span>' +
                '<p>' + esc(DATA.ethics) + '</p>' +
              '</div>' +
              '<div class="di-foot">' +
                '<span>SCHEMATIC / EDU ONLY</span>' +
                '<span>REV 1.1</span>' +
              '</div>' +
            '</aside>' +

            '<section class="device-stage-shell" aria-label="3D 核装置解剖场景">' +
              '<div class="device-stage" id="deviceStage" tabindex="0" aria-label="可交互 3D 核装置。拖拽旋转，滚轮缩放，按 D 键拆解。" aria-describedby="deviceStageHint">' +
                '<canvas id="deviceCanvas"></canvas>' +
                '<div class="stage-atmosphere" aria-hidden="true"></div>' +
                '<div class="stage-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
                '<div class="stage-hud stage-hud-top">' +
                  '<span class="hud-live"><i></i> LIVE SCENE</span>' +
                  '<span class="hud-sep"></span>' +
                  '<span>IMPLOSION TYPE</span>' +
                  '<span class="hud-right"><em id="deviceState">ASSEMBLED</em><b id="devicePercent">00</b>%</span>' +
                '</div>' +
                '<div class="stage-hud stage-hud-left">' +
                  '<span>MODEL</span><b>MK-III</b><span>SCHEMATIC</span>' +
                '</div>' +
                '<div class="stage-hud stage-hud-right">' +
                  '<span>ORBIT</span><b id="deviceOrbit">000°</b><span>ZOOM</span><b id="deviceZoom">1.00×</b>' +
                '</div>' +
                '<svg class="device-leaders" id="deviceLeaders" aria-hidden="true"></svg>' +
                '<div class="device-labels" id="deviceLabels">' + labelHTML + '</div>' +
                '<div class="stage-reticle" aria-hidden="true"><span></span><i></i></div>' +
                '<div class="stage-glitch" aria-hidden="true"></div>' +
                '<div class="stage-loading" id="deviceLoading">' +
                  '<span class="loader-ring" aria-hidden="true"></span>' +
                  '<b>正在建立 3D 场景</b><em>WEBGL / THREE.JS</em>' +
                '</div>' +
                '<div class="stage-fallback" id="deviceFallback" hidden>' +
                  '<b>此浏览器无法启动 WebGL 3D 场景</b>' +
                  '<p>你仍然可以在左侧索引中阅读七层结构说明。请尝试更新浏览器或启用硬件加速。</p>' +
                '</div>' +
                '<div class="stage-tools">' +
                  '<button class="stage-icon-btn" type="button" data-tool="auto" aria-pressed="' + (reduceMotion ? 'false' : 'true') + '" title="自动旋转">' + NEG.icon('orbit', 17) + '</button>' +
                  '<button class="stage-icon-btn" type="button" data-tool="labels" aria-pressed="true" title="显示 / 隐藏标注">' + NEG.icon('tag', 17) + '</button>' +
                  '<button class="stage-icon-btn" type="button" data-tool="reset" title="复位视角">' + NEG.icon('refresh', 17) + '</button>' +
                '</div>' +
                '<div class="stage-actions">' +
                  '<button class="btn btn-device btn-lg" type="button" data-action="explode" id="deviceExplodeBtn">' +
                    NEG.icon('unfold', 18) + '<span>一键拆解</span>' +
                  '</button>' +
                  '<div class="explode-slider">' +
                    '<div class="es-head"><span>EXPLODE</span><b id="explodeValue">0%</b></div>' +
                    '<input id="deviceExplodeRange" type="range" min="0" max="100" value="0" step="1" aria-label="拆解进度">' +
                    '<div class="es-ticks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
                  '</div>' +
                '</div>' +
                '<div class="stage-hint" id="deviceStageHint">' +
                  '<span><kbd>DRAG</kbd> 旋转</span><span><kbd>SCROLL</kbd> 缩放</span><span><kbd>D</kbd> 拆解</span><span><kbd>R</kbd> 复位</span>' +
                '</div>' +
              '</div>' +
            '</section>' +

            '<aside class="device-detail panel" aria-label="部件详情" aria-live="polite">' +
              '<div class="dd-top">' +
                '<span class="dd-index" id="detailIndex">01</span>' +
                '<span class="dd-count"><b id="detailCount">01</b> / 07</span>' +
              '</div>' +
              '<div class="dd-title">' +
                '<span class="eyebrow" id="detailEn">CASING &amp; TAIL</span>' +
                '<h3 id="detailName">外壳与尾翼</h3>' +
                '<span class="badge badge-line" id="detailTag">结构 / 气动</span>' +
              '</div>' +
              '<p class="dd-role" id="detailRole"></p>' +
              '<p class="dd-desc" id="detailDesc"></p>' +
              '<div class="dd-specs">' +
                '<div><span>MATERIAL / 材料</span><b id="detailMaterial"></b></div>' +
                '<div><span>PUBLIC LAYER / 公开层级</span><b id="detailLayer"></b></div>' +
              '</div>' +
              '<div class="dd-fact">' +
                '<span class="dd-fact-icon">' + NEG.icon('bolt', 14) + '</span>' +
                '<p id="detailFact"></p>' +
              '</div>' +
              '<p class="dd-note" id="detailNote"></p>' +
              '<div class="dd-actions">' +
                '<button class="btn btn-sm btn-device-ghost" type="button" data-action="focus">' + NEG.icon('target', 14) + '聚焦此层</button>' +
                '<button class="btn btn-sm btn-quiet" type="button" data-action="source">' + NEG.icon('book', 14) + '资料</button>' +
              '</div>' +
              '<div class="dd-scanline" aria-hidden="true"></div>' +
            '</aside>' +
          '</div>' +

          '<div class="device-chain" aria-label="内爆式核装置原理链">' +
            '<div class="dc-head"><span class="eyebrow">PRINCIPLE CHAIN</span><b>从起爆到能量释放</b></div>' +
            '<div class="dc-track">' + chainHTML + '</div>' +
            '<p class="dc-caveat">' + esc(DATA.caveat) + '</p>' +
          '</div>' +
        '</div>';

      const exitShell = (NEG.shell && typeof NEG.shell.full === 'function')
        ? NEG.shell.full('device')
        : function () {};

      const stageEl = root.querySelector('#deviceStage');
      const canvas = root.querySelector('#deviceCanvas');
      const loadingEl = root.querySelector('#deviceLoading');
      const fallbackEl = root.querySelector('#deviceFallback');
      const labelsEl = root.querySelector('#deviceLabels');
      const leadersEl = root.querySelector('#deviceLeaders');
      const explodeBtn = root.querySelector('#deviceExplodeBtn');
      const explodeRange = root.querySelector('#deviceExplodeRange');
      const explodeValue = root.querySelector('#explodeValue');
      const devicePercent = root.querySelector('#devicePercent');
      const deviceStateEl = root.querySelector('#deviceState');
      const deviceOrbitEl = root.querySelector('#deviceOrbit');
      const deviceZoomEl = root.querySelector('#deviceZoom');
      const viewedEl = root.querySelector('#deviceViewed');
      const viewedBar = root.querySelector('#deviceViewedBar');
      const detailEl = root.querySelector('.device-detail');

      let selected = selectedId;
      let labelsOn = true;
      let autoOn = !reduceMotion;
      let explodeTarget = 0;
      let explodeCurrent = 0;
      let credited = false;
      let destroyed = false;
      let renderer = null;
      let scene = null;
      let camera = null;
      let raf = null;
      let resizeObserver = null;
      let view = null;
      let hoveredPart = null;

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
          if (!s.modes.device) s.modes.device = { plays: 0, exploded: 0, viewed: [] };
          if (!Array.isArray(s.modes.device.viewed)) s.modes.device.viewed = [];
          if (s.modes.device.viewed.indexOf(id) < 0) s.modes.device.viewed.push(id);
        }, 'device-view');
        updateViewedUI();
        return true;
      }

      function updateViewedUI() {
        const n = viewed.size;
        viewedEl.textContent = n + ' / ' + DATA.parts.length;
        viewedBar.style.width = Math.round((n / DATA.parts.length) * 100) + '%';
      }

      const initialPart = DATA.parts.find((p) => p.id === selectedId) || DATA.parts[0];
      function paintDetail(part) {
        root.querySelector('#detailIndex').textContent = fmtIndex(part.index);
        root.querySelector('#detailCount').textContent = fmtIndex(part.index);
        root.querySelector('#detailEn').textContent = part.en;
        root.querySelector('#detailName').textContent = part.name;
        root.querySelector('#detailTag').textContent = part.tag;
        root.querySelector('#detailRole').textContent = part.role;
        root.querySelector('#detailDesc').textContent = part.desc;
        root.querySelector('#detailMaterial').textContent = part.material;
        root.querySelector('#detailLayer').textContent = 'LAYER ' + fmtIndex(part.index) + ' / 07';
        root.querySelector('#detailFact').textContent = part.fact;
        root.querySelector('#detailNote').textContent = part.note;
        detailEl.style.setProperty('--p-accent', part.accent);
        root.querySelectorAll('.di-item').forEach((btn) => {
          const active = btn.dataset.part === part.id;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-current', active ? 'true' : 'false');
        });
        root.querySelectorAll('.device-label').forEach((label) => {
          label.classList.toggle('is-active', label.dataset.labelPart === part.id);
        });
      }

      function setSelected(id, opts) {
        const part = DATA.parts.find((p) => p.id === id);
        if (!part) return;
        selected = id;
        paintDetail(part);
        markViewed(id);
        if (view && view.setSelected) view.setSelected(id);
        if (!opts || opts.sound !== false) ctx.audio.play('click');
      }

      function setExplode(value, opts) {
        explodeTarget = clamp(value, 0, 1);
        const pct = Math.round(explodeTarget * 100);
        explodeRange.value = String(pct);
        explodeValue.textContent = pct + '%';
        devicePercent.textContent = fmtIndex(pct);
        deviceStateEl.textContent = explodeTarget > 0.98 ? 'EXPLODED' : explodeTarget > 0.02 ? 'IN MOTION' : 'ASSEMBLED';
        explodeBtn.classList.toggle('is-exploded', explodeTarget > 0.5);
        explodeBtn.innerHTML = (explodeTarget > 0.5 ? NEG.icon('build', 18) : NEG.icon('unfold', 18)) +
          '<span>' + (explodeTarget > 0.5 ? '一键组装' : '一键拆解') + '</span>';
        if (explodeTarget > 0.985) {
          if (!credited) {
            credited = true;
            const before = (store.get().modes.device || {}).exploded || 0;
            store.set((s) => {
              if (!s.modes.device) s.modes.device = { plays: 0, exploded: 0, viewed: [] };
              s.modes.device.exploded = before + 1;
            }, 'device-explode');
            if (before === 0) {
              store.addScore(20, 'device-explode');
              ui.toast('逐层拆解完成 · 结构解剖师 +20', 'success', { title: '七层结构已展开' });
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
        setExplode(explodeTarget > 0.5 ? 0 : 1);
      }

      function openSources() {
        const sources = DATA.sources.map((s) =>
          '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name) + '</a></li>'
        ).join('');
        ui.modal({
          eyebrow: 'SOURCES · 资料与免责声明',
          title: '关于这枚核装置',
          html:
            '<p style="color:var(--text-2);font-size:13px;line-height:1.8">' + esc(DATA.caveat) + '</p>' +
            '<div class="device-source-note">' + esc(DATA.ethics) + '</div>' +
            '<h3 style="margin:18px 0 8px;font-size:14px">公开资料来源</h3>' +
            '<ul class="device-source-list">' + sources + '</ul>' +
            '<p style="color:var(--text-3);font-size:11.5px;line-height:1.7;margin-top:16px">' +
              '历史装置的真实设计、尺寸、材料与工艺属于敏感信息，本页不提供，也不应被用于任何制造目的。' +
            '</p>',
          wide: true,
          actions: [{ label: '关闭', kind: 'ghost' }]
        });
      }

      /* ---------- 交互：层级 / 控件 ---------- */
      root.querySelectorAll('[data-part]').forEach((btn) => {
        on(btn, 'click', () => setSelected(btn.dataset.part));
      });
      root.querySelectorAll('[data-label-part]').forEach((btn) => {
        on(btn, 'click', (e) => {
          e.stopPropagation();
          setSelected(btn.dataset.labelPart);
        });
        on(btn, 'pointerdown', (e) => e.stopPropagation());
      });
      on(explodeBtn, 'click', toggleExplode);
      on(explodeRange, 'input', () => {
        setExplode(Number(explodeRange.value) / 100, { sound: false });
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
      on(root.querySelector('[data-action="sources"]'), 'click', openSources);
      on(root.querySelector('[data-action="source"]'), 'click', openSources);
      on(root.querySelector('[data-action="focus"]'), 'click', () => {
        if (view) view.focusSelected();
        ctx.audio.play('click');
      });

      paintDetail(initialPart);
      markViewed(initialPart.id);

      /* ---------- 键盘 ---------- */
      function onKey(e) {
        if (document.querySelector('.overlay')) return;
        if (U.isTyping(e)) return;
        if (!NEG.tasks || NEG.tasks.currentId() !== 'device') return;
        const k = e.key.toLowerCase();
        if (k === 'd') { e.preventDefault(); toggleExplode(); }
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

      /* ---------- WebGL 场景 ---------- */
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
        console.error('[Device] WebGL 初始化失败', err);
        loadingEl.hidden = true;
        fallbackEl.hidden = false;
        return function cleanup() {
          cleanups.forEach((fn) => fn());
          exitShell();
        };
      }

      loadingEl.classList.add('is-done');
      setTimeout(() => { if (!destroyed) loadingEl.hidden = true; }, 480);
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
         3D 场景构建
         ========================================================== */
      function createView() {
        const T = window.THREE;
        const stageRect = stageEl.getBoundingClientRect();
        if (!stageRect.width || !stageRect.height) throw new Error('舞台尺寸为 0');

        renderer = new T.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(stageRect.width, stageRect.height, false);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.98;
        renderer.setClearColor(0x000000, 0);

        scene = new T.Scene();
        scene.fog = new T.FogExp2(0x04080f, 0.016);
        camera = new T.PerspectiveCamera(46, stageRect.width / stageRect.height, 0.1, 120);

        const compact = stageRect.width < 620;
        const fitRadius = (exploded) => {
          const aspect = Math.max(0.55, camera.aspect);
          const r = (exploded ? 17.6 : 9.6) / aspect;
          return clamp(r, exploded ? 13 : 8.4, exploded ? 28 : 16);
        };
        const cam = {
          theta: 0.64,
          phi: compact ? 1.12 : 1.08,
          radius: fitRadius(false),
          thetaT: 0.64,
          phiT: compact ? 1.12 : 1.08,
          radiusT: fitRadius(false),
          auto: autoOn,
          autoPause: 0,
          dragging: false,
          pointerId: null,
          lastX: 0,
          lastY: 0,
          moved: 0,
          pointers: new Map(),
          pinchDist: 0,
          baseRadius: fitRadius(false),
          lastExploded: false
        };

        /* ---------- 环境贴图：给金属一层“摄影棚” ---------- */
        const envTex = makeEnvTexture(T);
        const pmrem = new T.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const envRT = pmrem.fromEquirectangular(envTex);
        scene.environment = envRT.texture;
        envTex.dispose();
        pmrem.dispose();

        /* ---------- 灯光 ---------- */
        scene.add(new T.HemisphereLight(0xb8e6ff, 0x1b0f06, 0.82));

        const key = new T.DirectionalLight(0xffe1b5, 2.6);
        key.position.set(5.5, 8, 6.5);
        scene.add(key);

        const fill = new T.DirectionalLight(0x4d9bff, 1.0);
        fill.position.set(-7, 3, -5);
        scene.add(fill);

        const rim = new T.PointLight(0xff8b45, 20, 22, 2);
        rim.position.set(-4.2, -0.2, 4.8);
        scene.add(rim);

        const cool = new T.PointLight(0x47d9ff, 7, 18, 2);
        cool.position.set(4.8, 1.6, -3.2);
        scene.add(cool);

        const coreLight = new T.PointLight(0xff5936, 3.8, 5.5, 2);
        coreLight.position.set(0, 0, 0);
        scene.add(coreLight);

        /* ---------- 场景装饰 ---------- */
        const platform = makePlatform(T);
        scene.add(platform);

        const stars = makeStars(T);
        scene.add(stars);

        const orbitRings = makeOrbitRings(T);
        scene.add(orbitRings.group);

        const scanRings = makeScanRings(T);
        scene.add(scanRings.group);

        const axisGroup = makeAxis(T);
        scene.add(axisGroup.group);

        /* ---------- 装置 ---------- */
        const device = new T.Group();
        device.rotation.y = -0.03;
        scene.add(device);

        const animatables = [];
        const partsMap = {};
        const pickables = [];
        const casingMaterials = [];
        const lensMaterials = [];

        DATA.parts.forEach((p) => {
          partsMap[p.id] = {
            data: p,
            objects: [],
            anchor: null,
            materials: [],
            anchorLocal: p.anchor ? p.anchor.slice() : [0, 0, 0]
          };
        });

        function registerPart(obj, partId, opts) {
          const rec = partsMap[partId];
          if (!rec) return;
          obj.traverse((child) => {
            if (child.isMesh || child.isLine || child.isPoints) {
              child.userData.partId = partId;
              rec.objects.push(child);
              if (child.isMesh) {
                if (Array.isArray(child.material)) child.material.forEach((m) => rec.materials.push(m));
                else if (child.material) rec.materials.push(child.material);
              }
              if (child.isMesh) pickables.push(child);
            }
          });
          if (opts && opts.anchor) {
            const anchor = new T.Object3D();
            anchor.position.set(opts.anchor[0], opts.anchor[1], opts.anchor[2]);
            obj.add(anchor);
            rec.anchor = anchor;
          }
        }

        function addAnim(obj, explode, delay, rot) {
          obj.userData.basePos = obj.position.clone();
          obj.userData.exp = new T.Vector3(explode[0], explode[1], explode[2]);
          obj.userData.baseRot = obj.rotation.clone();
          obj.userData.expRot = new T.Vector3(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
          obj.userData.delay = delay || 0;
          animatables.push(obj);
        }

        /* ---------- 外壳（透明剖面）+ 尾翼 ---------- */
        const shellMat = new T.MeshPhysicalMaterial({
          color: 0x6c8dac,
          metalness: 0.82,
          roughness: 0.3,
          clearcoat: 0.55,
          clearcoatRoughness: 0.25,
          transparent: true,
          opacity: 0.94,
          side: T.DoubleSide,
          depthWrite: true,
          envMapIntensity: 1.0
        });
        casingMaterials.push(shellMat);

        const casingF = makeCasingHalf(T, true, shellMat);
        const casingB = makeCasingHalf(T, false, shellMat);
        device.add(casingF, casingB);
        addAnim(casingF, [0.55, 0.12, 0], 0.0, [0, 0.05, 0]);
        addAnim(casingB, [-0.55, 0.12, 0], 0.0, [0, -0.05, 0]);
        registerPart(casingF, 'casing');
        registerPart(casingB, 'casing');

        const tail = makeTail(T);
        device.add(tail);
        addAnim(tail, [-3.55, -0.6, 0], 0.02, [0, -0.14, 0]);
        registerPart(tail, 'casing', { anchor: [-2.8, 0.95, 0] });

        /* ---------- 起爆阵列 ---------- */
        const detGroup = new T.Group();
        const detMats = [];
        const detBodies = [];
        const detCount = 32;
        for (let i = 0; i < detCount; i++) {
          const p = fibonacciSphere(i, detCount);
          const pos = new T.Vector3(p.x * 1.57, p.y * 0.99, p.z * 0.99);
          const normal = p.clone().normalize();
          const ringAngle = Math.atan2(pos.z, pos.y);
          const ringPos = new T.Vector3(0, Math.cos(ringAngle) * 2.18, Math.sin(ringAngle) * 2.18);
          const ringQuat = new T.Quaternion().setFromUnitVectors(
            new T.Vector3(0, 1, 0),
            new T.Vector3(0, Math.cos(ringAngle), Math.sin(ringAngle))
          );
          const holder = new T.Group();
          holder.position.copy(pos);
          holder.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), normal);

          const bodyMat = new T.MeshStandardMaterial({
            color: 0x1b2735,
            metalness: 0.9,
            roughness: 0.32,
            emissive: 0x120800,
            emissiveIntensity: 0.4
          });
          detMats.push(bodyMat);
          const body = new T.Mesh(new T.CylinderGeometry(0.043, 0.05, 0.24, 8), bodyMat);
          body.position.y = 0.02;
          holder.add(body);
          const tipMat = new T.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.95 });
          detMats.push(tipMat);
          const tip = new T.Mesh(new T.SphereGeometry(0.055, 8, 8), tipMat);
          tip.position.y = 0.15;
          holder.add(tip);
          const wireMat = new T.MeshBasicMaterial({ color: 0xff8a4c, transparent: true, opacity: 0.34 });
          const wire = new T.Mesh(new T.TorusGeometry(0.085, 0.004, 4, 12), wireMat);
          wire.rotation.x = Math.PI / 2;
          wire.position.y = 0.01;
          holder.add(wire);
          detGroup.add(holder);
          holder.userData.basePos = pos.clone();
          holder.userData.ringPos = ringPos;
          holder.userData.baseQuat = holder.quaternion.clone();
          holder.userData.ringQuat = ringQuat;
          detBodies.push(holder);
        }
        const detRingMat = new T.MeshStandardMaterial({
          color: 0xb87333,
          metalness: 0.85,
          roughness: 0.3,
          emissive: 0x321000,
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.72
        });
        const detRing = new T.Mesh(new T.TorusGeometry(1.02, 0.009, 6, 96), detRingMat);
        detRing.rotation.y = Math.PI / 2;
        detGroup.add(detRing);
        device.add(detGroup);
        registerPart(detGroup, 'detonators', { anchor: [0, 2.35, 0] });

        /* ---------- 炸药透镜 / 推层 / 反射层 / 核心 ---------- */
        const lensMat = new T.MeshStandardMaterial({
          color: 0x945a25,
          metalness: 0.55,
          roughness: 0.52,
          flatShading: true,
          emissive: 0x2a1103,
          emissiveIntensity: 0.38,
          side: T.DoubleSide
        });
        lensMaterials.push(lensMat);

        const lensF = makeCutShell(T, {
          partId: 'lens', front: true, len: 1.72, rad: 0.99, gap: 1.22,
          material: lensMat, color: 0xffa05a, seg: 26, ring: 10
        });
        const lensB = makeCutShell(T, {
          partId: 'lens', front: false, len: 1.72, rad: 0.99, gap: 1.22,
          material: lensMat, color: 0xffa05a, seg: 26, ring: 10
        });
        lensF.rotation.x = -0.55;
        lensB.rotation.x = -0.55;
        device.add(lensF, lensB);
        addAnim(lensF, [3.95, 0.1, 0], 0.16, [0, 0.08, 0.02]);
        addAnim(lensB, [-3.95, 0.1, 0], 0.16, [0, -0.08, -0.02]);
        registerPart(lensF, 'lens', { anchor: [0.3, 1.16, 0] });
        registerPart(lensB, 'lens');

        const pusherMat = new T.MeshStandardMaterial({
          color: 0xd7e3f4,
          metalness: 0.94,
          roughness: 0.2,
          side: T.DoubleSide,
          envMapIntensity: 1.2
        });
        const pusherF = makeCutShell(T, {
          partId: 'pusher', front: true, len: 1.39, rad: 0.83, gap: 1.04,
          material: pusherMat, color: 0xbfe6ff, seg: 32, ring: 12
        });
        const pusherB = makeCutShell(T, {
          partId: 'pusher', front: false, len: 1.39, rad: 0.83, gap: 1.04,
          material: pusherMat, color: 0xbfe6ff, seg: 32, ring: 12
        });
        pusherF.rotation.x = -0.55;
        pusherB.rotation.x = -0.55;
        device.add(pusherF, pusherB);
        addAnim(pusherF, [2.55, 0.06, 0], 0.25, [0, 0.06, 0]);
        addAnim(pusherB, [-2.55, 0.06, 0], 0.25, [0, -0.06, 0]);
        registerPart(pusherF, 'pusher', { anchor: [0.3, 0.96, 0] });
        registerPart(pusherB, 'pusher');

        const tamperMat = new T.MeshStandardMaterial({
          color: 0x526456,
          metalness: 0.86,
          roughness: 0.3,
          emissive: 0x071a0d,
          emissiveIntensity: 0.55,
          side: T.DoubleSide
        });
        const tamperF = makeCutShell(T, {
          partId: 'tamper', front: true, len: 1.15, rad: 0.69, gap: 1.0,
          material: tamperMat, color: 0x7fe0b0, seg: 28, ring: 10
        });
        const tamperB = makeCutShell(T, {
          partId: 'tamper', front: false, len: 1.15, rad: 0.69, gap: 1.0,
          material: tamperMat, color: 0x7fe0b0, seg: 28, ring: 10
        });
        tamperF.rotation.x = -0.55;
        tamperB.rotation.x = -0.55;
        device.add(tamperF, tamperB);
        addAnim(tamperF, [1.38, 0.03, 0], 0.33, [0, 0.06, 0]);
        addAnim(tamperB, [-1.38, 0.03, 0], 0.33, [0, -0.06, 0]);
        registerPart(tamperF, 'tamper', { anchor: [0.2, 0.8, 0] });
        registerPart(tamperB, 'tamper');

        const coreMat = new T.MeshStandardMaterial({
          color: 0xd8a77a,
          metalness: 0.92,
          roughness: 0.24,
          emissive: 0xff4c1e,
          emissiveIntensity: 0.3,
          side: T.DoubleSide
        });
        const coreF = makeCutShell(T, {
          partId: 'core', front: true, len: 0.84, rad: 0.51, gap: 1.5,
          material: coreMat, color: 0xff7a5c, seg: 30, ring: 12
        });
        const coreB = makeCutShell(T, {
          partId: 'core', front: false, len: 0.84, rad: 0.51, gap: 1.5,
          material: coreMat, color: 0xff7a5c, seg: 30, ring: 12
        });
        coreF.rotation.x = -0.55;
        coreB.rotation.x = -0.55;
        device.add(coreF, coreB);
        addAnim(coreF, [0.6, 0, 0], 0.4, [0, 0.04, 0]);
        addAnim(coreB, [-0.6, 0, 0], 0.4, [0, -0.04, 0]);
        registerPart(coreF, 'core', { anchor: [0.18, 0.58, 0] });
        registerPart(coreB, 'core');

        const coreGlow = makeGlowSprite(T, 0xff5a2e, 0.58, 0.72);
        coreGlow.position.set(0, 0, 0);
        device.add(coreGlow);

        /* ---------- 中子引发器 ---------- */
        const initGroup = new T.Group();
        const initMat = new T.MeshStandardMaterial({
          color: 0xe8d7a3,
          metalness: 0.88,
          roughness: 0.24,
          emissive: 0x6a4bff,
          emissiveIntensity: 0.55
        });
        const initCore = new T.Mesh(new T.SphereGeometry(0.235, 32, 20), initMat);
        initGroup.add(initCore);
        const cageMat = new T.MeshBasicMaterial({ color: 0xb79cff, transparent: true, opacity: 0.72 });
        for (let i = 0; i < 3; i++) {
          const ring = new T.Mesh(new T.TorusGeometry(0.34, 0.006, 5, 48), cageMat);
          ring.rotation.set(i * Math.PI / 3, i * Math.PI / 4, i * Math.PI / 5);
          initGroup.add(ring);
        }
        const initGlow = makeGlowSprite(T, 0xb79cff, 0.42, 0.62);
        initGroup.add(initGlow);
        device.add(initGroup);
        registerPart(initGroup, 'initiator', { anchor: [0, 0.34, 0] });

        /* ---------- 选择光环 ---------- */
        const halo = makeHalo(T);
        scene.add(halo.sprite);

        /* ---------- 环境动态 ---------- */
        let last = performance.now();

        function resize() {
          if (!renderer || !camera) return;
          const w = stageEl.clientWidth;
          const h = stageEl.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          cam.baseRadius = fitRadius(false);
          if (!cam.dragging) updateCameraTarget(true);
        }
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(stageEl);

        function raycast(clientX, clientY) {
          const rect = canvas.getBoundingClientRect();
          const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
          const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
          const ray = new T.Raycaster();
          ray.setFromCamera(new T.Vector2(nx, ny), camera);
          const all = pickables.filter((m) => {
            const pid = m.userData.partId;
            if (pid === 'casing') return explodeCurrent > 0.25;
            return true;
          });
          const hits = ray.intersectObjects(all, false);
          return hits.length ? hits[0].object.userData.partId : null;
        }

        function hoverAt(clientX, clientY) {
          const id = raycast(clientX, clientY);
          if (id === hoveredPart) return;
          hoveredPart = id;
          stageEl.classList.toggle('is-hovering', !!id);
          root.querySelectorAll('.di-item').forEach((b) => b.classList.toggle('is-hover', b.dataset.part === id));
        }

        function selectAt(clientX, clientY) {
          const id = raycast(clientX, clientY);
          if (id) setSelected(id);
        }

        function fromUI(e) {
          return !!(e.target && e.target.closest &&
            e.target.closest('.stage-actions, .stage-tools, .device-label, .stage-hud, button, input, a'));
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
              cam.radiusT = clamp(cam.radiusT * (1 + (k - 1) * 0.65), 6.5, 30);
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
          cam.phiT = clamp(cam.phiT - dy * 0.0045, 0.55, 2.55);
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
            if (!wasDrag) selectAt(e.clientX, e.clientY);
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
          cam.radiusT = clamp(cam.radiusT * (1 + Math.sign(e.deltaY) * 0.09), 6.5, 30);
          cam.autoPause = performance.now() + 4000;
        }

        on(stageEl, 'pointerdown', onPointerDown);
        on(stageEl, 'pointermove', onPointerMove);
        on(stageEl, 'pointerup', onPointerUp);
        on(stageEl, 'pointercancel', onPointerUp);
        on(stageEl, 'pointerleave', () => {
          if (!cam.dragging) {
            hoveredPart = null;
            stageEl.classList.remove('is-hovering');
            root.querySelectorAll('.di-item').forEach((b) => b.classList.remove('is-hover'));
          }
        });
        on(stageEl, 'wheel', onWheel, { passive: false });
        on(stageEl, 'contextmenu', (e) => e.preventDefault());

        function updateCameraTarget(immediate) {
          const exploded = explodeTarget > 0.5;
          if (exploded !== cam.lastExploded) {
            cam.lastExploded = exploded;
            // 拆解时转到更接近侧视的角度，让七层结构沿屏幕横向展开
            cam.thetaT = exploded ? 0.16 : 0.64;
            cam.phiT = exploded ? 1.14 : (compact ? 1.12 : 1.08);
            cam.autoPause = performance.now() + 2200;
          }
          cam.radiusT = fitRadius(exploded);
          if (immediate) cam.radius = cam.radiusT;
        }

        function resetView() {
          cam.thetaT = cam.lastExploded ? 0.16 : 0.64;
          cam.phiT = cam.lastExploded ? 1.14 : (compact ? 1.12 : 1.08);
          cam.radiusT = fitRadius(cam.lastExploded);
          cam.autoPause = performance.now() + 1800;
        }

        function focusSelected() {
          cam.thetaT = 0.34;
          cam.phiT = 1.2;
          cam.radiusT = fitRadius(false) * 0.78;
          cam.autoPause = performance.now() + 4000;
        }

        function nudge(key) {
          if (key === 'arrowleft') cam.thetaT += 0.14;
          else if (key === 'arrowright') cam.thetaT -= 0.14;
          else if (key === 'arrowup') cam.phiT = clamp(cam.phiT - 0.1, 0.55, 2.55);
          else if (key === 'arrowdown') cam.phiT = clamp(cam.phiT + 0.1, 0.55, 2.55);
          cam.autoPause = performance.now() + 3000;
        }

        function zoomBy(k) {
          cam.radiusT = clamp(cam.radiusT * k, 6.5, 30);
        }

        function setAuto(onFlag) { cam.auto = !!onFlag; }

        function setSelected3D(id) {
          const rec = partsMap[id];
          if (!rec) return;
          halo.sprite.material.color.set(rec.data.accent);
          halo.visible = true;
        }

        const tmpVec = new T.Vector3();
        const labelEls = Array.from(labelsEl.querySelectorAll('.device-label')).map((el) => ({
          el,
          id: el.dataset.labelPart,
          part: DATA.parts.find((p) => p.id === el.dataset.labelPart)
        }));
        const leaderLines = {};
        DATA.parts.forEach((p) => {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('stroke', p.accent);
          line.setAttribute('stroke-opacity', '0.3');
          leadersEl.appendChild(line);
          leaderLines[p.id] = line;
        });

        function updateLabels() {
          const w = stageEl.clientWidth;
          const h = stageEl.clientHeight;
          labelEls.forEach((item) => {
            const rec = partsMap[item.id];
            if (!rec || !rec.anchor) { item.el.style.display = 'none'; return; }
            rec.anchor.getWorldPosition(tmpVec);
            tmpVec.project(camera);
            const x = (tmpVec.x * 0.5 + 0.5) * w;
            const y = (-tmpVec.y * 0.5 + 0.5) * h;
            const behind = tmpVec.z > 1;
            const show = labelsOn && !behind && (explodeCurrent > 0.25 || item.id === selected);
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
              line.setAttribute('stroke-opacity', item.id === selected ? '0.62' : '0.24');
              line.setAttribute('stroke-width', item.id === selected ? '1' : '0.7');
              line.style.display = show ? '' : 'none';
            }
          });
        }

        function updateHalo() {
          const rec = partsMap[selected];
          if (!rec || !rec.anchor) return;
          rec.anchor.getWorldPosition(tmpVec);
          halo.sprite.position.copy(tmpVec);
          halo.sprite.material.rotation += 0.005;
          const s = explodeCurrent > 0.2 ? 0.9 : 0.72;
          halo.sprite.scale.set(s, s, 1);
        }

        function animate(now) {
          if (destroyed) return;
          raf = requestAnimationFrame(animate);
          const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
          last = now;

          if (explodeTarget > explodeCurrent) explodeCurrent = Math.min(explodeTarget, explodeCurrent + dt * 2.4);
          else if (explodeTarget < explodeCurrent) explodeCurrent = Math.max(explodeTarget, explodeCurrent - dt * 2.4);

          const e = explodeCurrent;
          animatables.forEach((obj) => {
            const local = delayEase(e, obj.userData.delay);
            obj.position.copy(obj.userData.basePos).addScaledVector(obj.userData.exp, local);
            obj.rotation.set(
              obj.userData.baseRot.x + obj.userData.expRot.x * local,
              obj.userData.baseRot.y + obj.userData.expRot.y * local,
              obj.userData.baseRot.z + obj.userData.expRot.z * local
            );
          });

          detBodies.forEach((holder) => {
            const local = delayEase(e, 0.12);
            const base = holder.userData.basePos;
            const ring = holder.userData.ringPos;
            holder.position.set(
              base.x * (1 - local),
              base.y * (1 - local) + ring.y * local,
              base.z * (1 - local) + ring.z * local
            );
            holder.scale.setScalar(1 + 0.3 * local);
            holder.quaternion.slerpQuaternions(holder.userData.baseQuat, holder.userData.ringQuat, local);
          });
          detRing.scale.setScalar(1 + e * 1.08);
          detRing.material.opacity = 0.72 - e * 0.46;

          const shellOpacity = 0.94 - 0.92 * e;
          casingMaterials.forEach((m) => {
            m.opacity = shellOpacity;
          });
          casingF.visible = e < 0.88;
          casingB.visible = e < 0.88;
          coreLight.intensity = 3.4 + Math.sin(now * 0.0018) * 0.65 + e * 1.1;
          coreGlow.material.opacity = 0.32 + Math.sin(now * 0.002) * 0.05 + e * 0.1;
          coreGlow.scale.setScalar(1.05 + Math.sin(now * 0.0016) * 0.04 + e * 0.08);
          initGlow.material.opacity = 0.5 + Math.sin(now * 0.003) * 0.08;

          scanRings.group.children.forEach((ring, i) => {
            ring.position.x = Math.sin(now * 0.00045 + i * 1.8) * (2.0 - e * 0.5);
            ring.material.opacity = (0.14 + (i % 2) * 0.05) * (1 - e * 0.75);
            ring.visible = e < 0.55;
          });

          axisGroup.group.children.forEach((child) => {
            if (child.material) child.material.opacity = Math.max(0, (e - 0.12) * 0.95);
          });

          orbitRings.group.rotation.y += dt * 0.05;
          orbitRings.group.rotation.z += dt * 0.012;
          stars.rotation.y += dt * 0.004;
          stars.rotation.x = Math.sin(now * 0.00008) * 0.02;

          if (cam.auto && !cam.dragging && now > cam.autoPause) {
            cam.thetaT += dt * 0.03;
          }
          const damp = 1 - Math.exp(-dt * 7);
          cam.theta += (cam.thetaT - cam.theta) * damp;
          cam.phi += (cam.phiT - cam.phi) * damp;
          cam.radius += (cam.radiusT - cam.radius) * damp;

          const sinPhi = Math.sin(cam.phi);
          camera.position.set(
            cam.radius * sinPhi * Math.sin(cam.theta),
            cam.radius * Math.cos(cam.phi),
            cam.radius * sinPhi * Math.cos(cam.theta)
          );
          camera.lookAt(0, 0.1, 0);

          if (devicePercent) {
            deviceOrbitEl.textContent = String(Math.round(((cam.theta * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0') + '°';
            deviceZoomEl.textContent = (cam.baseRadius / cam.radius).toFixed(2) + '×';
          }

          updateLabels();
          updateHalo();
          renderer.render(scene, camera);
        }

        const api = {
          setSelected(id) { setSelected3D(id); },
          setAuto,
          resetView,
          focusSelected,
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
                const list = Array.isArray(obj.material) ? obj.material : [obj.material];
                list.forEach((m) => {
                  if (m.map) m.map.dispose();
                  if (m.alphaMap) m.alphaMap.dispose();
                  m.dispose();
                });
              }
            });
            if (envRT) envRT.dispose();
            renderer.dispose();
          }
        };
        view = api;
        setSelected3D(selected);
        resize();
        cam.radius = cam.radiusT;
        raf = requestAnimationFrame(animate);
        return api;
      }

      /* ==========================================================
         Three.js 几何 / 材质工具
         ========================================================== */
      function halfSphereGeometry(T, len, rad, front, gap) {
        const phiStart = Math.PI / 2 + gap / 2;
        const phiLength = Math.PI * 2 - gap;
        const geo = new T.SphereGeometry(1, 48, 26, phiStart, phiLength, 0, Math.PI / 2);
        geo.rotateZ(front ? -Math.PI / 2 : Math.PI / 2);
        geo.scale(len, rad, rad);
        return geo;
      }

      function addCutSection(T, group, opts) {
        const phiStart = Math.PI / 2 + opts.gap / 2;
        const phiEnd = phiStart + Math.PI * 2 - opts.gap;
        const lineMat = new T.LineBasicMaterial({
          color: opts.color,
          transparent: true,
          opacity: opts.lineOpacity == null ? 0.64 : opts.lineOpacity,
          blending: T.AdditiveBlending,
          depthWrite: false
        });
        const pointAt = (phi, th, k) => {
          const ox = -Math.cos(phi) * Math.sin(th);
          const oy = Math.cos(th);
          const oz = Math.sin(phi) * Math.sin(th);
          const rx = opts.front ? oy : -oy;
          const ry = opts.front ? -ox : ox;
          return new T.Vector3(rx * opts.len * k, ry * opts.rad * k, oz * opts.rad * k);
        };
        [phiStart, phiEnd].forEach((phi) => {
          const pts = [];
          for (let i = 0; i <= 20; i++) {
            const th = (i / 20) * Math.PI / 2;
            pts.push(pointAt(phi, th, 1));
          }
          const lg = new T.BufferGeometry().setFromPoints(pts);
          group.add(new T.Line(lg, lineMat));
        });

        // 切口端面：给剖面一层可见的材料厚度
        const faceMat = new T.MeshStandardMaterial({
          color: opts.faceColor || opts.color,
          metalness: opts.faceMetalness == null ? 0.35 : opts.faceMetalness,
          roughness: 0.58,
          flatShading: true,
          side: T.DoubleSide,
          emissive: opts.color,
          emissiveIntensity: 0.07
        });
        [phiStart, phiEnd].forEach((phi) => {
          const verts = [];
          const steps = 20;
          const kIn = opts.thickness || 0.94;
          for (let i = 0; i < steps; i++) {
            const t0 = (i / steps) * Math.PI / 2;
            const t1 = ((i + 1) / steps) * Math.PI / 2;
            const o0 = pointAt(phi, t0, 1);
            const o1 = pointAt(phi, t1, 1);
            const i0 = pointAt(phi, t0, kIn);
            const i1 = pointAt(phi, t1, kIn);
            verts.push(o0.x, o0.y, o0.z, i0.x, i0.y, i0.z, o1.x, o1.y, o1.z);
            verts.push(o1.x, o1.y, o1.z, i0.x, i0.y, i0.z, i1.x, i1.y, i1.z);
          }
          const faceGeo = new T.BufferGeometry();
          faceGeo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
          faceGeo.computeVertexNormals();
          group.add(new T.Mesh(faceGeo, faceMat));
        });
      }

      function makeCutShell(T, opts) {
        const group = new T.Group();
        const geo = halfSphereGeometry(T, opts.len, opts.rad, opts.front, opts.gap);
        const mesh = new T.Mesh(geo, opts.material);
        group.add(mesh);
        addCutSection(T, group, opts);

        // 内壁的微弱辉光，让切口有“厚度”
        const innerMat = new T.MeshBasicMaterial({
          color: opts.color,
          transparent: true,
          opacity: 0.055,
          side: T.BackSide,
          blending: T.AdditiveBlending,
          depthWrite: false
        });
        const inner = new T.Mesh(geo.clone(), innerMat);
        inner.scale.set(0.985, 0.985, 0.985);
        group.add(inner);
        return group;
      }

      function makeCasingHalf(T, front, material) {
        const group = new T.Group();
        const len = 2.28;
        const rad = 1.2;
        const gap = 1.08;
        const geo = halfSphereGeometry(T, len, rad, front, gap);
        const mesh = new T.Mesh(geo, material);
        mesh.renderOrder = 8;
        group.add(mesh);

        addCutSection(T, group, {
          front: front,
          len: len,
          rad: rad,
          gap: gap,
          color: 0x9ed8ff,
          faceColor: 0x6d8196,
          faceMetalness: 0.78,
          thickness: 0.965,
          lineOpacity: 0.38
        });

        const wireMat = new T.MeshBasicMaterial({
          color: 0x8fd8ff,
          wireframe: true,
          transparent: true,
          opacity: 0.05,
          depthWrite: false
        });
        const phiStart = Math.PI / 2 + gap / 2;
        const wireGeo = new T.SphereGeometry(1, 18, 9, phiStart, Math.PI * 2 - gap, 0, Math.PI / 2);
        wireGeo.rotateZ(front ? -Math.PI / 2 : Math.PI / 2);
        wireGeo.scale(len, rad, rad);
        const wire = new T.Mesh(wireGeo, wireMat);
        wire.renderOrder = 9;
        group.add(wire);
        group.rotation.x = -0.55;

        if (front) {
          const noseMat = new T.MeshStandardMaterial({
            color: 0x8ea3b9,
            metalness: 0.92,
            roughness: 0.24
          });
          const nose = new T.Mesh(new T.ConeGeometry(0.27, 0.42, 28), noseMat);
          nose.rotation.z = -Math.PI / 2;
          nose.position.x = len + 0.22;
          group.add(nose);
          const noseRing = new T.Mesh(
            new T.TorusGeometry(0.275, 0.008, 5, 40),
            new T.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.6 })
          );
          noseRing.rotation.y = Math.PI / 2;
          noseRing.position.x = len + 0.02;
          group.add(noseRing);
          const pitot = new T.Mesh(
            new T.CylinderGeometry(0.008, 0.008, 0.2, 6),
            new T.MeshBasicMaterial({ color: 0xd7e3f4, transparent: true, opacity: 0.55 })
          );
          pitot.rotation.z = Math.PI / 2;
          pitot.position.x = len + 0.5;
          group.add(pitot);
        }
        return group;
      }

      function makeTail(T) {
        const group = new T.Group();
        const metal = new T.MeshStandardMaterial({
          color: 0x536274,
          metalness: 0.9,
          roughness: 0.28
        });
        const dark = new T.MeshStandardMaterial({
          color: 0x1b2634,
          metalness: 0.86,
          roughness: 0.4
        });

        // 收敛式尾锥：前端与弹体相接，后端略外扩
        const shroud = new T.Mesh(new T.CylinderGeometry(0.72, 0.46, 1.04, 32, 1, true), metal);
        shroud.rotation.z = Math.PI / 2;
        shroud.position.x = -2.78;
        group.add(shroud);

        const rearCap = new T.Mesh(new T.CylinderGeometry(0.34, 0.5, 0.22, 24), dark);
        rearCap.rotation.z = Math.PI / 2;
        rearCap.position.x = -3.4;
        group.add(rearCap);

        const rearRing = new T.Mesh(
          new T.TorusGeometry(0.56, 0.016, 6, 48),
          new T.MeshStandardMaterial({ color: 0xa8b8c8, metalness: 0.9, roughness: 0.22 })
        );
        rearRing.rotation.y = Math.PI / 2;
        rearRing.position.x = -3.28;
        group.add(rearRing);

        // 四片梯形尾翼，沿弹轴十字布置
        for (let i = 0; i < 4; i++) {
          const pivot = new T.Group();
          pivot.rotation.x = (i * Math.PI) / 2;
          const fin = new T.Mesh(new T.BoxGeometry(0.92, 0.58, 0.035), metal);
          fin.position.set(-2.93, 0.79, 0);
          pivot.add(fin);
          const edge = new T.Mesh(new T.BoxGeometry(0.08, 0.58, 0.05), dark);
          edge.position.set(-3.37, 0.79, 0);
          pivot.add(edge);
          group.add(pivot);
        }

        const antenna = new T.Mesh(
          new T.CylinderGeometry(0.012, 0.012, 0.34, 6),
          new T.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.64 })
        );
        antenna.position.set(-3.45, 0.46, 0);
        antenna.rotation.z = 0.2;
        group.add(antenna);
        return group;
      }

      function fibonacciSphere(i, n) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = i * 2.399963229728653;
        return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
      }

      function makeGlowSprite(T, color, size, opacity) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const g = canvas.getContext('2d');
        const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.16, 'rgba(255,230,200,0.55)');
        grd.addColorStop(0.46, 'rgba(255,120,60,0.16)');
        grd.addColorStop(1, 'rgba(255,80,30,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 256, 256);
        const tex = new T.CanvasTexture(canvas);
        tex.colorSpace = T.SRGBColorSpace;
        const mat = new T.SpriteMaterial({
          map: tex,
          color,
          transparent: true,
          opacity,
          blending: T.AdditiveBlending,
          depthWrite: false,
          depthTest: false
        });
        const sprite = new T.Sprite(mat);
        sprite.scale.set(size, size, 1);
        return sprite;
      }

      function makeHalo(T) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const g = canvas.getContext('2d');
        g.translate(256, 256);
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.lineWidth = 2;
        g.setLineDash([12, 12]);
        g.beginPath(); g.arc(0, 0, 196, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
        g.lineWidth = 1;
        g.strokeStyle = 'rgba(255,255,255,0.25)';
        g.beginPath(); g.arc(0, 0, 168, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          g.strokeStyle = i % 6 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)';
          g.beginPath();
          g.moveTo(Math.cos(a) * 204, Math.sin(a) * 204);
          g.lineTo(Math.cos(a) * (i % 6 === 0 ? 226 : 216), Math.sin(a) * (i % 6 === 0 ? 226 : 216));
          g.stroke();
        }
        const tex = new T.CanvasTexture(canvas);
        tex.colorSpace = T.SRGBColorSpace;
        const mat = new T.SpriteMaterial({
          map: tex,
          color: 0xffb347,
          transparent: true,
          opacity: 0.9,
          blending: T.AdditiveBlending,
          depthWrite: false,
          depthTest: false
        });
        const sprite = new T.Sprite(mat);
        sprite.scale.set(1.45, 1.45, 1);
        return { sprite, visible: true };
      }

      function makeEnvTexture(T) {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 512;
        const g = c.getContext('2d');
        const bg = g.createLinearGradient(0, 0, 0, 512);
        bg.addColorStop(0, '#02040a');
        bg.addColorStop(0.38, '#0a2034');
        bg.addColorStop(0.58, '#12334b');
        bg.addColorStop(0.76, '#06101d');
        bg.addColorStop(1, '#010205');
        g.fillStyle = bg;
        g.fillRect(0, 0, 1024, 512);

        function glow(x, y, r, color) {
          const grd = g.createRadialGradient(x, y, 0, x, y, r);
          grd.addColorStop(0, color);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grd;
          g.fillRect(0, 0, 1024, 512);
        }
        glow(220, 160, 240, 'rgba(82,210,255,0.75)');
        glow(790, 210, 280, 'rgba(255,142,62,0.58)');
        glow(520, 80, 260, 'rgba(230,245,255,0.5)');
        glow(950, 380, 220, 'rgba(70,140,255,0.32)');

        g.globalAlpha = 0.38;
        for (let i = 0; i < 14; i++) {
          const x = (i * 137) % 1024;
          const w = 20 + (i % 5) * 16;
          g.fillStyle = i % 3 === 0 ? '#0d3f56' : '#081726';
          g.fillRect(x, 40 + (i % 4) * 70, w, 220);
        }
        g.globalAlpha = 1;
        const tex = new T.CanvasTexture(c);
        tex.mapping = T.EquirectangularReflectionMapping;
        tex.colorSpace = T.SRGBColorSpace;
        return tex;
      }

      function makePlatform(T) {
        const group = new T.Group();
        group.position.y = -1.95;

        const disc = new T.Mesh(
          new T.CircleGeometry(6.2, 96),
          new T.MeshStandardMaterial({
            color: 0x02050a,
            metalness: 0.08,
            roughness: 0.94,
            transparent: true,
            opacity: 0.46,
            side: T.DoubleSide
          })
        );
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = -0.015;
        group.add(disc);

        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 1024;
        const g = c.getContext('2d');
        g.translate(512, 512);
        g.strokeStyle = 'rgba(126,206,255,0.36)';
        g.lineWidth = 1;
        [164, 292, 404, 492].forEach((r, i) => {
          g.globalAlpha = i === 0 ? 0.7 : 0.42;
          g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
        });
        g.globalAlpha = 1;
        for (let i = 0; i < 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          const long = i % 6 === 0;
          g.strokeStyle = long ? 'rgba(255,179,71,0.5)' : 'rgba(126,206,255,0.22)';
          g.beginPath();
          g.moveTo(Math.cos(a) * 486, Math.sin(a) * 486);
          g.lineTo(Math.cos(a) * (long ? 462 : 478), Math.sin(a) * (long ? 462 : 478));
          g.stroke();
        }
        g.strokeStyle = 'rgba(255,179,71,0.36)';
        g.lineWidth = 2;
        [0.3, 1.4, 2.2, 3.6, 5.1].forEach((a0) => {
          g.beginPath();
          g.arc(0, 0, 404, a0, a0 + 0.4);
          g.stroke();
        });
        g.globalAlpha = 0.45;
        g.font = '20px monospace';
        g.fillStyle = '#7ecfff';
        g.fillText('CORE / 01', -452, -300);
        g.fillText('RADIUS  R', 330, 322);
        g.fillStyle = '#ffb347';
        g.fillText('NEUTRON PATH', 260, -438);
        g.globalAlpha = 1;

        const tex = new T.CanvasTexture(c);
        tex.colorSpace = T.SRGBColorSpace;
        const decal = new T.Mesh(
          new T.PlaneGeometry(13.6, 13.6),
          new T.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.28,
            blending: T.AdditiveBlending,
            depthWrite: false,
            side: T.DoubleSide
          })
        );
        decal.rotation.x = -Math.PI / 2;
        decal.position.y = 0.002;
        group.add(decal);
        return group;
      }

      function makeStars(T) {
        const n = 620;
        const pos = new Float32Array(n * 3);
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const r = 14 + Math.random() * 26;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          pos[i * 3 + 1] = r * Math.cos(phi) * 0.6 + 1.8;
          pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
          const warm = Math.random() > 0.84;
          col[i * 3] = warm ? 1.0 : 0.45;
          col[i * 3 + 1] = warm ? 0.68 : 0.78;
          col[i * 3 + 2] = warm ? 0.34 : 1.0;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('color', new T.BufferAttribute(col, 3));
        const mat = new T.PointsMaterial({
          size: 0.055,
          vertexColors: true,
          transparent: true,
          opacity: 0.72,
          blending: T.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true
        });
        return new T.Points(geo, mat);
      }

      function makeOrbitRings(T) {
        const group = new T.Group();
        const mat1 = new T.MeshBasicMaterial({
          color: 0x50d8ff,
          transparent: true,
          opacity: 0.18,
          blending: T.AdditiveBlending,
          depthWrite: false,
          side: T.DoubleSide
        });
        const mat2 = new T.MeshBasicMaterial({
          color: 0xffb347,
          transparent: true,
          opacity: 0.15,
          blending: T.AdditiveBlending,
          depthWrite: false,
          side: T.DoubleSide
        });
        const r1 = new T.Mesh(new T.TorusGeometry(3.38, 0.007, 4, 128), mat1);
        r1.rotation.set(1.05, 0.25, 0.32);
        group.add(r1);
        const r2 = new T.Mesh(new T.TorusGeometry(3.82, 0.005, 4, 128), mat2);
        r2.rotation.set(0.55, 1.1, -0.2);
        group.add(r2);
        return { group };
      }

      function makeScanRings(T) {
        const group = new T.Group();
        for (let i = 0; i < 2; i++) {
          const mat = new T.MeshBasicMaterial({
            color: i === 0 ? 0x56e0ff : 0xffb347,
            transparent: true,
            opacity: 0.14,
            blending: T.AdditiveBlending,
            depthWrite: false
          });
          const ring = new T.Mesh(new T.TorusGeometry(1.16, 0.005, 4, 96), mat);
          ring.rotation.y = Math.PI / 2;
          ring.position.x = i === 0 ? -1.1 : 0.7;
          group.add(ring);
        }
        return { group };
      }

      function makeAxis(T) {
        const group = new T.Group();
        const mat = new T.LineDashedMaterial({
          color: 0xffb347,
          transparent: true,
          opacity: 0,
          dashSize: 0.1,
          gapSize: 0.1,
          depthWrite: false
        });
        const pts = [new T.Vector3(-9.0, 0, 0), new T.Vector3(6.8, 0, 0)];
        const geo = new T.BufferGeometry().setFromPoints(pts);
        const line = new T.Line(geo, mat);
        line.computeLineDistances();
        group.add(line);

        const tickMat = new T.LineBasicMaterial({
          color: 0xffb347,
          transparent: true,
          opacity: 0,
          blending: T.AdditiveBlending,
          depthWrite: false
        });
        const tickPts = [];
        for (let x = -8.5; x <= 6.5; x += 0.5) {
          const len = Math.abs(x % 1) < 0.01 ? 0.16 : 0.08;
          tickPts.push(new T.Vector3(x, -len, 0), new T.Vector3(x, len, 0));
        }
        const tickGeo = new T.BufferGeometry().setFromPoints(tickPts);
        group.add(new T.LineSegments(tickGeo, tickMat));
        return { group };
      }
    }
  });
})(window.NEG);
