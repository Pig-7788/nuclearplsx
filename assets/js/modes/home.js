/* ============================================================
   核纪元 · 首页（驾驶舱）
   ============================================================ */
(function (NEG) {
  'use strict';

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
      const stat = tasks.stats(state);
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

      const labs = tasks.list().filter((t) => t.id !== 'home');

      root.innerHTML =
        '<div class="hero anim-fade-up">' +
          '<div class="hero-copy">' +
            '<span class="eyebrow">INTERACTIVE NUCLEAR LAB · 交互式核能实验室</span>' +
            '<h1>把核电站<br><span class="grad">拆开、建好、再启动</span></h1>' +
            '<p class="hero-sub">识破 32 条辐射谣言，拼装一座压水堆，亲手把它开到满功率。' +
              '零依赖、可离线、支持鼠标 / 触屏 / 键盘。</p>' +
            '<div class="hero-cta">' +
              '<button class="btn btn-primary btn-lg" data-go="rumor">' + NEG.icon('play', 17) + '开始探索</button>' +
              '<button class="btn btn-ghost btn-lg" data-action="help">' + NEG.icon('book') + '怎么玩</button>' +
            '</div>' +
            '<div class="hero-stats">' +
              '<div class="hero-stat"><b data-count="' + (state.score | 0) + '">0</b><span>累计得分</span></div>' +
              '<div class="hero-stat"><b>' + achvCount + ' / ' + achvTotal + '</b><span>成就解锁</span></div>' +
              '<div class="hero-stat"><b>' + stat.done + ' / ' + stat.total + '</b><span>实验室完成</span></div>' +
              '<div class="hero-stat"><b>' + Math.round(stat.percent) + '%</b><span>综合进度</span></div>' +
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
        '</div>' +

        /* 模块网格 */
        '<section class="section-block" id="modeGrid">' +
          '<div class="section-head">' +
            '<h2>五个实验室</h2>' +
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
        '</section>' +

        /* 每日一谣 + 成就 */
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

        '<p class="center dim" style="margin-top:34px;font-size:12.5px;letter-spacing:.06em">' +
          '科学不是吓人的理由，而是不害怕的底气。' +
        '</p>';

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

      onAction('help', () => {
        document.getElementById('helpBtn').click();
      });

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

      return function cleanup() { /* 首页无长驻监听 */ };
    }
  });
})(window.NEG);
