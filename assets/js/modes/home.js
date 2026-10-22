import { storySummary } from '../catalog.js';
import '../fullpage.js';
import '../data/rumors.js';

/* ============================================================
   核纪元 · 首页（驾驶舱）
   上下两屏整页翻页：第一屏主视觉，第二屏五大实验室
   ============================================================ */
(function (NEG) {
  'use strict';

  /* 中文数字:首页「N 个实验室」标题按当前可见数量自动生成 */
  const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  NEG.registerMode({
    id: 'home',
    order: 0,
    title: '首页',
    nav: '首页',
    icon: 'home',
    accent: '#38e1ff',
    blurb: '总览你的核能探索进度',

    render(root, ctx) {
      const { store, tasks, achievements, data, ui, util: U } = ctx;
      const state = store.get();
      const achvTotal = achievements.list.length;
      const achvCount = achievements.count();
      const today = U.todayKey();
      const dailyData = state.daily || {};
      const dailyDone = dailyData.date === today && dailyData.done;

      /* 每日一谣：按日期确定，所有人当天看到同一题 */
      const pool = data.rumors || [];
      const dailyRumor = pool.length
        ? pool[U.hashString(today) % pool.length]
        : null;

      const labs = tasks.list().filter((t) => t.id !== 'home' && t.id !== 'main' && !t.hidden);

      /* 主线(认知档案)进度与总量 */
      const storyData = storySummary;
      const storyIds = (storyData && Array.isArray(storyData.order)) ? storyData.order : [];
      const mainState = (state.modes && state.modes.main) || {};
      const mainDoneList = Array.isArray(mainState.completed) ? mainState.completed : [];
      const mainDone = mainDoneList.length;
      const mainCards = Array.isArray(mainState.cards) ? mainState.cards.length : 0;
      let storyCardTotal = 0;
      storyIds.forEach((sid) => {
        const c = storyData ? storyData[sid] : null;
        if (c && Number.isFinite(c.cardCount)) storyCardTotal += c.cardCount;
      });
      const storyTotal = storyIds.length || 8;
      const mainPct = storyTotal ? Math.round((mainDone / storyTotal) * 100) : 0;

      /* 下一个未完成章节 */
      let nextStory = null;
      for (let i = 0; i < storyIds.length; i++) {
        if (mainDoneList.indexOf(storyIds[i]) < 0) { nextStory = { idx: i + 1, id: storyIds[i] }; break; }
      }
      const mainCtaText = !storyIds.length
        ? '开始学习'
        : (nextStory ? (mainDone > 0 ? '继续第 ' + nextStory.idx + ' 章' : '开始学习') : '回顾全部章节');

      /* 第二屏主线区只写「下一章」,数量统计留在首屏,避免重复 */
      const nextChapterTitle = (nextStory && storyData[nextStory.id]) ? (storyData[nextStory.id].title || '') : '';
      /* 章节标题本身已带「第 N 章：」前缀,这里不再重复章号 */
      const mainNote = nextStory
        ? '下一章 · ' + nextChapterTitle
        : (storyIds.length ? '八章主线已全部完成，可回看任意章节' : '主线剧情准备中');

      /* 第二屏：主线学习 + 五个实验室 */
      const labsHTML =
        '<div class="section-head">' +
          '<h2>主线学习</h2>' +
          '<span class="section-note">八章剧情串起核科学全景</span>' +
        '</div>' +
        '<section class="panel panel-pad anim-fade-up" style="margin-bottom:16px">' +
          '<div class="row" style="justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center">' +
            '<div style="min-width:0">' +
              '<h3>' + NEG.icon('book') + ' 认知档案</h3>' +
              '<p class="panel-note" style="margin-top:4px">' + U.esc(mainNote) + '</p>' +
            '</div>' +
            '<button class="btn btn-primary" data-go="main" type="button">' +
              NEG.icon('play', 16) + mainCtaText +
            '</button>' +
          '</div>' +
          '<div class="progress" style="margin-top:10px"><i style="width:' + mainPct + '%"></i></div>' +
        '</section>' +
        '<div class="section-head">' +
          '<h2>' + CN_NUM[labs.length] + '个实验室</h2>' +
          '<span class="section-note">每个模块都能独立玩，进度自动保存</span>' +
        '</div>' +
        '<div class="mode-grid">' +
          labs.map((m, i) => {
            const p = Math.round(tasks.progress(m.id, state) * 100);
            const status = tasks.status(m.id, state);
            const color = m.accent || '#38e1ff';
            return (
              '<button class="mode-tile anim-fade-up d' + Math.min(i + 1, 5) + '" data-go="' + m.id + '" ' +
                'style="--tile-color:' + color + ';--tile-accent:' + color + '33;--tile-icon-bg:' + color + '18;--tile-border:' + color + '3d">' +
                '<span class="tile-top">' +
                  '<span class="tile-icon">' + NEG.icon(m.icon, 21) + '</span>' +
                  '<span class="tile-arrow">' + NEG.icon('arrowRight', 18) + '</span>' +
                '</span>' +
                '<h3>' + U.esc(m.title) + '</h3>' +
                '<p>' + U.esc(m.blurb) + '</p>' +
                '<span class="tile-meta">' +
                  '<span>' + tasks.statusLabel(status) + '</span>' +
                  '<span>·</span>' +
                  '<span>' + p + '%</span>' +
                '</span>' +
                '<span class="tile-progress"><i style="width:' + p + '%"></i></span>' +
              '</button>'
            );
          }).join('') +
        '</div>' +
        '<div class="home-columns">' +
          '<section class="panel daily-card anim-fade-up d2">' +
            '<div class="daily-top">' +
              '<span class="eyebrow">DAILY FACT-CHECK · 每日一谣</span>' +
              '<span class="badge badge-amber">' + today + '</span>' +
            '</div>' +
            (dailyRumor
              ? '<div class="daily-teaser">' + U.esc(dailyRumor.text) + '</div>' +
                '<div id="dailyAnswer">' +
                  (dailyDone
                    ? '<div class="daily-answer">' +
                        '<strong>真相：</strong>' + U.esc(dailyRumor.truth) +
                        '<div class="hint-line" style="margin-top:8px">' + NEG.icon('check') + '今日已揭晓，+5 分</div>' +
                      '</div>'
                    : '') +
                '</div>' +
                '<div class="daily-foot">' +
                  '<span class="badge badge-line">' + U.esc(dailyRumor.topic) + '</span>' +
                  '<span class="badge badge-line">难度 ' + dailyRumor.difficulty + '</span>' +
                  '<span class="spacer"></span>' +
                  (dailyDone
                    ? '<button class="btn btn-quiet btn-sm" data-go="rumor">去题库继续挑战' + NEG.icon('arrowRight', 14) + '</button>'
                    : '<button class="btn btn-sm btn-green" data-action="revealDaily">' + NEG.icon('bolt', 14) + '揭晓真相 +5</button>') +
                '</div>'
              : '<div class="empty">题库数据加载中…</div>') +
          '</section>' +

          '<section class="panel panel-pad anim-fade-up d3">' +
            '<div class="panel-head">' +
              '<h3>' + NEG.icon('trophy') + '成就</h3>' +
              '<button class="btn btn-quiet btn-sm" data-action="allAchv">全部 ' + achvCount + '/' + achvTotal + NEG.icon('arrowRight', 14) + '</button>' +
            '</div>' +
            '<div class="achievement-strip">' +
              achievements.list.slice(0, 6).map((a) => {
                const got = achievements.unlocked(a.id);
                return (
                  '<span class="achv-mini ' + (got ? '' : 'is-locked') + '" title="' + U.esc(a.desc) + '">' +
                    '<span class="achv-icon">' + NEG.icon(a.icon, 14) + '</span>' +
                    U.esc(a.title) +
                  '</span>'
                );
              }).join('') +
            '</div>' +
            '<div class="divider"></div>' +
            '<div class="row wrap" style="gap:8px">' +
              '<button class="btn btn-sm btn-ghost" data-action="share">' + NEG.icon('share', 14) + '生成战绩卡</button>' +
              '<button class="btn btn-sm btn-quiet" data-action="reset">' + NEG.icon('refresh', 14) + '重置进度</button>' +
            '</div>' +
            '<p class="data-note">科学依据来自 IAEA、ICRP、WHO、UNSCEAR 与中国核能行业协会公开资料；剂量为典型量级，仅用于科普。</p>' +
          '</section>' +
        '</div>' +
        '<p class="center dim home-quote" style="margin-top:3px;font-size:12.5px;letter-spacing:.06em">' +
          '科学不是吓人的理由，而是不害怕的底气。' +
        '</p>';

      root.innerHTML =
        '<div class="home-pager" id="homePager">' +
          '<div class="home-track" id="homeTrack">' +

            /* ---------- 第一屏：主视觉，不出现实验室 ---------- */
            '<section class="home-page home-page-hero" data-page="0" data-label="概览">' +
              '<div class="hero anim-fade-up">' +
                '<div class="hero-copy">' +
                  '<span class="eyebrow">核纪元 · 基于虚拟仿真与认知诊断的核科普智慧教育平台</span>' +
                  '<h1>从六维度<br><span class="grad">认识、理解、驾驭核科学技术</span></h1>' +
                  '<p class="hero-sub">8 章剧情 × 6 大维度，从两弹一艇到人造太阳。' +
                    '边读故事边闯关，收集知识卡，最后完成结业答辩。</p>' +
                  '<div class="hero-cta">' +
                    '<button class="btn btn-primary btn-lg" data-go="main">' + NEG.icon('play', 17) + '开始学习</button>' +
                    '<button class="btn btn-ghost btn-lg" data-go="main">' + NEG.icon('book') + '章节一览</button>' +
                  '</div>' +
                  '<div class="hero-stats">' +
                    '<div class="hero-stat"><b>' + mainDone + ' / ' + storyTotal + '</b><span>已完成章节</span></div>' +
                    '<div class="hero-stat"><b>' + mainCards + ' / ' + storyCardTotal + '</b><span>收集知识卡</span></div>' +
                    '<div class="hero-stat"><b data-count="' + (state.score | 0) + '">0</b><span>累计得分</span></div>' +
                    '<div class="hero-stat"><b>' + mainPct + '%</b><span>主线进度</span></div>' +
                  '</div>' +
                '</div>' +
                '<div class="hero-visual" aria-hidden="true">' +
                  '<div class="atom-stage">' +
                    '<span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>' +
                    '<span class="orbit o1"></span><span class="orbit o2"></span><span class="orbit o3"></span>' +
                    '<div class="atom-core"></div>' +
                  '</div>' +
                  '<span class="coords">35.68°N 139.69°E<br>SYS.ONLINE / 100%</span>' +
                '</div>' +
                '<button class="page-hint" type="button" data-action="nextPage">' +
                  '<span>滚动滚轮 · 主线与实验室</span>' +
                  '<i class="hint-arrow" aria-hidden="true"></i>' +
                '</button>' +
              '</div>' +
            '</section>' +

            /* ---------- 第二屏：五大实验室 + 每日一谣 + 成就 ---------- */
            '<section class="home-page home-page-labs" data-page="1" data-label="实验室">' +
              '<div class="home-page-inner">' + labsHTML + '</div>' +
            '</section>' +

          '</div>' +
          '<div class="pager-rail" role="tablist" aria-label="首页分屏">' +
            '<button class="pager-dot is-active" type="button" role="tab" data-page-index="0" aria-current="true">' +
              '<span>概览</span>' +
            '</button>' +
            '<button class="pager-dot" type="button" role="tab" data-page-index="1" aria-current="false">' +
              '<span>实验室</span>' +
            '</button>' +
          '</div>' +
        '</div>';

      /* 外壳：一屏模式（≥900px 生效） */
      const exitShell = NEG.shell.full('home');

      /* 整页翻页器 */
      const pager = NEG.pager.create({
        el: root.querySelector('#homePager'),
        track: root.querySelector('#homeTrack')
      });

      /* 数字滚动 */
      const counter = root.querySelector('[data-count]');
      if (counter) ui.countUp(counter, Number(counter.dataset.count || 0), { duration: 1000 });

      /* 交互 */
      root.querySelectorAll('[data-go]').forEach((btn) => {
        btn.addEventListener('click', () => {
          ctx.audio.play('click');
          ctx.go(btn.dataset.go);
        });
      });

      const onAction = (action, fn) => {
        root.querySelectorAll('[data-action="' + action + '"]').forEach((btn) => {
          btn.addEventListener('click', () => { ctx.audio.play('click'); fn(); });
        });
      };

      onAction('nextPage', () => { if (pager) pager.next(); });

      onAction('share', () => NEG.share.open());

      onAction('reset', () => {
        ui.confirm({
          eyebrow: '危险操作',
          title: '重置全部进度？',
          message: '累计得分、成就、各实验室进度都会被清空，且无法恢复。',
          confirmLabel: '确认重置',
          danger: true
        }).then((ok) => {
          if (!ok) return;
          store.reset();
          ui.toast('进度已重置', 'info');
          ctx.go('home', { force: true });
        });
      });

      onAction('allAchv', () => {
        ui.modal({
          eyebrow: 'ACHIEVEMENTS · 成就墙',
          title: '成就 ' + achievements.count() + ' / ' + achievements.list.length,
          wide: true,
          html: '<div class="achv-full-grid">' +
            achievements.list.map((a) => {
              const got = achievements.unlocked(a.id);
              return '<div class="achv-card ' + (got ? '' : 'is-locked') + '">' +
                '<span class="achv-icon">' + NEG.icon(a.icon, 18) + '</span>' +
                '<div><b>' + U.esc(a.title) + '</b><span>' + U.esc(a.desc) + '</span></div>' +
              '</div>';
            }).join('') +
          '</div>',
          actions: [{ label: '关闭', kind: 'ghost' }]
        });
      });

      const revealBtn = root.querySelector('[data-action="revealDaily"]');
      if (revealBtn && dailyRumor) {
        revealBtn.addEventListener('click', () => {
          const today2 = U.todayKey();
          const st = store.get();
          if (st.daily.date === today2 && st.daily.done) return;
          store.set((s) => {
            s.daily = { date: today2, done: true };
            s.flags.dailyDone = true;
          }, 'daily');
          store.addScore(5, 'daily');
          ctx.audio.play('correct');
          ctx.achievements.checkAll();
          const holder = root.querySelector('#dailyAnswer');
          if (holder) {
            holder.innerHTML = '<div class="daily-answer anim-fade-up">' +
              '<strong>真相：</strong>' + U.esc(dailyRumor.truth) +
              '<div class="explain-text" style="margin-top:10px;font-size:12.5px">' + U.esc(dailyRumor.explain) + '</div>' +
              '<div class="fact-chip" style="margin-top:10px"><span class="fact-label">' + U.esc(dailyRumor.fact.label) + '</span><span class="fact-value">' + U.esc(dailyRumor.fact.value) + '</span></div>' +
            '</div>';
          }
          revealBtn.outerHTML = '<button class="btn btn-quiet btn-sm" data-go="rumor">去题库继续挑战' + NEG.icon('arrowRight', 14) + '</button>';
          const goBtn = root.querySelector('.daily-foot [data-go="rumor"]');
          if (goBtn) goBtn.addEventListener('click', () => ctx.go('rumor'));
        });
      }

      return function cleanup() {
        if (pager) pager.destroy();
        exitShell();
      };
    }
  });
})(window.NEG);
