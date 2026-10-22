import './svg.js';

/* ============================================================
   核纪元 · 压水堆建造核心(共享)
   ------------------------------------------------------------
   一处实现,两处外壳:
     · variant 'page'   导航里的「核电站建造」整页模块
     · variant 'inline' 主线第五章的内嵌关卡

   逻辑(唯一一份):
     12 个部件按 order 拼装 · 5 张干扰卡 · 一 / 二 / 三回路贯通 ·
     拖拽 / 点击两种操作 · 计分与提示

   数据来源:NEG.data.plant { parts, distractors, loops }
   图形来源:NEG.svg.plant()
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const LOOP_NAME = { 1: '一回路', 2: '二回路', 3: '三回路' };
  const LOOP_COLOR = { 1: '#ffab3d', 2: '#38e1ff', 3: '#3ef0a2' };

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  /* ---------------- 整页外壳 ---------------- */
  function pageMarkup(parts, loops, total) {
    return '<div class="mode-page city-page">' +
      '<header class="page-top city-top">' +
        '<div class="pt-brand">' +
          '<span class="eyebrow">CONSTRUCTION SITE · 工程建造</span>' +
          '<h2>' + NEG.icon('build') + '核电站建造</h2>' +
        '</div>' +
        '<span class="lead-inline">从堆芯到电网，按正确顺序拼装 ' + total + ' 个核心部件。</span>' +
        '<div class="pt-tools">' +
          '<span class="badge badge-cyan">建造进度 <b data-built>0</b>/' + total + '</span>' +
          '<button class="btn btn-quiet btn-sm" data-action="hint">' + NEG.icon('info', 13) + '提示</button>' +
          '<button class="btn btn-quiet btn-sm" data-action="reset">' + NEG.icon('refresh', 14) + '重新建造</button>' +
        '</div>' +
      '</header>' +
      '<div class="plant-layout">' +
        '<section class="panel plant-stage anim-fade-up" data-stage aria-label="压水堆剖面建造区">' +
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
              '<span class="panel-note"><b data-pct>0</b>%</span>' +
            '</div>' +
            '<div class="progress" style="margin-bottom:12px"><i data-bar></i></div>' +
            '<ol class="build-steps" data-steps></ol>' +
          '</section>' +
          '<section class="panel tray-panel anim-fade-up d2">' +
            '<div class="panel-head" style="margin-bottom:10px">' +
              '<h3>' + NEG.icon('keyboard') + '部件库</h3>' +
              '<span class="panel-note">拖到剖面图上组装</span>' +
            '</div>' +
            '<div class="part-tray" data-tray></div>' +
          '</section>' +
          '<section class="panel plant-info anim-fade-up d3" data-info></section>' +
          '<section class="panel panel-pad loop-panel anim-fade-up d3">' +
            '<div class="panel-head" style="margin-bottom:10px">' +
              '<h3>' + NEG.icon('radiation') + '回路状态</h3>' +
              '<span class="panel-note">点击查看</span>' +
            '</div>' +
            '<div class="loop-legend" data-loops>' + loopLegend(loops) + '</div>' +
          '</section>' +
        '</aside>' +
      '</div>' +
    '</div>';
  }

  /* ---------------- 内嵌外壳 ---------------- */
  function inlineMarkup(parts, loops, total, intro) {
    return '<div class="game pb-inline">' +
      '<div class="game-head">' +
        '<h3>' + NEG.icon('build', 15) + ' 核电站建造</h3>' +
        '<span class="badge badge-cyan" data-built>0 / ' + total + '</span>' +
      '</div>' +
      (intro ? '<p class="game-intro">' + esc(intro) + '</p>' : '') +
      '<div class="pb-stage" data-stage>' +
        '<div class="pb-svg-wrap">' + NEG.svg.plant() + '</div>' +
      '</div>' +
      '<div class="pb-loops" data-loops>' + loopLegend(loops) + '</div>' +
      '<div class="part-tray pb-tray" data-tray></div>' +
      '<div class="game-foot" data-foot>先点部件库里的部件，再点剖面图上的虚线框放入。</div>' +
    '</div>';
  }

  function loopLegend(loops) {
    return loops.map((l) => (
      '<button class="loop-btn" type="button" data-loop="' + l.id + '" style="--loop-c:' + l.color + '">' +
        '<span class="loop-dot"></span>' + esc(l.name) +
        '<span class="loop-state">未贯通</span>' +
      '</button>'
    )).join('');
  }

  /* ---------------- 挂载 ---------------- */
  function mount(container, opts, ctx) {
    const o = opts || {};
    const variant = o.variant === 'page' ? 'page' : 'inline';
    const useDistractors = o.distractors !== false;
    const noScore = !!o.noScore;          /* 重玩不计分 */

    const { store, ui, audio, util: U } = ctx;
    const data = (ctx.data && ctx.data.plant) ? ctx.data : { plant: (NEG.data && NEG.data.plant) || {} };
    const plant = data.plant || {};
    const allParts = Array.isArray(plant.parts) ? plant.parts.slice() : [];
    const loops = Array.isArray(plant.loops) ? plant.loops : [];
    const distractors = useDistractors && Array.isArray(plant.distractors) ? plant.distractors : [];

    if (!allParts.length) {
      container.innerHTML = '<div class="empty">压水堆部件数据未加载,请刷新页面。</div>';
      return null;
    }

    /* 建造顺序按回路分组:一回路(含安全壳)→ 二回路 → 三回路 → 并网(主变压器)
       同一回路内任意顺序都算对,整组建完才进入下一组 */
    const GROUPS = [
      { id: 1, name: '一回路', color: '#ffab3d' },
      { id: 2, name: '二回路', color: '#38e1ff' },
      { id: 3, name: '三回路', color: '#3ef0a2' },
      { id: 4, name: '并网', color: '#ffc857' }
    ];
    function groupIndexOf(part) {
      if (!part) return 0;
      if (part.id === 'transformer') return 4;   /* 主变压器:并入最后一组 */
      if (part.loop === 2 || part.loop === 3) return part.loop;
      return 1;                                   /* 一回路 + 安全壳(loop 0) */
    }
    const parts = allParts.slice().sort((a, b) => {
      const ga = groupIndexOf(a);
      const gb = groupIndexOf(b);
      if (ga !== gb) return ga - gb;
      return (a.order || 0) - (b.order || 0);
    });
    const total = parts.length;

    function groupParts(gid) {
      return parts.filter((p) => groupIndexOf(p) === gid);
    }
    /* 当前该建哪一组 */
    function currentGroup() {
      for (let i = 0; i < GROUPS.length; i++) {
        const list = groupParts(GROUPS[i].id);
        if (list.some((p) => !built.has(p.id))) return GROUPS[i];
      }
      return null;
    }
    function groupDone(gid) {
      const list = groupParts(gid);
      return list.length > 0 && list.every((p) => built.has(p.id));
    }
    /* 高亮当前这一组里所有还没建的槽位 */
    function highlightNext() {
      const g = currentGroup();
      svg.querySelectorAll('.slot-group').forEach((el) => el.classList.remove('is-next'));
      if (!g) return;
      groupParts(g.id).forEach((p) => {
        if (built.has(p.id)) return;
        const el = svg.querySelector('.slot-group[data-slot="' + p.id + '"]');
        if (el) el.classList.add('is-next');
      });
    }

    const built = new Set();
    let trayOrder = U.shuffle(
      parts.map((p) => ({ type: 'part', id: p.id }))
        .concat(distractors.map((d) => ({ type: 'distractor', id: d.id })))
    );
    let focusLoop = null;
    const liveState = { 1: false, 2: false, 3: false };
    let mistakes = 0;
    let done = false;
    let destroyed = false;
    let selected = null;
    let activeDragCancel = null;
    const timers = new Set();
    const cleanups = [];
    const trayCleanups = [];

    function later(fn, delay) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!destroyed) fn();
      }, delay);
      timers.add(timer);
      return timer;
    }

    function listen(el, type, fn, bucket) {
      el.addEventListener(type, fn);
      (bucket || cleanups).push(() => el.removeEventListener(type, fn));
    }

    function clearTray() {
      trayCleanups.splice(0).forEach((release) => release());
    }

    container.innerHTML = variant === 'page'
      ? pageMarkup(parts, loops, total)
      : inlineMarkup(parts, loops, total, o.intro);

    const svg = container.querySelector('.plant-svg');
    const stage = container.querySelector('[data-stage]');
    const trayEl = container.querySelector('[data-tray]');
    const stepsEl = container.querySelector('[data-steps]');
    const infoEl = container.querySelector('[data-info]');
    const barEl = container.querySelector('[data-bar]');
    const pctEl = container.querySelector('[data-pct]');
    const builtEl = container.querySelector('[data-built]');
    const loopsEl = container.querySelector('[data-loops]');
    const footEl = container.querySelector('[data-foot]');

    if (!svg) {
      container.innerHTML = '<div class="empty">工程图未加载,请刷新页面。</div>';
      return null;
    }

    svg.querySelectorAll('.part').forEach((el) => el.classList.remove('is-built'));
    svg.querySelectorAll('.slot-group').forEach((el) => el.classList.remove('is-done', 'is-next'));
    svg.setAttribute('role', 'group');

    function say(text) {
      if (!destroyed && footEl) footEl.textContent = text;
    }

    /* 当前组里下一个未建部件(用于提示与槽位高亮) */
    function nextPart() {
      const g = currentGroup();
      if (!g) return null;
      return groupParts(g.id).filter((p) => !built.has(p.id))[0] || null;
    }

    /* ---------------- 渲染 ---------------- */
    function renderSteps() {
      if (stepsEl) {
        const cur = currentGroup();
        stepsEl.innerHTML = GROUPS.map((grp) => {
          const list = groupParts(grp.id);
          if (!list.length) return '';
          const doneN = list.filter((p) => built.has(p.id)).length;
          const isCur = !!cur && cur.id === grp.id;
          const isAll = doneN === list.length;
          return '<li class="build-group' + (isCur ? ' is-current' : '') + (isAll ? ' is-done' : '') + '"' +
              ' style="--group-c:' + grp.color + '">' +
            '<div class="bg-head">' +
              '<span class="bg-name">' + esc(grp.name) + '</span>' +
              '<span class="bg-count">' + doneN + ' / ' + list.length + '</span>' +
            '</div>' +
            '<ol class="bg-parts">' +
              list.map((p) => {
                const isDone = built.has(p.id);
                return '<li class="build-step ' + (isDone ? 'is-done' : (isCur ? 'is-current' : '')) + '">' +
                  '<span class="step-no">' + (isDone ? '✓' : '○') + '</span>' +
                  '<span>' + esc(p.short) + '</span>' +
                '</li>';
              }).join('') +
            '</ol>' +
          '</li>';
        }).join('');
      }
      const pct = Math.round((built.size / total) * 100);
      if (barEl) barEl.style.width = pct + '%';
      if (pctEl) pctEl.textContent = String(pct);
      if (builtEl) {
        builtEl.textContent = variant === 'page'
          ? String(built.size)
          : built.size + ' / ' + total;
      }
    }

    function renderTray() {
      clearTray();
      trayEl.innerHTML = trayOrder.map((item) => {
        if (item.type === 'part') {
          const p = parts.filter((q) => q.id === item.id)[0];
          if (!p) return '';
          const used = built.has(p.id);
          const c = p.loop ? LOOP_COLOR[p.loop] : '#8fb6d9';
          return '<button class="part-card ' + (used ? 'is-used' : '') + '" data-part="' + esc(p.id) + '" type="button" aria-pressed="false" ' + (used ? 'disabled ' : '') +
            'style="--part-c:' + c + '">' +
            '<span class="part-dot" style="background:' + c + '"></span>' + esc(p.short) +
          '</button>';
        }
        const d = distractors.filter((q) => q.id === item.id)[0];
        if (!d) return '';
        return '<button class="part-card is-distractor" data-distractor="' + esc(d.id) + '" type="button" aria-pressed="false">' +
          '<span class="part-dot"></span>' + esc(d.name) +
        '</button>';
      }).join('');

      /* 点击或键盘选择部件，再激活对应槽位；拖拽仍走同一落点判定。 */
      trayEl.querySelectorAll('[data-part]').forEach((card) => {
        const partId = card.dataset.part;
        makeDraggable(card, (slotId) => dropPart(partId, slotId), () => selectPart('part', partId));
      });

      trayEl.querySelectorAll('[data-distractor]').forEach((card) => {
        const d = distractors.filter((q) => q.id === card.dataset.distractor)[0];
        if (!d) return;
        makeDraggable(card, (slotId) => dropDistractor(d, slotId), () => selectPart('distractor', d.id));
      });
      updateSelection();
    }

    function updateSelection() {
      trayEl.querySelectorAll('.part-card').forEach((card) => {
        const active = !!selected && (selected.type === 'part' ? card.dataset.part : card.dataset.distractor) === selected.id;
        card.classList.toggle('is-selected', active);
        card.setAttribute('aria-pressed', String(active));
      });
    }

    function selectPart(type, id) {
      if (destroyed || done || (type === 'part' && built.has(id))) return;
      selected = { type, id };
      const item = (type === 'part' ? parts : distractors).filter((p) => p.id === id)[0];
      updateSelection();
      if (item) say('已选择「' + (item.short || item.name) + '」，点击对应槽位，或聚焦槽位后按 Enter / 空格放入。');
    }

    function dropDistractor(item, slotId) {
      if (destroyed || done) return;
      if (!slotId) { say('把部件拖到剖面图上的虚线框里才会生效。'); return; }
      audio.play('wrong');
      const slotEl = svg.querySelector('.slot-group[data-slot="' + slotId + '"] .slot');
      if (slotEl) {
        slotEl.classList.add('is-wrong');
        later(() => slotEl.classList.remove('is-wrong'), 340);
      }
      if (!noScore) store.addScore(-2, 'city');
      ui.toast('「' + item.name + '」不是压水堆核心部件：' + item.note, 'error', { duration: 3400 });
      say('「' + item.name + '」不属于压水堆。');
    }

    svg.querySelectorAll('.slot-group').forEach((group) => {
      const part = parts.filter((p) => p.id === group.dataset.slot)[0];
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', (part ? part.name : group.dataset.slot) + '放置槽位');
      if (group.dataset.slot === 'containment') {
        // 安全壳是开放轮廓；透明宽描边扩大点击范围，不覆盖内部设备。
        const outline = group.querySelector('.slot');
        const hit = outline.cloneNode(false);
        hit.setAttribute('class', 'slot-hit');
        hit.setAttribute('aria-hidden', 'true');
        group.appendChild(hit);
      }
      const activate = () => {
        if (destroyed || done || built.has(group.dataset.slot)) return;
        if (!selected) { say('先在部件库选择一个部件，再放入对应槽位。'); return; }
        if (selected.type === 'part') dropPart(selected.id, group.dataset.slot);
        else {
          const item = distractors.filter((p) => p.id === selected.id)[0];
          if (item) dropDistractor(item, group.dataset.slot);
        }
      };
      listen(group, 'click', activate);
      listen(group, 'keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) activate();
      });
    });

    /* 指针落在哪个槽位上(重叠时取面积最小的那个) */
    function slotAt(x, y) {
      let best = null;
      svg.querySelectorAll('.slot-group').forEach((g) => {
        const shape = g.querySelector('.slot-hit') || g.querySelector('.slot');
        if (!shape) return;
        const r = shape.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
        if (g.dataset.slot === 'containment') {
          try {
            const point = svg.createSVGPoint();
            point.x = x; point.y = y;
            if (!shape.isPointInStroke(point.matrixTransform(shape.getScreenCTM().inverse()))) return;
          } catch (e) {
            // 旧浏览器仍只接受包围框边缘，不能把安全壳内部视为落点。
            if (x > r.left + 8 && x < r.right - 8 && y > r.top + 8 && y < r.bottom - 8) return;
          }
        }
        const area = r.width * r.height;
        if (!best || area < best.area) best = { id: g.dataset.slot, area: area };
      });
      return best ? best.id : null;
    }

    /* 拖放落点判定:必须落在该部件自己的虚线框里 */
    function dropPart(partId, slotId) {
      if (destroyed || done) return;
      const part = parts.filter((p) => p.id === partId)[0];
      if (!part || built.has(partId)) return;

      if (!slotId) {
        audio.play('wrong');
        ui.toast('拖到剖面图里对应的虚线框才会建造', 'info');
        say('把「' + part.short + '」拖到剖面图上它自己的虚线框里。');
        return;
      }

      if (slotId !== partId) {
        audio.play('wrong');
        const slotEl = svg.querySelector('.slot-group[data-slot="' + slotId + '"] .slot');
        if (slotEl) {
          slotEl.classList.add('is-wrong');
          later(() => slotEl.classList.remove('is-wrong'), 340);
        }
        const target = svg.querySelector('.slot-group[data-slot="' + partId + '"] .slot-label');
        say('「' + part.short + '」不属于这个位置。');
        ui.toast('位置不对：把「' + part.short + '」拖到它自己的虚线框', 'error');
        return;
      }

      tryBuild(partId);
    }

    function showInfo(part) {
      if (!infoEl) return;
      if (!part) {
        const np = nextPart();
        infoEl.innerHTML =
          '<span class="info-kicker">BUILD TASK</span>' +
          '<h3>' + (currentGroup() ? '当前：' + esc(currentGroup().name) : '建造完成') + '</h3>' +
          '<p>' + (np
            ? '按回路顺序拼装：先建一回路，再建二回路、三回路，最后并网。同一回路内任意顺序都可以。'
            : '所有核心部件都已就位。') + '</p>' +
          (distractors.length
            ? '<p class="hint-line">' + NEG.icon('info', 14) + '托盘里混入了 ' + distractors.length + ' 张干扰卡，点错会扣 2 分。</p>'
            : '');
        return;
      }
      const loop = loops.filter((l) => l.id === part.loop)[0];
      infoEl.innerHTML =
        '<span class="info-kicker">' + (loop ? 'LOOP ' + part.loop : 'STRUCTURE') + ' · 已建成</span>' +
        '<h3>' + esc(part.name) +
          (loop ? '<span class="badge" style="color:' + loop.color + ';border-color:' + loop.color +
            '55;background:' + loop.color + '14">' + esc(loop.name) + '</span>' : '') +
        '</h3>' +
        '<p>' + esc(part.role) + '</p>' +
        '<p style="color:var(--text-3);font-size:12px">' + esc(part.detail) + '</p>' +
        '<div class="info-fact">' + NEG.icon('bolt', 13) + '<span>' + esc(part.fact) + '</span></div>';
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
        const btn = loopsEl ? loopsEl.querySelector('[data-loop="' + id + '"]') : null;
        if (btn) {
          const stateEl = btn.querySelector('.loop-state');
          if (stateEl) stateEl.textContent = live ? '已贯通' : '未贯通';
          btn.classList.toggle('is-active', live);
        }
        if (live && announce && !liveState[id]) {
          const loop = loops.filter((l) => l.id === id)[0];
          if (loop) {
            ui.toast(loop.name + '已贯通：' + loop.desc, 'success', { duration: 4200 });
            if (footEl) say(loop.name + '已贯通。');
          }
          audio.play('build');
        }
        liveState[id] = live;
      });
    }

    /* ---------------- 建造 ---------------- */
    function tryBuild(partId) {
      if (destroyed || done) return;
      const part = parts.filter((p) => p.id === partId)[0];
      if (!part || built.has(partId)) return;
      const g = currentGroup();
      if (!g) return;

      /* 同一回路内任意顺序都算对,只要还在当前组里 */
      if (groupIndexOf(part) !== g.id) {
        mistakes++;
        audio.play('wrong');
        if (U.vibrate) U.vibrate([15, 30, 15]);
        if (!noScore) store.addScore(-2, 'city');
        ui.toast('顺序不对：先把「' + g.name + '」建完', 'error');
        say('顺序不对：先把「' + g.name + '」这一组建完。');
        if (stepsEl) {
          const step = stepsEl.querySelector('.is-current');
          if (step) {
            step.classList.remove('shake');
            void step.offsetWidth;
            step.classList.add('shake');
          }
        }
        return;
      }

      built.add(partId);
      if (selected && selected.type === 'part' && selected.id === partId) selected = null;
      audio.play('success');
      if (U.vibrate) U.vibrate(25);
      if (!noScore) store.addScore(8, 'city');
      if (variant === 'page') {
        store.set((s) => {
          s.modes.city.bestSteps = Math.max(s.modes.city.bestSteps || 0, built.size);
        }, 'city');
      }

      const svgPart = svg.querySelector('.part[data-part="' + partId + '"]');
      if (svgPart) {
        svgPart.classList.add('is-built', 'is-just-built');
        later(() => svgPart.classList.remove('is-just-built'), 1000);
      }
      const slot = svg.querySelector('.slot-group[data-slot="' + partId + '"]');
      if (slot) {
        slot.classList.add('is-done');
        slot.setAttribute('tabindex', '-1');
        slot.setAttribute('aria-disabled', 'true');
      }

      renderSteps();
      renderTray();
      showInfo(part);
      updateLoops(true);
      say('第 ' + built.size + ' 步就位：' + part.name);

      highlightNext();

      if (built.size === total) complete();
    }

    /* ---------------- 完成 ---------------- */
    function complete() {
      if (destroyed || done) return;
      done = true;
      audio.play('fanfare');
      if (!noScore) store.addScore(40, 'city');

      if (variant === 'page') {
        store.set((s) => {
          s.modes.city.completed = (s.modes.city.completed || 0) + 1;
          s.modes.city.bestSteps = total;
        }, 'city');
      }
      if (ctx.achievements) ctx.achievements.checkAll();

      const result = { ok: true, steps: total, mistakes: mistakes };
      say('一座压水堆建成,能量路径已贯通。');

      if (typeof o.onComplete === 'function') {
        /* 稍留一点时间让最后一步的动效播完 */
        later(() => o.onComplete(result), 700);
      }
      return result;
    }

    /* ---------------- 回路点选 ---------------- */
    function clearFocus() {
      if (destroyed) return;
      focusLoop = null;
      [1, 2, 3].forEach((n) => {
        svg.classList.remove('focus-loop-' + n);
        svg.querySelectorAll('.flow.l' + n).forEach((el) => {
          el.classList.toggle('is-on', isLoopLive(n));
        });
      });
      if (loopsEl) {
        loopsEl.querySelectorAll('[data-loop]').forEach((b) => {
          b.classList.toggle('is-active', isLoopLive(Number(b.dataset.loop)));
        });
      }
      updateLoops(false);
    }

    if (loopsEl) {
      loopsEl.querySelectorAll('[data-loop]').forEach((btn) => {
        listen(btn, 'click', () => {
          const id = Number(btn.dataset.loop);
          const loop = loops.filter((l) => l.id === id)[0];
          if (!loop) return;
          audio.play('click');

          if (variant === 'inline') {
            /* 内嵌模式:只切换高亮,不弹大弹窗 */
            focusLoop = focusLoop === id ? null : id;
            [1, 2, 3].forEach((n) => {
              svg.classList.toggle('focus-loop-' + n, focusLoop === n);
              svg.querySelectorAll('.flow.l' + n).forEach((el) => {
                if (focusLoop === n) el.classList.add('is-on');
                else if (!isLoopLive(n)) el.classList.remove('is-on');
              });
            });
            loopsEl.querySelectorAll('[data-loop]').forEach((b) => {
              b.classList.toggle('is-active', Number(b.dataset.loop) === focusLoop && !!focusLoop);
            });
            say(loop.name + '：' + loop.desc);
            return;
          }

          focusLoop = focusLoop === id ? null : id;
          [1, 2, 3].forEach((n) => {
            svg.classList.toggle('focus-loop-' + n, focusLoop === n);
            svg.querySelectorAll('.flow.l' + n).forEach((el) => {
              if (focusLoop === n) el.classList.add('is-on');
            });
          });
          loopsEl.querySelectorAll('[data-loop]').forEach((b) => {
            b.classList.toggle('is-active', Number(b.dataset.loop) === focusLoop);
          });
          if (focusLoop) {
            ui.modal({
              eyebrow: 'LOOP ' + loop.id + ' · 回路小课堂',
              title: loop.name,
              html:
                '<p>' + esc(loop.desc) + '</p>' +
                '<div class="kpi-row" style="margin-top:16px">' +
                  '<div class="kpi"><b>' + (loop.radioactive ? '有' : '无') + '</b><span>放射性</span></div>' +
                  '<div class="kpi"><b style="font-size:14px">' + esc(loop.temp) + '</b><span>温度 / 压力</span></div>' +
                  '<div class="kpi"><b>' + (isLoopLive(loop.id) ? '已贯通' : '未贯通') + '</b><span>建造状态</span></div>' +
                '</div>',
              actions: [{ label: '关闭', kind: 'ghost', onClick: clearFocus }],
              onClose: () => { if (focusLoop) clearFocus(); }
            });
          }
        });
      });
    }

    /* ---------------- 拖拽 ---------------- */
    function makeDraggable(card, onDrop, onSelect) {
      let startX = 0, startY = 0, pointerId = null, ghost = null, dragging = false;
      let suppressClick = false;
      const onDown = (e) => {
        if (destroyed || done || card.disabled || pointerId !== null || activeDragCancel) return;
        if (e.button != null && e.button !== 0) return;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        dragging = false;
        activeDragCancel = clearDrag;
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
          /* 高亮指针下命中的槽位,告诉玩家会落到哪里 */
          const sid = slotAt(e.clientX, e.clientY);
          svg.querySelectorAll('.slot-group .slot').forEach((sl) => sl.classList.remove('is-hover'));
          if (sid) {
            const sl = svg.querySelector('.slot-group[data-slot="' + sid + '"] .slot');
            if (sl) sl.classList.add('is-hover');
          }
          stage.style.outline = '';
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
        svg.querySelectorAll('.slot-group .slot').forEach((sl) => sl.classList.remove('is-hover'));
        dragging = false;
        pointerId = null;
        if (activeDragCancel === clearDrag) activeDragCancel = null;
      };
      const onUp = (e) => {
        if (pointerId === null || e.pointerId !== pointerId) return;
        const dropped = dragging && e.type !== 'pointercancel';
        const slotId = dropped ? slotAt(e.clientX, e.clientY) : null;
        clearDrag();
        if (dropped) {
          suppressClick = true;
          later(() => { suppressClick = false; }, 0);
          onDrop(slotId);
        }
      };
      listen(card, 'pointerdown', onDown, trayCleanups);
      listen(card, 'click', (event) => {
        if (suppressClick) { event.preventDefault(); return; }
        if (!card.disabled) onSelect();
      }, trayCleanups);
      trayCleanups.push(clearDrag);
    }

    /* ---------------- 工具栏(page) ---------------- */
    const hintBtn = container.querySelector('[data-action="hint"]');
    if (hintBtn) {
      listen(hintBtn, 'click', () => {
        audio.play('click');
        const cur = currentGroup();
        if (!cur) { ui.toast('所有部件已建成', 'success'); return; }
        const left = groupParts(cur.id).filter((p) => !built.has(p.id));
        ui.toast('当前：' + cur.name + '（还需 ' + left.length + ' 件，任意顺序）', 'info');
        const np = left[0];
        const g = np ? svg.querySelector('.slot-group[data-slot="' + np.id + '"]') : null;
        if (g) {
          const slot = g.querySelector('.slot');
          if (slot) {
            slot.style.stroke = '#38e1ff';
            slot.style.strokeWidth = '2.4';
            g.classList.add('is-next');
            later(() => {
              slot.style.stroke = '';
              slot.style.strokeWidth = '';
            }, 1600);
          }
        }
      });
    }

    const resetBtn = container.querySelector('[data-action="reset"]');
    if (resetBtn) {
      listen(resetBtn, 'click', () => {
        audio.play('click');
        if (typeof o.onRestart === 'function') o.onRestart();
        else ctx.go('city', { force: true });
      });
    }

    /* ---------------- 初始化 ---------------- */
    renderSteps();
    renderTray();
    showInfo(null);
    highlightNext();
    updateLoops(false);

    return {
      el: container,
      isComplete() { return done; },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (activeDragCancel) activeDragCancel();
        clearTray();
        cleanups.splice(0).forEach((release) => release());
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
        document.body.classList.remove('is-dragging');
        container.innerHTML = '';
      }
    };
  }

  NEG.plantBuild = { mount: mount };
})(window.NEG);
