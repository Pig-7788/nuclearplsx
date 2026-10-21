/* ============================================================
   核纪元 · 核电站建造
   按工程顺序拼装压水堆，观察一 / 二 / 三回路贯通
   ============================================================ */
(function (NEG) {
  'use strict';

  const LOOP_NAME = { 1: '一回路', 2: '二回路', 3: '三回路' };
  const LOOP_COLOR = { 1: '#ffab3d', 2: '#38e1ff', 3: '#3ef0a2' };

  NEG.registerMode({
    id: 'city',
    order: 2,
    title: '核电站建造',
    nav: '核电站建造',
    icon: 'build',
    accent: '#38e1ff',
    blurb: '按工程顺序拼装压水堆：堆芯、蒸汽发生器、安全壳、汽轮机……',
    progress(s) {
      return Math.min(1, (s.modes.city.completed || 0) > 0 ? 1 : ((s.modes.city.bestSteps || 0) / 12));
    },
    isComplete(s) { return (s.modes.city.completed || 0) > 0; },

    render(root, ctx) {
      const { store, data, ui, audio, util: U } = ctx;
      const plant = data.plant || {};
      const parts = plant.parts || [];
      const loops = plant.loops || [];
      const distractors = plant.distractors || [];
      const total = parts.length;

      let built = new Set();
      let trayOrder = U.shuffle(parts.map((p) => ({ type: 'part', id: p.id }))
        .concat(distractors.map((d) => ({ type: 'distractor', id: d.id }))));
      let focusLoop = null;
      const liveState = { 1: false, 2: false, 3: false };
      let dragCleanups = [];

      const st = store.get();
      const bestSteps = st.modes.city.bestSteps || 0;

      root.innerHTML =
        '<div class="mode-page city-page">' +
          '<header class="page-top city-top">' +
            '<div class="pt-brand">' +
              '<span class="eyebrow">CONSTRUCTION SITE · 工程建造</span>' +
              '<h2>' + NEG.icon('build') + '核电站建造</h2>' +
            '</div>' +
            '<span class="lead-inline">从堆芯到电网，按正确顺序拼装 12 个核心部件。</span>' +
            '<div class="pt-tools">' +
              '<span class="badge badge-cyan">建造进度 <b id="builtCount">0</b>/' + total + '</span>' +
              '<button class="btn btn-quiet btn-sm" data-action="hint">' + NEG.icon('info', 13) + '提示</button>' +
              '<button class="btn btn-quiet btn-sm" data-action="reset">' + NEG.icon('refresh', 14) + '重新建造</button>' +
            '</div>' +
          '</header>' +
        '<div class="plant-layout">' +
          '<section class="panel plant-stage anim-fade-up" id="plantStage" aria-label="压水堆剖面建造区">' +
            '<div class="plant-toolbar">' +
              '<span class="stage-title">' + NEG.icon('target', 14) + '压水堆剖面 <b>PWR · 3 LOOPS</b>' +
                '<span class="scroll-hint">左右滑动 ›</span></span>' +
            '</div>' +
            '<div class="plant-scroll">' + NEG.svg.plant() + '</div>' +
          '</section>' +
          '<aside class="plant-side">' +
            '<section class="panel build-panel anim-fade-up d1">' +
              '<div class="panel-head" style="margin-bottom:10px">' +
                '<h3>' + NEG.icon('build') + '建造顺序</h3>' +
                '<span class="panel-note"><b id="progressPct">0</b>%</span>' +
              '</div>' +
              '<div class="progress" style="margin-bottom:12px"><i id="buildProgress"></i></div>' +
              '<ol class="build-steps" id="buildSteps"></ol>' +
            '</section>' +
            '<section class="panel tray-panel anim-fade-up d2">' +
              '<div class="panel-head" style="margin-bottom:10px">' +
                '<h3>' + NEG.icon('keyboard') + '部件库</h3>' +
                '<span class="panel-note">点击 / 拖拽组装</span>' +
              '</div>' +
              '<div class="part-tray" id="partTray"></div>' +
            '</section>' +
            '<section class="panel plant-info anim-fade-up d3" id="plantInfo"></section>' +
            '<section class="panel panel-pad loop-panel anim-fade-up d3">' +
              '<div class="panel-head" style="margin-bottom:10px">' +
                '<h3>' + NEG.icon('radiation') + '回路状态</h3>' +
                '<span class="panel-note">点击查看</span>' +
              '</div>' +
              '<div class="loop-legend" id="loopLegend">' +
                loops.map((l) => (
                  '<button class="loop-btn" data-loop="' + l.id + '" style="--loop-c:' + l.color + '">' +
                    '<span class="loop-dot"></span>' + l.name +
                    '<span class="loop-state">未贯通</span>' +
                  '</button>'
                )).join('') +
              '</div>' +
            '</section>' +
          '</aside>' +
        '</div>' +
        '</div>';

      const exitShell = NEG.shell.full('city');

      const svg = root.querySelector('.plant-svg');
      const stage = root.querySelector('#plantStage');
      const trayEl = root.querySelector('#partTray');
      const stepsEl = root.querySelector('#buildSteps');
      const infoEl = root.querySelector('#plantInfo');
      const progressBar = root.querySelector('#buildProgress');
      const progressPct = root.querySelector('#progressPct');
      const builtCountEl = root.querySelector('#builtCount');
      const loopLegend = root.querySelector('#loopLegend');

      /* 隐藏未建成的部件 */
      svg.querySelectorAll('.part').forEach((el) => el.classList.remove('is-built'));
      svg.querySelectorAll('.slot-group').forEach((el) => el.classList.remove('is-done', 'is-next'));

      function nextPart() {
        return parts.find((p) => !built.has(p.id)) || null;
      }

      function renderSteps() {
        stepsEl.innerHTML = parts.map((p, i) => {
          const done = built.has(p.id);
          const current = !done && nextPart() && nextPart().id === p.id;
          return '<li class="build-step ' + (done ? 'is-done' : current ? 'is-current' : '') + '">' +
            '<span class="step-no">' + (done ? '✓' : String(i + 1).padStart(2, '0')) + '</span>' +
            '<span>' + U.esc(p.short) + '</span>' +
            '<span class="step-tag">' + (p.loop ? LOOP_NAME[p.loop] : '厂房') + '</span>' +
          '</li>';
        }).join('');
        const pct = Math.round(built.size / total * 100);
        progressBar.style.width = pct + '%';
        progressPct.textContent = String(pct);
        builtCountEl.textContent = String(built.size);
      }

      function renderTray() {
        cleanupDrags();
        trayEl.innerHTML = trayOrder.map((item) => {
          if (item.type === 'part') {
            const p = parts.find((q) => q.id === item.id);
            const used = built.has(p.id);
            const c = p.loop ? LOOP_COLOR[p.loop] : '#8fb6d9';
            return '<button class="part-card ' + (used ? 'is-used' : '') + '" data-part="' + p.id + '" type="button" ' +
              'style="--part-c:' + c + '">' +
              '<span class="part-dot" style="background:' + c + '"></span>' + U.esc(p.short) +
            '</button>';
          }
          const d = distractors.find((q) => q.id === item.id);
          return '<button class="part-card is-distractor" data-distractor="' + d.id + '" type="button">' +
            '<span class="part-dot"></span>' + U.esc(d.name) +
          '</button>';
        }).join('');

        trayEl.querySelectorAll('[data-part]').forEach((card) => {
          const partId = card.dataset.part;
          card.addEventListener('click', () => {
            if (card.dataset.suppressClick === '1') return;
            tryBuild(partId);
          });
          makeDraggable(card, () => tryBuild(partId));
        });
        trayEl.querySelectorAll('[data-distractor]').forEach((card) => {
          const id = card.dataset.distractor;
          const d = distractors.find((q) => q.id === id);
          const onWrong = () => {
            audio.play('wrong');
            card.classList.remove('shake');
            void card.offsetWidth;
            card.classList.add('shake');
            store.addScore(-2, 'city');
            ui.toast('「' + d.name + '」不是压水堆核心部件：' + d.note, 'error', { duration: 3400 });
          };
          card.addEventListener('click', () => {
            if (card.dataset.suppressClick === '1') return;
            onWrong();
          });
          makeDraggable(card, onWrong);
        });
      }

      function showInfo(part) {
        if (!part) {
          const np = nextPart();
          infoEl.innerHTML =
            '<span class="info-kicker">BUILD TASK</span>' +
            '<h3>' + (np ? '下一步：' + U.esc(np.name) : '建造完成') + '</h3>' +
            '<p>从堆芯开始，按照能量传递的方向依次拼装：燃料 → 压力容器 → 控制棒 → 蒸汽发生器 → 主泵 → 稳压器 → 安全壳 → 汽轮机 → 发电机 → 冷凝器 → 冷却塔 → 变压器。</p>' +
            '<p class="hint-line">' + NEG.icon('info', 14) + '托盘里混入了 5 张干扰卡，点错会扣 2 分。</p>';
          return;
        }
        const loop = loops.find((l) => l.id === part.loop);
        infoEl.innerHTML =
          '<span class="info-kicker">' + (loop ? 'LOOP ' + part.loop : 'STRUCTURE') + ' · 已建成</span>' +
          '<h3>' + U.esc(part.name) +
            (loop ? '<span class="badge" style="color:' + loop.color + ';border-color:' + loop.color + '55;background:' + loop.color + '14">' + loop.name + '</span>' : '') +
          '</h3>' +
          '<p>' + U.esc(part.role) + '</p>' +
          '<p style="color:var(--text-3);font-size:12px">' + U.esc(part.detail) + '</p>' +
          '<div class="info-fact">' + NEG.icon('bolt', 13) + '<span>' + U.esc(part.fact) + '</span></div>';
      }

      function isLoopLive(loopId) {
        const need = parts.filter((p) => p.loop === loopId);
        return need.length > 0 && need.every((p) => built.has(p.id));
      }

      function updateLoops(announce) {
        [1, 2, 3].forEach((id) => {
          const live = isLoopLive(id);
          svg.querySelectorAll('.flow.l' + id).forEach((el) => el.classList.toggle('is-on', live));
          svg.querySelectorAll('.pipe.l' + id).forEach((el) => el.classList.toggle('is-live', live));
          const btn = loopLegend.querySelector('[data-loop="' + id + '"]');
          if (btn) {
            btn.querySelector('.loop-state').textContent = live ? '已贯通' : '未贯通';
            btn.classList.toggle('is-active', live);
          }
          if (live && announce && !liveState[id]) {
            const loop = loops.find((l) => l.id === id);
            ui.toast(loop.name + '已贯通：' + loop.desc, 'success', { duration: 4200 });
            audio.play('build');
          }
          liveState[id] = live;
        });
      }

      function tryBuild(partId) {
        const part = parts.find((p) => p.id === partId);
        if (!part || built.has(partId)) return;
        const np = nextPart();
        if (!np) return;
        if (np.id !== partId) {
          audio.play('wrong');
          U.vibrate([15, 30, 15]);
          store.addScore(-2, 'city');
          ui.toast('顺序不对：下一步应该建造「' + np.name + '」', 'error');
          const step = stepsEl.querySelector('.is-current');
          if (step) {
            step.classList.remove('shake');
            void step.offsetWidth;
            step.classList.add('shake');
          }
          return;
        }

        /* 正确建造 */
        built.add(partId);
        audio.play('success');
        U.vibrate(25);
        store.addScore(8, 'city');
        store.set((s) => {
          s.modes.city.bestSteps = Math.max(s.modes.city.bestSteps || 0, built.size);
        }, 'city');

        const svgPart = svg.querySelector('.part[data-part="' + partId + '"]');
        if (svgPart) {
          svgPart.classList.add('is-built', 'is-just-built');
          setTimeout(() => svgPart.classList.remove('is-just-built'), 1000);
        }
        const slot = svg.querySelector('.slot-group[data-slot="' + partId + '"]');
        if (slot) slot.classList.add('is-done');

        renderSteps();
        renderTray();
        showInfo(part);
        updateLoops(true);

        /* 高亮下一槽位 */
        const npNext = nextPart();
        svg.querySelectorAll('.slot-group').forEach((g) => g.classList.remove('is-next'));
        if (npNext) {
          const g = svg.querySelector('.slot-group[data-slot="' + npNext.id + '"]');
          if (g) g.classList.add('is-next');
        }

        if (built.size === total) complete();
      }

      /* ---------- 回路查看 ---------- */
      loopLegend.querySelectorAll('[data-loop]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.loop);
          const loop = loops.find((l) => l.id === id);
          audio.play('click');
          focusLoop = focusLoop === id ? null : id;
          [1, 2, 3].forEach((n) => {
            svg.classList.toggle('focus-loop-' + n, focusLoop === n);
            svg.querySelectorAll('.flow.l' + n).forEach((el) => {
              if (focusLoop === n) el.classList.add('is-on');
            });
          });
          loopLegend.querySelectorAll('[data-loop]').forEach((b) => {
            b.classList.toggle('is-active', Number(b.dataset.loop) === focusLoop);
          });
          if (focusLoop) {
            ui.modal({
              eyebrow: 'LOOP ' + loop.id + ' · 回路小课堂',
              title: loop.name,
              html:
                '<p>' + U.esc(loop.desc) + '</p>' +
                '<div class="kpi-row" style="margin-top:16px">' +
                  '<div class="kpi"><b>' + (loop.radioactive ? '有' : '无') + '</b><span>放射性</span></div>' +
                  '<div class="kpi"><b style="font-size:14px">' + U.esc(loop.temp) + '</b><span>温度 / 压力</span></div>' +
                  '<div class="kpi"><b>' + (isLoopLive(loop.id) ? '已贯通' : '未贯通') + '</b><span>建造状态</span></div>' +
                '</div>',
              actions: [
                { label: '关闭', kind: 'ghost', onClick: () => { clearFocus(); } }
              ],
              onClose: () => { if (focusLoop) clearFocus(); }
            });
          }
        });
      });

      function clearFocus() {
        focusLoop = null;
        [1, 2, 3].forEach((n) => {
          svg.classList.remove('focus-loop-' + n);
          svg.querySelectorAll('.flow.l' + n).forEach((el) => {
            el.classList.toggle('is-on', isLoopLive(n));
          });
        });
        loopLegend.querySelectorAll('[data-loop]').forEach((b) => {
          b.classList.toggle('is-active', isLoopLive(Number(b.dataset.loop)));
        });
        updateLoops(false);
      }

      /* ---------- 完成 ---------- */
      function complete() {
        audio.play('fanfare');
        store.addScore(40, 'city');
        store.set((s) => {
          s.modes.city.completed = (s.modes.city.completed || 0) + 1;
          s.modes.city.bestSteps = total;
        }, 'city');
        ctx.achievements.checkAll();

        ui.modal({
          eyebrow: 'CONSTRUCTION COMPLETE · 建成',
          title: '一座压水堆核电站建成！',
          wide: true,
          html:
            '<div class="summary-hero">' +
              '<div class="summary-score">12 / 12</div>' +
              '<div class="summary-label">核心部件全部就位</div>' +
            '</div>' +
            '<p>你已经亲手拼出了压水堆的完整能量路径：</p>' +
            '<div class="kpi-row" style="margin-top:14px">' +
              loops.map((l) => '<div class="kpi"><b style="font-size:13px;color:' + l.color + '">' + l.name + '</b><span>' + U.esc(l.temp) + '</span></div>').join('') +
            '</div>' +
            '<p style="margin-top:16px">记住这条主线：<strong>核裂变 → 一回路高压水 → 蒸汽发生器 → 二回路蒸汽 → 汽轮机 → 发电机 → 电网</strong>。三回路只负责把余热排给环境，全程不接触放射性。</p>' +
            '<div class="data-note">完成奖励 +40 分。切换「回路状态」可以回看每条回路的走向。</div>',
          actions: [
            { label: '返回首页', kind: 'ghost', onClick: () => ctx.go('home') },
            {
              label: '再建一次',
              kind: 'primary',
              icon: 'refresh',
              onClick: () => ctx.go('city', { force: true })
            }
          ]
        });
      }

      /* ---------- 通用拖拽 ---------- */
      function cleanupDrags() {
        dragCleanups.forEach((fn) => fn());
        dragCleanups = [];
      }

      function makeDraggable(card, onDrop) {
        let startX = 0, startY = 0, pointerId = null, ghost = null, dragging = false;
        let clickTimer = null;
        const onDown = (e) => {
          if (pointerId !== null) return;
          if (e.button != null && e.button !== 0) return;
          pointerId = e.pointerId;
          startX = e.clientX; startY = e.clientY; dragging = false;
          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
          document.addEventListener('pointercancel', onUp);
          window.addEventListener('blur', clearDrag);
        };
        const onMove = (e) => {
          if (e.pointerId !== pointerId) return;
          if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
            dragging = true;
            ghost = card.cloneNode(true);
            ghost.classList.add('drag-ghost');
            ghost.style.width = card.offsetWidth + 'px';
            document.body.appendChild(ghost);
            document.body.classList.add('is-dragging');
          }
          if (ghost) {
            ghost.style.left = e.clientX + 'px';
            ghost.style.top = e.clientY + 'px';
            const r = stage.getBoundingClientRect();
            const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            stage.style.outline = over ? '1px solid rgba(56,225,255,.5)' : '';
          }
        };
        const clearDrag = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
          window.removeEventListener('blur', clearDrag);
          if (ghost) ghost.remove();
          ghost = null;
          document.body.classList.remove('is-dragging');
          stage.style.outline = '';
          dragging = false;
          pointerId = null;
        };
        const onUp = (e) => {
          if (pointerId === null || e.pointerId !== pointerId) return;
          const wasDragging = dragging;
          const r = stage.getBoundingClientRect();
          const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
          clearDrag();
          if (wasDragging && e.type !== 'pointercancel') {
            card.dataset.suppressClick = '1';
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { delete card.dataset.suppressClick; }, 300);
            if (over && e.type !== 'pointercancel') onDrop();
          }
        };
        card.addEventListener('pointerdown', onDown);
        dragCleanups.push(() => {
          clearDrag();
          clearTimeout(clickTimer);
          delete card.dataset.suppressClick;
          card.removeEventListener('pointerdown', onDown);
        });
      }

      /* ---------- 工具栏 ---------- */
      root.querySelector('[data-action="reset"]').addEventListener('click', () => {
        audio.play('click');
        ctx.go('city', { force: true });
      });
      root.querySelector('[data-action="hint"]').addEventListener('click', () => {
        audio.play('click');
        const np = nextPart();
        if (np) {
          ui.toast('下一步：' + np.name + '（' + LOOP_NAME[np.loop] + '）', 'info');
          const g = svg.querySelector('.slot-group[data-slot="' + np.id + '"]');
          if (g) {
            const slot = g.querySelector('.slot');
            if (slot) {
              slot.style.stroke = '#38e1ff';
              slot.style.strokeWidth = '2.4';
              g.classList.add('is-next');
              setTimeout(() => {
                slot.style.stroke = '';
                slot.style.strokeWidth = '';
              }, 1600);
            }
          }
        } else {
          ui.toast('所有部件已建成', 'success');
        }
      });

      /* ---------- 初始化 ---------- */
      renderSteps();
      renderTray();
      showInfo(null);
      const np = nextPart();
      if (np) {
        const g = svg.querySelector('.slot-group[data-slot="' + np.id + '"]');
        if (g) g.classList.add('is-next');
      }
      updateLoops(false);
      if (bestSteps > 0 && bestSteps < total) {
        ui.toast('上次建造到第 ' + bestSteps + ' 步，这次继续完成它', 'info');
      }

      return function cleanup() {
        cleanupDrags();
        document.body.classList.remove('is-dragging');
        exitShell();
      };
    }
  });
})(window.NEG);
