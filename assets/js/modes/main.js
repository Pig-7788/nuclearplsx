import '../fullpage.js';
import '../data/stories/index.js';
import '../lesson-loaders.js';

/* ============================================================
   核纪元 · 主线模式(认知档案)
   ------------------------------------------------------------
   读取 window.NEG.story 中的 8 章剧情数据,统一驱动:
     · 章节一览(解锁判定 / 章节进度)
     · 固定操作栏的阅读区(优先分页、长内容保留字号并区域滚动)
     · 知识卡收集与存档

   分页模型:
     章节 → 内容块(幕标题 / 段落 / 选项 / 关卡)
     → 按可用高度实测分页,放不下就自动开新一页
     页数与页容量在渲染时实测,窗口变化后重新分页

   具体玩法不在这里实现 —— 按 action.target_module 交给
   main-plays.js 的注册表派发,本模块不认识任何具体玩法。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  /* 章节图标:按 module_type 映射 */
  const CHAPTER_ICON = {
    narrative: 'book',
    narrative_puzzle: 'build',
    narrative_deduction: 'search',
    narrative_trigger: 'bolt',
    narrative_pipeline: 'trend',
    final_summary: 'trophy'
  };

  /* 章节卡片配色 */
  const TILE_COLORS = [
    '#38e1ff', '#ff8a8a', '#a78bfa', '#3ef0a2',
    '#ffc857', '#38e1ff', '#ff6b6b', '#a78bfa'
  ];


  /* 拿不到布局信息时的兜底分页预算 */
  const CHAR_BUDGET = 340;
  const EXTRA_COST = 70;

  const STATUS_TEXT = { done: '已完成', doing: '进行中', open: '可进入', locked: '未解锁' };

  /* ---------- 剧情数据访问 ---------- */

  function story() {
    const s = NEG.story;
    return s && Array.isArray(s.order) && s.order.length ? s : null;
  }

  function chapterIds() {
    const s = story();
    return s ? s.order.slice() : [];
  }

  function chapterOf(id) {
    const s = story();
    return (s && s[id]) || null;
  }

  function cardTotal() {
    let n = 0;
    chapterIds().forEach((id) => {
      const ch = chapterOf(id);
      if (ch && Array.isArray(ch.knowledge_cards)) n += ch.knowledge_cards.length;
    });
    return n;
  }

  function completedCount(state) {
    const mode = state.modes && state.modes.main;
    const completed = new Set(mode && Array.isArray(mode.completed) ? mode.completed : []);
    return chapterIds().filter((id) => completed.has(id)).length;
  }

  /* ---------- 内容块 ---------- */

  function pushSceneBlocks(out, sc) {
    if (!sc) return;
    out.push({ type: 'p', text: sc.text || '', emphasis: !!sc.emphasis });
    const it = sc.interaction;
    if (it && it.type === 'choice' && Array.isArray(it.options)) {
      out.push({ type: 'choice', data: it });
    }
    const act = sc.action;
    if (act && act.type === 'launch_module') {
      out.push({ type: 'action', data: act });
    }
  }

  function blocksOf(ch) {
    const out = [];
    if (!ch) return out;
    if (ch.learning_route) out.push({ type: 'route' });
    if (Array.isArray(ch.acts) && ch.acts.length) {
      ch.acts.forEach((act) => {
        const scenes = Array.isArray(act.scenes) ? act.scenes : [];
        if (!scenes.length) return;
        out.push({ type: 'act', title: act.subtitle || act.title || '' });
        scenes.forEach((sc) => pushSceneBlocks(out, sc));
      });
    } else {
      const list = ch.narrative && Array.isArray(ch.narrative.scenes) ? ch.narrative.scenes : [];
      list.forEach((sc) => pushSceneBlocks(out, sc));
    }
    /* 章节自带的关卡(gameplay)排在正文之后,与场景内 action 走同一条发起路径 */
    if (ch.gameplay && ch.gameplay.type) {
      out.push({ type: 'gameplay', data: ch.gameplay });
    }
    if (ch.extra_gameplay && ch.extra_gameplay.type) {
      out.push({ type: 'gameplay', data: ch.extra_gameplay });
    }
    if (!ch.gameplay && ch.module_type === 'final_summary') {
      /* 终章:统计 + 结业答辩 + 证书,由 final_summary 玩法统一驱动 */
      out.push({ type: 'gameplay', data: { type: 'final_summary', title: ch.title || '' } });
    }
    return out;
  }

  /* 连续的点题段落(emphasis)必须留在同一屏,这里返回这一段的结束下标 */
  function runEnd(blocks, i) {
    if (!blocks[i] || blocks[i].type !== 'p' || !blocks[i].emphasis) return i;
    let end = i;
    while (end + 1 < blocks.length && blocks[end + 1].type === 'p' && blocks[end + 1].emphasis) end++;
    return end;
  }

  function blockCost(b) {
    if (b.type === 'p') return String(b.text || '').length;
    if (b.type === 'route') return 360;
    return EXTRA_COST;
  }

  function chunkByChars(blocks) {
    if (!blocks.length) return [];
    const pages = [];
    let start = 0;
    let acc = 0;
    for (let i = 0; i < blocks.length; i++) {
      const end = runEnd(blocks, i);
      let cost = 0;
      for (let k = i; k <= end; k++) cost += blockCost(blocks[k]);

      const isEmphasis = blocks[i].type === 'p' && blocks[i].emphasis;
      if ((acc + cost > CHAR_BUDGET || isEmphasis) && i > start) {
        pages.push([start, i - 1]);
        start = i;
        acc = 0;
      }
      acc += cost;

      i = end;
    }
    if (start < blocks.length) pages.push([start, blocks.length - 1]);
    return pages.length ? pages : [[0, blocks.length - 1]];
  }

  /**
   * 按容器可用高度实测分页。
   * 拿不到布局信息(高度为 0)时退化为按字数估算。
   */
  function paginate(blocks, stage, renderBlock) {
    if (!blocks.length) return [];
    if (!stage || !stage.clientHeight || stage.clientHeight < 40) {
      return chunkByChars(blocks);
    }

    const limit = stage.clientHeight;
    /* 一次插入整章，再批量读布局；避免每个段落都触发一次同步重排。 */
    const groups = [];
    let html = '';
    for (let i = 0; i < blocks.length; i++) {
      const end = runEnd(blocks, i);
      let chunk = '';
      for (let k = i; k <= end; k++) chunk += renderBlock(blocks[k]);
      const emphasis = blocks[i].type === 'p' && blocks[i].emphasis;
      if (chunk) {
        html += emphasis ? '<div class="main-emphasis-group">' + chunk + '</div>' : chunk;
        groups.push({ start: i, end, emphasis });
      }
      i = end;
    }
    stage.innerHTML = '<div data-probe style="overflow:hidden;flex:none;visibility:hidden">' + html + '</div>';
    const probe = stage.firstElementChild;
    if (!probe) return chunkByChars(blocks);
    const children = Array.from(probe.children);
    groups.forEach((group, i) => {
      const el = children[i];
      group.top = el.offsetTop;
      group.bottom = el.offsetTop + el.offsetHeight;
      if (el.tagName !== 'P') group.bottom += parseFloat(getComputedStyle(el).marginBottom) || 0;
    });
    const pages = [];
    let start = 0;
    let top = groups.length ? groups[0].top : 0;
    groups.forEach((group) => {
      if ((group.emphasis || group.bottom - top > limit) && group.start > start) {
        pages.push([start, group.start - 1]);
        start = group.start;
        top = group.top;
      }
    });
    if (start < blocks.length) pages.push([start, blocks.length - 1]);

    stage.innerHTML = '';
    return pages.length ? pages : chunkByChars(blocks);
  }

  /* ---------- 存档 ---------- */

  function ensure(ctx) {
    const s = ctx.store.get();
    if (!s.modes.main) s.modes.main = {};
    const m = s.modes.main;
    if (!Array.isArray(m.completed)) m.completed = [];
    const validIds = new Set(chapterIds());
    m.completed = Array.from(new Set(m.completed.filter((id) => validIds.has(id))));
    if (!Array.isArray(m.cards)) m.cards = [];
    if (!m.games || typeof m.games !== 'object' || Array.isArray(m.games)) m.games = {};
    if (!m.rumors || typeof m.rumors !== 'object' || Array.isArray(m.rumors)) m.rumors = { debunked: 0, correct: 0 };
    if (!m.current || !chapterOf(m.current)) m.current = chapterIds()[0] || null;
    if (!Number.isFinite(m.panelIndex) || m.panelIndex < 0) m.panelIndex = 0;
    if (typeof m.attitude_baseline === 'undefined') m.attitude_baseline = null;
    if (typeof m.certificate !== 'boolean') m.certificate = false;
    return m;
  }

  /* ---------- 解锁判定 ---------- */

  function unlockNeed(ch) {
    const cond = ch && ch.unlock_condition;
    if (!cond || cond === 'none') return null;
    return String(cond).replace(/_completed$/, '');
  }

  function isUnlocked(ch, completed) {
    const need = unlockNeed(ch);
    if (!need) return true;
    return completed.indexOf(need) >= 0;
  }

  function clampInt(v, min, max) {
    const n = Math.round(Number(v) || 0);
    return Math.min(max, Math.max(min, n));
  }

  /* 关卡记档键:同一玩法在不同章节各算一次(如 ch04 / ch07 都用打假) */
  function gameKey(chId, type) {
    return String(chId || '') + '::' + String(type || '');
  }

  /* ============================================================
     模块注册
     ============================================================ */
  NEG.registerMode({
    id: 'main',
    order: 0.5,
    title: '认知档案',
    nav: '认知档案',
    icon: 'book',
    accent: '#38e1ff',
    blurb: '八章主线,从核科学的历史沿革走到结业答辩。',

    progress(s) {
      const total = chapterIds().length;
      return total ? completedCount(s) / total : 0;
    },

    isComplete(s) {
      const total = chapterIds().length;
      return total > 0 && completedCount(s) >= total;
    },

    render(root, ctx) {
      const { store, ui, util: U } = ctx;

      if (!story()) {
        root.innerHTML = '<div class="empty">主线剧情数据未加载,请刷新页面。</div>';
        return function () {};
      }

      const exitShell = NEG.shell.full('main');

      let keyHandler = null;
      let resizeHandler = null;
      let playCleanup = null;
      let repaint = null;
      let resizeTimer = null;
      let chapterVersion = 0;
      const readingSizes = { standard: 18, large: 21, extra: 24 };
      function readingSize() {
        const key = (store.get().settings || {}).readingSize;
        return Object.hasOwn(readingSizes, key) ? key : 'standard';
      }
      function applyReadingSize() {
        root.style.setProperty('--main-fs', readingSizes[readingSize()] + 'px');
      }
      function fontControl() {
        return '<label class="main-font-control">字号 <select data-reading-size aria-label="阅读字号">' +
          '<option value="standard">标准</option><option value="large">大</option><option value="extra">特大</option></select></label>';
      }
      function bindFontControl() {
        const select = root.querySelector('[data-reading-size]');
        if (!select) return;
        select.value = readingSize();
        select.addEventListener('change', () => {
          const key = select.value;
          if (!Object.hasOwn(readingSizes, key)) return;
          const state = store.get();
          state.settings = state.settings || {};
          state.settings.readingSize = key;
          store.save();
          applyReadingSize();
          if (repaint) repaint();
        });
      }
      applyReadingSize();

      function stopPlay() {
        const cleanup = playCleanup;
        playCleanup = null;
        if (cleanup) {
          try { cleanup(); } catch (e) { /* noop */ }
        }
      }

      function detach() {
        chapterVersion++;
        clearTimeout(resizeTimer);
        resizeTimer = null;
        if (keyHandler) {
          document.removeEventListener('keydown', keyHandler);
          keyHandler = null;
        }
        if (resizeHandler) {
          window.removeEventListener('resize', resizeHandler);
          resizeHandler = null;
        }
        stopPlay();
        repaint = null;
      }

      function goMenu() {
        detach();
        renderMenu();
      }

      function openChapter(id, fromPage) {
        detach();
        renderChapter(id, fromPage);
      }

      /* ---- 内容块 → HTML ---- */
      function blockHTML(b, m, chId, isPageLast) {
        if (!b) return '';

        if (b.type === 'act') {
          return '<div class="main-act"><span class="badge badge-amber">' +
            U.esc(b.title) + '</span></div>';
        }

        if (b.type === 'p') {
          if (b.emphasis) {
            return '<p class="main-emphasis">' + U.esc(b.text) + '</p>';
          }
          return '<p>' + U.esc(b.text) + '</p>';
        }

        if (b.type === 'choice') {
          const it = b.data;
          const field = it.save_to_db_field || 'attitude_baseline';
          const picked = m[field];
          const opts = it.options.map((op) => {
            const isOn = picked === op;
            return '<button class="btn btn-sm ' + (isOn ? 'btn-primary' : 'btn-ghost') + '"' +
              ' type="button" data-choice="' + U.esc(op) + '" data-field="' + U.esc(field) + '"' +
              (picked ? ' disabled' : '') + '>' + U.esc(op) + '</button>';
          }).join('');
          let note = '';
          if (picked) {
            note = '<div class="me-note">' + NEG.icon('check', 13) + ' 已记录你的选择。</div>';
          } else if (it.mandatory === false) {
            note = '<div class="me-note">' + NEG.icon('info', 13) + ' 不选也可以继续。</div>';
          }
          return '<div class="main-extra' + (isPageLast ? ' is-bottom' : '') + '">' +
            (it.prompt ? '<div class="me-row"><span class="panel-note">' + U.esc(it.prompt) + '</span></div>' : '') +
            '<div class="me-opts">' + opts + '</div>' + note +
          '</div>';
        }

        if (b.type === 'route') {
          const ids = chapterIds();
          const doneSet = new Set(Array.isArray(m.completed) ? m.completed : []);
          return '<div class="main-route">' +
            '<div class="mr-head">' +
              '<span class="eyebrow">LEARNING ROUTE · 学习路线</span>' +
              '<h3>八章认知档案</h3>' +
              '<p class="panel-note">先记住自己的起点，再沿着八个章节一步步建立判断力。终章会回看你的变化。</p>' +
            '</div>' +
            '<div class="mr-grid">' + ids.map((cid, i) => {
              const c = chapterOf(cid) || {};
              const done = doneSet.has(cid);
              const t = String(c.title || cid).replace(/^第[一二三四五六七八九十]+章：/, '').replace(/^总览：/, '');
              return '<div class="mr-item' + (done ? ' is-done' : '') + '">' +
                '<span class="mr-no">' + String(i + 1).padStart(2, '0') + '</span>' +
                '<span class="mr-text"><b>' + U.esc(t) + '</b>' +
                  '<small>' + U.esc(String(c.summary || '').slice(0, 52)) + '</small></span>' +
                (done ? '<span class="mr-done">已完成</span>' : '') +
              '</div>';
            }).join('') + '</div>' +
          '</div>';
        }

        /* 关卡不再渲染入口卡片:翻到末页点按钮即开局,打完自动回正文 */
        if (b.type === 'action' || b.type === 'gameplay') {
          return '';
        }

        return '';
      }

      /* --------------------------------------------------------
         视图 1:章节一览(整页单屏,不滚动)
         -------------------------------------------------------- */
      function renderMenu() {
        const m = ensure(ctx);
        const ids = chapterIds();
        const total = ids.length;
        const done = m.completed.length;
        const cards = m.cards.length;
        const allCards = cardTotal();

        let contId = null;
        for (let i = 0; i < ids.length; i++) {
          const ch = chapterOf(ids[i]);
          if (m.completed.indexOf(ids[i]) < 0 && isUnlocked(ch, m.completed)) {
            contId = ids[i];
            break;
          }
        }

        let contBlock;
        if (!contId) {
          contBlock =
            '<div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">' +
              '<div>' +
                '<h3>' + NEG.icon('trophy') + ' 主线已全部完成</h3>' +
                '<p class="panel-note" style="margin-top:4px">八章认知档案已经整理完毕,可以回看任意章节。</p>' +
              '</div>' +
              '<span class="badge badge-green">' + done + ' / ' + total + ' 章</span>' +
            '</div>';
        } else {
          const idx = ids.indexOf(contId) + 1;
          const ch = chapterOf(contId);
          const started = m.current === contId || done > 0;
          contBlock =
            '<div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">' +
              '<div>' +
                '<h3>' + NEG.icon('play') + ' ' + (started ? '继续第 ' + idx + ' 章' : '开始第一章') + '</h3>' +
                '<p class="panel-note" style="margin-top:4px">' + U.esc(ch.title || '') + '</p>' +
              '</div>' +
              '<button class="btn btn-primary" type="button" data-resume="' + U.esc(contId) + '">' +
                NEG.icon('play', 16) + (started ? '继续学习' : '开始学习') +
              '</button>' +
            '</div>';
        }

        const cardsHTML = ids.map((id, i) => {
          const ch = chapterOf(id) || {};
          const isDone = m.completed.indexOf(id) >= 0;
          const open = isUnlocked(ch, m.completed);
          const isDoing = !isDone && open && m.current === id && m.panelIndex > 0;
          const status = isDone ? 'done' : isDoing ? 'doing' : open ? 'open' : 'locked';
          const color = TILE_COLORS[i % TILE_COLORS.length];
          const icon = CHAPTER_ICON[ch.module_type] || 'book';
          const cardCount = Array.isArray(ch.knowledge_cards) ? ch.knowledge_cards.length : 0;
          const pct = isDone ? 100 : (open ? (isDoing ? 35 : 0) : 0);

          return '<button class="main-card"' +
            ' type="button" data-chapter="' + U.esc(id) + '"' +
            (open ? '' : ' disabled') +
            ' style="--tile-color:' + color + ';--tile-border:' + color + '3d">' +
            '<span class="mc-head">' +
              '<span class="mc-no">CH.' + (i + 1) + '</span>' +
              '<span class="mc-ico">' + NEG.icon(open ? 'arrowRight' : 'close', 15) + '</span>' +
            '</span>' +
            '<span class="mc-title">' + U.esc(ch.title || id) + '</span>' +
            '<span class="mc-desc">' + U.esc(ch.summary || '') + '</span>' +
            '<span class="mc-meta">' +
              '<span>' + STATUS_TEXT[status] + '</span><span>·</span>' +
              '<span>' + cardCount + ' 卡</span>' +
            '</span>' +
            '<span class="mc-bar"><i style="width:' + pct + '%"></i></span>' +
          '</button>';
        }).join('');

        root.innerHTML =
          '<div class="main-page">' +
            '<header class="main-top">' +
              '<div class="main-id">' +
                '<span class="eyebrow">MAIN STORY · 主线学习</span>' +
                '<h2>' + NEG.icon('book') + ' 认知档案</h2>' +
              '</div>' +
              '<div class="main-tools">' +
                fontControl() +
                '<span class="badge badge-cyan">已完成 ' + done + ' / ' + total + '</span>' +
                '<span class="badge badge-line">知识卡 ' + cards + ' / ' + allCards + '</span>' +
              '</div>' +
            '</header>' +
            '<p class="main-font-hint">开始前可在上方调整字号，学习中也能随时更改；长内容可在阅读区域内滚动。</p>' +
            '<div class="panel panel-pad main-continue">' + contBlock + '</div>' +
            '<div class="main-grid">' + cardsHTML + '</div>' +
          '</div>';
        bindFontControl();

        const resumeBtn = root.querySelector('[data-resume]');
        if (resumeBtn) {
          resumeBtn.addEventListener('click', () => {
            ctx.audio.play('click');
            openChapter(resumeBtn.dataset.resume);
          });
        }
        ui.qsa('[data-chapter]', root).forEach((btn) => {
          btn.addEventListener('click', () => {
            if (btn.disabled) return;
            ctx.audio.play('click');
            openChapter(btn.dataset.chapter, 0);
          });
        });
      }

      /* --------------------------------------------------------
         视图 2:阅读(单屏,正文不出滚动条)
         -------------------------------------------------------- */
      function renderChapter(id, fromPage) {
        const ch = chapterOf(id);
        if (!ch) { renderMenu(); return; }

        const blocks = blocksOf(ch);
        if (!blocks.length) { renderMenu(); return; }

        const m = ensure(ctx);
        const icon = CHAPTER_ICON[ch.module_type] || 'book';

        root.innerHTML =
          '<div class="main-page">' +
            '<header class="main-top">' +
              '<div class="main-id">' +
                '<span class="eyebrow">' + U.esc(ch.module_id || '') + '</span>' +
                '<h2>' + NEG.icon(icon) + ' ' + U.esc(ch.title || id) + '</h2>' +
              '</div>' +
              '<div class="main-tools">' +
                fontControl() +
                '<span class="badge badge-line" id="mainStep">1 / 1</span>' +
                '<button class="btn btn-quiet btn-sm" type="button" data-action="menu">' +
                  NEG.icon('home', 14) + ' 章节一览</button>' +
                '<button class="btn btn-quiet btn-sm" type="button" data-action="skip">' +
                  NEG.icon('arrowRight', 14) + ' 跳过本章</button>' +
              '</div>' +
            '</header>' +
            '<div id="mainBody" style="flex:1 1 auto;min-height:0;overflow:hidden"></div>' +
          '</div>';
        bindFontControl();

        const body = root.querySelector('#mainBody');
        const stepEl = root.querySelector('#mainStep');

        body.innerHTML =
          '<div class="main-read">' +
            '<div class="main-text" id="mainText"></div>' +
            '<div class="main-bar" id="mainBar"></div>' +
          '</div>';

        let textEl = root.querySelector('#mainText');
        let barEl = root.querySelector('#mainBar');

        const renderBlock = (b, isPageLast) => blockHTML(b, m, id, isPageLast);

        let pages = paginate(blocks, textEl, renderBlock);
        const resumable = m.current === id && fromPage == null;
        let index = resumable ? m.panelIndex : (fromPage || 0);
        index = clampInt(index, 0, Math.max(0, pages.length - 1));
        let finished = false;
        let inGame = false;
        /* 本次进入本章后已经开过的关卡;离开章节即清空,于是重进章节会再次自动进入 */
        const playedNow = {};

        root.querySelector('[data-action="menu"]').addEventListener('click', () => {
          ctx.audio.play('click');
          savePosition();
          goMenu();
        });
        root.querySelector('[data-action="skip"]').addEventListener('click', () => {
          ctx.audio.play('click');
          finishChapter(true);
        });

        function savePosition() {
          m.current = id;
          m.panelIndex = index;
          store.save();
        }

        function bindBlocks() {
          ui.qsa('[data-choice]', textEl).forEach((btn) => {
            btn.addEventListener('click', () => {
              if (btn.disabled) return;
              m[btn.dataset.field] = btn.dataset.choice;
              store.save();
              ctx.audio.play('click');
              paintCurrent();
            });
          });
        }

        function renderBar() {
          const isLast = index + 1 >= pages.length;
          const pending = isLast ? pendingGame() : null;
          barEl.innerHTML =
            '<div class="mb-left">' +
              (index > 0
                ? '<button class="btn btn-quiet btn-sm" type="button" data-action="prev">上一页</button>'
                : '') +
              '<span class="hint-line">' + NEG.icon('keyboard', 13) +
                (pending ? ' Enter 进入关卡' : ' Enter 翻页') + '</span>' +
            '</div>' +
            '<button class="btn btn-primary" type="button" data-action="next">' +
              (isLast ? (pending ? '进入关卡' : '完成本章') : '下一页') + NEG.icon('arrowRight', 16) +
            '</button>';

          const nextBtn = barEl.querySelector('[data-action="next"]');
          if (nextBtn) nextBtn.addEventListener('click', () => { ctx.audio.play('click'); advance(); });
          const prevBtn = barEl.querySelector('[data-action="prev"]');
          if (prevBtn) prevBtn.addEventListener('click', () => { ctx.audio.play('click'); back(); });
        }

        /* 翻页 / 开局进场动画:dir=1 向后翻,dir=-1 向前翻 */
        function animateIn(el, dir) {
          if (!el || document.body.classList.contains('reduce-motion')) return;
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          if (typeof el.animate === 'function') {
            el.getAnimations().forEach((animation) => animation.cancel());
            el.animate([
              { opacity: 0.55, transform: 'translate3d(' + (dir < 0 ? -14 : 14) + 'px,0,0)' },
              { opacity: 1, transform: 'none' }
            ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
          }
        }

        function paintCurrent(dir) {
          const page = pages[index];
          if (!page) { finishChapter(); return; }

          savePosition();
          if (stepEl) stepEl.textContent = (index + 1) + ' / ' + pages.length;

          let html = '';
          let buf = '';
          for (let i = page[0]; i <= page[1]; i++) {
            const blk = blocks[i];
            if (blk.type === 'p' && blk.emphasis) {
              buf += renderBlock(blk, false);      /* 章末点题先攒着 */
              continue;
            }
            if (buf) { html += '<div class="main-emphasis-group">' + buf + '</div>'; buf = ''; }
            html += renderBlock(blk, i === page[1]);
          }
          if (buf) html += '<div class="main-emphasis-group">' + buf + '</div>';
          textEl.innerHTML = html;

          bindBlocks();
          renderBar();
          textEl.scrollTop = 0;
          animateIn(textEl, dir || 1);
        }

        /* 本章还有未通关的关卡时返回其类型,供「下一页」自动进入 */
        function pendingGame() {
          for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.type !== 'action' && b.type !== 'gameplay') continue;
            const type = b.type === 'gameplay'
              ? (b.data && b.data.type ? b.data.type : '')
              : (b.data && b.data.target_module ? b.data.target_module : '');
            if (!type) continue;
            if (!(NEG.mainPlays && NEG.mainPlays.has(type))) continue;
            if (playedNow[type]) continue;     /* 本次已完成,不再重复进入 */
            return type;
          }
          return null;
        }

        function advance() {
          if (finished || inGame) return;
          if (index + 1 >= pages.length) {
            /* 末页:先把还没过的关卡放出来,全部过关后才结算本章 */
            const g = pendingGame();
            if (g) { startPlay(g); return; }
            finishChapter();
            return;
          }
          index++;
          paintCurrent(1);
        }

        function back() {
          if (finished || inGame) return;
          if (index <= 0) return;
          index--;
          paintCurrent(-1);
        }

        function startPlay(type, payloadOverride) {
          if (!NEG.mainPlays || !NEG.mainPlays.has(type)) {
            ui.toast('该关卡尚未接入', 'info');
            return;
          }

          /* payload:开场关卡显式传入,场景内 action.payload,或章节自带 gameplay 对象 */
          let payload = payloadOverride || {};
          if (!payloadOverride) blocks.forEach((b) => {
            if (b.type === 'action' && b.data && b.data.target_module === type) {
              payload = b.data.payload || {};
            } else if (b.type === 'gameplay' && b.data && b.data.type === type) {
              payload = b.data;
            }
          });
          /* 终章需要整章数据(统计项 / 答辩题 / 证书) */
          if (type === 'final_summary') payload = ch;

          inGame = true;
          savePosition();
          /* 已通关过的关卡重玩时不再计分,避免刷分 */
          const replay = !!m.games[gameKey(id, type)];
          body.innerHTML = '<div class="main-read"><div class="game-host" id="mainPlayHost"></div></div>';
          const host = root.querySelector('#mainPlayHost');

          function backToReading() {
            inGame = false;
            body.innerHTML =
              '<div class="main-read">' +
                '<div class="main-text" id="mainText"></div>' +
                '<div class="main-bar" id="mainBar"></div>' +
              '</div>';
            textEl = root.querySelector('#mainText');
            barEl = root.querySelector('#mainBar');
            paintCurrent();
          }

          animateIn(host, 1);

          const version = chapterVersion;
          const cleanup = NEG.mainPlays.mount(type, host, payload, ctx, (result) => {
            if (version !== chapterVersion || finished || !inGame) return;
            stopPlay();
            if (result === false || (result && result.ok === false)) {
              ui.toast('关卡尚未完成，可以再次尝试', 'info');
              backToReading();
              return;
            }
            playedNow[type] = true;
            m.games[gameKey(id, type)] = result || { ok: true };
            if (type === 'final_summary' && result && result.certificate === true) m.certificate = true;
            store.save();
            if (type === 'final_summary') {
              /* 终章:答辩与证书走完,本章直接结算 */
              finishChapter(false);
              return;
            }
            ui.toast('关卡完成', 'success');
            backToReading();
          }, { replay: replay });

          if (inGame && !finished) playCleanup = cleanup;
          else if (cleanup) cleanup();

          if (!cleanup && inGame && !finished) {
            /* 玩法挂载失败:退回阅读态,不留白屏 */
            backToReading();
          }
        }

        /* 章末小结:固定单屏 */
        function finishChapter(skipped) {
          if (finished) return;
          finished = true;
          inGame = false;
          stopPlay();
          clearTimeout(resizeTimer);
          resizeTimer = null;
          repaint = null;
          const cards = Array.isArray(ch.knowledge_cards) ? ch.knowledge_cards : [];
          let fresh = 0;
          cards.forEach((c) => {
            if (c && c.id && m.cards.indexOf(c.id) < 0) { m.cards.push(c.id); fresh++; }
          });
          if (m.completed.indexOf(id) < 0) m.completed.push(id);

          const nextId = ch.next_module_id && chapterOf(ch.next_module_id) ? ch.next_module_id : null;
          if (nextId) {
            m.current = nextId;
            m.panelIndex = 0;
          } else {
            m.current = id;
            m.panelIndex = Math.max(0, pages.length - 1);
          }
          store.save();
          ctx.achievements.checkAll();
          ctx.audio.play(skipped ? 'click' : 'fanfare');

          const nextCh = nextId ? chapterOf(nextId) : null;

          body.innerHTML =
            '<div class="main-done">' +
              '<div class="md-body" id="mainDone">' +
                '<span class="eyebrow">CHAPTER COMPLETE</span>' +
                '<div class="md-title">' + NEG.icon('check', 20) + ' ' +
                  U.esc(ch.title || id) + ' · ' + (skipped ? '已跳过' : '已完成') + '</div>' +
                (ch.summary
                  ? '<p class="md-summary">' + U.esc(ch.summary) + '</p>'
                  : '') +
                (cards.length
                  ? '<div class="md-sub">' + NEG.icon('book', 14) + ' 本章知识卡' +
                    (fresh ? ' · 新增 ' + fresh + ' 张' : ' · 已收集') + '</div>' +
                    '<div class="main-cards">' +
                      cards.map((c, ci) => (
                        '<div class="mc-card anim-fade-up d' + Math.min(ci + 1, 5) + '">' +
                          '<b>' + U.esc(c.title || '') + '</b>' +
                          '<span>' + U.esc(c.content || '') + '</span>' +
                        '</div>'
                      )).join('') +
                    '</div>'
                  : '') +
              '</div>' +
              '<div class="main-bar" id="mainBarDone">' +
                '<button class="btn btn-ghost" type="button" data-action="menu">' +
                  NEG.icon('home', 15) + ' 章节一览</button>' +
                (nextCh
                  ? '<button class="btn btn-primary" type="button" data-action="nextChapter">' +
                    '下一章' + NEG.icon('arrowRight', 16) + '</button>'
                  : '<button class="btn btn-primary" type="button" data-action="menu">' +
                    '返回章节一览' + NEG.icon('arrowRight', 16) + '</button>') +
              '</div>' +
            '</div>';

          if (stepEl) stepEl.textContent = '完成';

          const doneWrap = root.querySelector('.main-done');
          if (doneWrap && !document.body.classList.contains('reduce-motion')) {
            doneWrap.classList.add('is-completing');
          }

          const barDone = root.querySelector('#mainBarDone');
          ui.qsa('[data-action="menu"]', barDone).forEach((btn) => {
            btn.addEventListener('click', () => { ctx.audio.play('click'); goMenu(); });
          });
          const nextBtn = barDone.querySelector('[data-action="nextChapter"]');
          if (nextBtn) {
            nextBtn.addEventListener('click', () => {
              ctx.audio.play('click');
              openChapter(nextId, 0);
            });
          }
        }

        /* 窗口变化后重新分页,尽量停留在同一段内容 */
        function repaginate() {
          if (inGame || finished) return;
          const page = pages[index];
          const anchor = page ? page[0] : 0;
          /* 重新分页前清掉上一轮的字号压缩,按基准字号重新评估 */
          if (textEl && textEl.style && textEl.style.removeProperty) {
            textEl.style.removeProperty('--main-fs');
          }
          pages = paginate(blocks, textEl, renderBlock);
          let next = -1;
          for (let i = 0; i < pages.length; i++) {
            if (anchor >= pages[i][0] && anchor <= pages[i][1]) { next = i; break; }
          }
          index = next >= 0 ? next : Math.min(index, pages.length - 1);
          if (index < 0) index = 0;
          paintCurrent();
        }

        repaint = repaginate;

        resizeHandler = function () {
          if (inGame || finished) return;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            if (repaint) repaint();
          }, 160);
        };
        window.addEventListener('resize', resizeHandler);

        keyHandler = (e) => {
          if (inGame) return;            /* 关卡进行中不响应翻页键 */
          if (U.isTyping(e)) return;
          if (document.querySelector('.overlay')) return;
          // Preserve native keyboard scrolling when a large-font paragraph spans the reading area.
          if (textEl && textEl.scrollHeight > textEl.clientHeight + 1) {
            if (['ArrowDown', 'PageDown', ' '].includes(e.key) && textEl.scrollTop + textEl.clientHeight < textEl.scrollHeight - 1) return;
            if (['ArrowUp', 'PageUp'].includes(e.key) && textEl.scrollTop > 0) return;
          }
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            advance();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            back();
          }
        };
        document.addEventListener('keydown', keyHandler);

        paintCurrent();

        /* 开场关卡（如前测）：未完成时先于正文启动；完成后自动回到阅读 */
        const opening = ch.opening_gameplay;
        if (opening && opening.type && NEG.mainPlays && NEG.mainPlays.has(opening.type) &&
            !m.games[gameKey(id, opening.type)]) {
          startPlay(opening.type, opening);
        }
      }

      renderMenu();

      return function cleanup() {
        detach();
        exitShell();
      };
    }
  });
})(window.NEG);
