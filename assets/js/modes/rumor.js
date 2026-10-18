/* ============================================================
   核纪元 · 辟谣实验室
   拖拽 / 点击 / 键盘三种作答方式，32 条题库，4 大分类
   ============================================================ */
(function (NEG) {
  'use strict';

  const CATS = {
    daily: { name: '日常辐射', icon: '🏠' },
    safety: { name: '核电站与安全', icon: '🏭' },
    frontier: { name: '核科学前沿', icon: '🔬' },
    china: { name: '中国核电', icon: '🇨🇳' }
  };
  const ROUND_SIZE = 10;

  function categoryCounts(pool) {
    const out = { all: pool.length };
    pool.forEach((r) => { out[r.category] = (out[r.category] || 0) + 1; });
    return out;
  }

  NEG.registerMode({
    id: 'rumor',
    order: 1,
    title: '辟谣实验室',
    nav: '辟谣实验室',
    icon: 'search',
    accent: '#ff8a8a',
    blurb: '识破 32 条流传甚广的核辐射谣言，学会用剂量与机制思考。',
    progress(s) {
      return Math.min(1, (s.modes.rumor.seen || []).length / 32);
    },
    isComplete(s) {
      return (s.modes.rumor.seen || []).length >= 32;
    },

    render(root, ctx) {
      const { store, data, ui, audio, util: U } = ctx;
      const all = data.rumors || [];
      const state = store.get();
      const seenBefore = new Set(state.modes.rumor.seen || []);
      let filter = 'all';
      let cleanupFns = [];
      let activeKeyCleanup = null;

      /* ---------- 会话 ---------- */
      let session = null;
      let ended = false;

      function poolFor(f) {
        return f === 'all' ? all.slice() : all.filter((r) => r.category === f);
      }

      function buildSession(f) {
        ended = false;
        const pool = poolFor(f);
        const unseen = pool.filter((r) => !seenBefore.has(r.id));
        const picked = U.shuffle(unseen).concat(U.shuffle(pool.filter((r) => seenBefore.has(r.id))));
        const questions = picked.slice(0, Math.min(ROUND_SIZE, picked.length));
        return {
          questions,
          index: 0,
          correct: 0,
          wrong: 0,
          earned: 0,
          streak: 0,
          bestStreak: 0,
          answered: false,
          order: []
        };
      }

      /* ---------- 骨架 ---------- */
      const counts = categoryCounts(all);
      root.innerHTML =
        ui.pageHead({
          eyebrow: 'FACT-CHECK LAB · 事实核查',
          icon: 'search',
          title: '辟谣实验室',
          lead: '读一条社交媒体谣言，从三张科普卡片中选出唯一正确的结论。拖拽、点击或键盘 <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 都可以作答。',
          tools: '<span class="badge badge-line">题库 ' + all.length + ' 条</span>' +
                 '<span class="badge badge-line">已答 ' + seenBefore.size + ' 条</span>'
        }) +
        '<div class="rumor-hud">' +
          '<div class="chip-row" id="catChips">' +
            ['all', 'daily', 'safety', 'frontier', 'china'].map((c) => {
              const label = c === 'all' ? '全部' : CATS[c].name;
              return '<button class="chip ' + (c === 'all' ? 'is-active' : '') + '" data-cat="' + c + '">' +
                (c === 'all' ? '🌐 ' : CATS[c].icon + ' ') + U.esc(label) +
                ' <span class="chip-count">' + (counts[c] || 0) + '</span></button>';
            }).join('') +
          '</div>' +
          '<button class="btn btn-quiet btn-sm" data-action="restart">' + NEG.icon('refresh', 14) + '换一组</button>' +
        '</div>' +
        '<div class="panel session-panel anim-fade-up">' +
          '<div class="session-meta">第 <b id="qIndex">1</b> / <b id="qTotal">10</b> 题</div>' +
          '<div class="progress"><i id="qProgress"></i></div>' +
          '<span class="streak-badge" id="streakBadge">🔥 连对 0</span>' +
          '<div class="session-meta">本轮 <b id="roundScore">0</b> 分</div>' +
        '</div>' +
        '<div class="rumor-stage" id="stage"></div>' +
        '<div id="resultSlot"></div>';

      const stage = root.querySelector('#stage');
      const resultSlot = root.querySelector('#resultSlot');
      const qIndexEl = root.querySelector('#qIndex');
      const qTotalEl = root.querySelector('#qTotal');
      const progressEl = root.querySelector('#qProgress');
      const roundScoreEl = root.querySelector('#roundScore');
      const streakEl = root.querySelector('#streakBadge');

      /* ---------- 渲染一道题 ---------- */
      function renderQuestion() {
        if (activeKeyCleanup) { activeKeyCleanup(); activeKeyCleanup = null; }
        const q = session.questions[session.index];
        if (!q) return finish();
        session.answered = false;
        session.order = U.shuffle([{ text: q.truth, correct: true }].concat(
          q.distractors.map((d) => ({ text: d, correct: false }))
        ));

        stage.innerHTML =
          '<div class="post anim-fade-up">' +
            '<div class="post-top">' +
              '<span class="avatar">👤</span>' +
              '<span class="post-meta">' +
                '<b>热心网友 <span class="badge badge-red">疑似谣言</span></b>' +
                '<span>刚刚 · 来自「家族群」 · 转发 10万+</span>' +
              '</span>' +
            '</div>' +
            '<div class="post-text">' + U.esc(q.text) + '</div>' +
            '<div class="post-foot">' +
              '<span>💬 2.3 万评论</span><span>🔁 转发 8.7 万</span><span>❤️ 点赞 15 万</span>' +
            '</div>' +
            '<div class="rumer-tag">' + NEG.icon('alert', 14) + '核查提示：先想想“这是哪种辐射？剂量有多大？”再作答。</div>' +
          '</div>' +
          '<div class="answer-head">' +
            '<h3>' + NEG.icon('target', 17) + '哪张科普卡片能驳倒它？</h3>' +
            '<span class="answer-hint">拖到核查区，或直接点击</span>' +
          '</div>' +
          '<div class="dropzone answer-drop" id="dropzone">' +
            NEG.icon('share', 16) + '<span>把正确的科普卡片拖到这里松手</span>' +
          '</div>' +
          '<div class="answer-grid" id="answers">' +
            session.order.map((opt, i) => (
              '<button class="answer-card" data-option="' + i + '" type="button">' +
                '<span class="answer-letter">' + 'ABC'[i] + '</span>' +
                '<span class="answer-text">' + U.esc(opt.text) + '</span>' +
                '<span class="answer-state">' + NEG.icon(opt.correct ? 'check' : 'x', 13) + '</span>' +
              '</button>'
            )).join('') +
          '</div>';

        resultSlot.innerHTML = '';
        resultSlot.className = '';

        qIndexEl.textContent = String(session.index + 1);
        qTotalEl.textContent = String(session.questions.length);
        progressEl.style.width = ((session.index) / session.questions.length * 100) + '%';
        roundScoreEl.textContent = String(session.earned);
        streakEl.textContent = '🔥 连对 ' + session.streak;
        streakEl.classList.toggle('is-hot', session.streak >= 3);

        bindAnswers();

        /* 键盘 1/2/3 */
        const keyHandler = (e) => {
          if (session.answered) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextQuestion(); }
            return;
          }
          if (U.isTyping(e)) return;
          const idx = ['1', '2', '3'].indexOf(e.key);
          if (idx >= 0 && idx < session.order.length) {
            e.preventDefault();
            select(idx);
          }
        };
        document.addEventListener('keydown', keyHandler);
        activeKeyCleanup = () => document.removeEventListener('keydown', keyHandler);
      }

      /* ---------- 作答 ---------- */
      function select(index) {
        if (session.answered) return;
        const q = session.questions[session.index];
        const opt = session.order[index];
        if (!opt) return;
        session.answered = true;
        audio.play(opt.correct ? 'correct' : 'wrong');
        U.vibrate(opt.correct ? 30 : [20, 40, 20]);

        const cards = ui.qsa('.answer-card', stage);
        cards.forEach((card, i) => {
          card.classList.add('is-locked');
          const o = session.order[i];
          if (o.correct) card.classList.add('is-correct');
          else if (i === index) card.classList.add('is-wrong');
          else card.classList.add('is-dimmed');
          if (i === index) card.classList.add('is-selected');
        });

        if (opt.correct) {
          session.correct++;
          session.streak++;
          session.bestStreak = Math.max(session.bestStreak, session.streak);
          const bonus = Math.min(session.streak, 5) * 2;
          const gain = 10 + bonus;
          session.earned += gain;
          store.addScore(gain, 'rumor');
        } else {
          session.wrong++;
          session.streak = 0;
          session.earned -= 3;
          store.addScore(-3, 'rumor');
        }

        store.set((s) => {
          s.modes.rumor.answered = (s.modes.rumor.answered || 0) + 1;
          if (opt.correct) s.modes.rumor.correct = (s.modes.rumor.correct || 0) + 1;
          const seen = new Set(s.modes.rumor.seen || []);
          seen.add(q.id);
          s.modes.rumor.seen = Array.from(seen);
          s.flags.bestStreak = Math.max(s.flags.bestStreak || 0, session.bestStreak);
        }, 'rumor');

        qIndexEl.textContent = String(session.index + 1);
        progressEl.style.width = ((session.index + 1) / session.questions.length * 100) + '%';
        roundScoreEl.textContent = String(session.earned);
        streakEl.textContent = '🔥 连对 ' + session.streak;
        streakEl.classList.toggle('is-hot', session.streak >= 3);

        renderResult(q, opt);
        ctx.achievements.checkAll();
      }

      function renderResult(q, opt) {
        const delta = opt.correct ? ('+' + (10 + Math.min(session.streak, 5) * 2) + ' 分') : '-3 分';
        resultSlot.innerHTML =
          '<div class="result-panel ' + (opt.correct ? 'is-success' : 'is-fail') + ' anim-fade-up">' +
            '<div class="verdict-row">' +
              '<span class="verdict-stamp ' + (opt.correct ? 'ok' : 'bad') + '">' +
                (opt.correct ? '✓ 判断正确' : '✗ 判断错误') + '</span>' +
              '<h3>' + (opt.correct ? '这是一条谣言，你识破了它' : '差一点，这条才是正确的') + '</h3>' +
              '<span class="badge ' + (opt.correct ? 'badge-green' : 'badge-red') + '">' + delta + '</span>' +
            '</div>' +
            '<p class="truth-line">' + U.esc(q.truth) + '</p>' +
            '<p class="explain-text">' + U.esc(q.explain) + '</p>' +
            '<div class="row wrap" style="gap:8px">' +
              '<span class="fact-chip"><span class="fact-label">' + U.esc(q.fact.label) + '</span>' +
                '<span class="fact-value">' + U.esc(q.fact.value) + '</span></span>' +
              '<span class="badge badge-line">' + CATS[q.category].icon + ' ' + CATS[q.category].name + '</span>' +
              '<span class="badge badge-line">难度 ' + q.difficulty + '</span>' +
            '</div>' +
            (q.sources && q.sources.length
              ? '<div class="sources">' + q.sources.map((src) => (
                  '<span class="source-item">' + U.esc(src.name) +
                  (src.url ? ' · <a href="' + U.esc(src.url) + '" target="_blank" rel="noopener">链接</a>' : '') +
                  '</span>'
                )).join('') + '</div>'
              : '') +
            '<div class="result-actions">' +
              '<span class="hint-line">' + NEG.icon('keyboard', 14) + '按 Enter 继续</span>' +
              '<span class="spacer"></span>' +
              '<button class="btn btn-primary" data-action="next">' +
                (session.index + 1 >= session.questions.length ? '查看本轮成绩' : '下一题') +
                NEG.icon('arrowRight', 16) + '</button>' +
            '</div>' +
          '</div>';

        resultSlot.querySelector('[data-action="next"]').addEventListener('click', (e) => {
          e.stopPropagation();
          audio.play('click');
          nextQuestion();
        });
      }

      /* ---------- 下一题 / 结算 ---------- */
      function nextQuestion() {
        if (!session.answered || ended) return;
        if (session.index + 1 >= session.questions.length) return finish();
        session.index++;
        renderQuestion();
        const post = stage.querySelector('.post');
        if (post) post.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      function finish() {
        if (ended) return;
        ended = true;
        const total = session.questions.length;
        const done = session.correct + session.wrong;
        const accuracy = done ? Math.round(session.correct / done * 100) : 0;
        const perfect = session.wrong === 0 && done > 0;

        store.set((s) => {
          s.modes.rumor.sessions = (s.modes.rumor.sessions || 0) + 1;
          s.modes.rumor.bestSession = Math.max(s.modes.rumor.bestSession || 0, session.earned);
          if (perfect) s.flags.perfectSession = true;
        }, 'rumor');
        ctx.achievements.checkAll();
        if (perfect) audio.play('fanfare');

        const handle = ui.modal({
          eyebrow: 'ROUND COMPLETE · 本轮结算',
          title: perfect ? '全部答对，火眼金睛！' : '本轮辟谣完成',
          wide: false,
          html:
            '<div class="summary-hero">' +
              '<div class="summary-score">' + session.earned + '</div>' +
              '<div class="summary-label">本轮得分</div>' +
            '</div>' +
            '<div class="summary-stats">' +
              '<div class="kpi"><b>' + session.correct + '/' + done + '</b><span>答对题数</span></div>' +
              '<div class="kpi"><b>' + accuracy + '%</b><span>正确率</span></div>' +
              '<div class="kpi"><b>' + session.bestStreak + '</b><span>最高连对</span></div>' +
            '</div>' +
            '<p class="panel-note" style="margin-top:14px;text-align:center">' +
              (perfect ? '这一轮没有误判。继续保持！' : '答错不会卡关，解析才是这个模式真正的奖励。') +
            '</p>',
          actions: [
            { label: '返回首页', kind: 'ghost', onClick: () => ctx.go('home') },
            {
              label: '再来一组',
              kind: 'primary',
              icon: 'refresh',
              onClick: () => { session = buildSession(filter); renderQuestion(); }
            }
          ]
        });
        return handle;
      }

      /* ---------- 拖拽 / 点击 ---------- */
      function bindAnswers() {
        const dropzone = stage.querySelector('#dropzone');
        const cards = ui.qsa('.answer-card', stage);

        cards.forEach((card) => {
          let startX = 0, startY = 0, pointerId = null, ghost = null, dragging = false, suppressClick = false;

          const onPointerDown = (e) => {
            if (session.answered) return;
            if (e.button != null && e.button !== 0) return;
            pointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            dragging = false;
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
          };

          const onPointerMove = (e) => {
            if (e.pointerId !== pointerId) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!dragging && Math.hypot(dx, dy) > 8) {
              dragging = true;
              ghost = card.cloneNode(true);
              ghost.classList.add('drag-ghost');
              ghost.style.width = card.offsetWidth + 'px';
              ghost.style.left = e.clientX + 'px';
              ghost.style.top = e.clientY + 'px';
              document.body.appendChild(ghost);
              document.body.classList.add('is-dragging');
            }
            if (ghost) {
              ghost.style.left = e.clientX + 'px';
              ghost.style.top = e.clientY + 'px';
              const over = isOverDropzone(e.clientX, e.clientY, dropzone);
              dropzone.classList.toggle('is-over', over);
            }
          };

          const onPointerUp = (e) => {
            if (pointerId !== null && e.pointerId !== pointerId) return;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            if (ghost) ghost.remove();
            ghost = null;
            document.body.classList.remove('is-dragging');
            dropzone.classList.remove('is-over');

            if (dragging) {
              suppressClick = true;
              setTimeout(() => { suppressClick = false; }, 260);
              if (isOverDropzone(e.clientX, e.clientY, dropzone)) {
                select(Number(card.dataset.option));
              }
            }
            dragging = false;
            pointerId = null;
          };

          card.addEventListener('pointerdown', onPointerDown);
          card.addEventListener('click', (e) => {
            if (suppressClick) { e.preventDefault(); return; }
            select(Number(card.dataset.option));
          });
          cleanupFns.push(() => {
            card.removeEventListener('pointerdown', onPointerDown);
          });
        });
      }

      function isOverDropzone(x, y, dropzone) {
        if (!dropzone) return false;
        const r = dropzone.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      }

      /* ---------- 筛选 / 重开 ---------- */
      root.querySelectorAll('[data-cat]').forEach((chip) => {
        chip.addEventListener('click', () => {
          filter = chip.dataset.cat;
          audio.play('click');
          root.querySelectorAll('[data-cat]').forEach((c) => c.classList.toggle('is-active', c === chip));
          session = buildSession(filter);
          renderQuestion();
        });
      });

      root.querySelector('[data-action="restart"]').addEventListener('click', () => {
        audio.play('click');
        session = buildSession(filter);
        renderQuestion();
        ui.toast('已换一组新题', 'info');
      });

      /* ---------- 启动 ---------- */
      if (!all.length) {
        stage.innerHTML = '<div class="empty">题库加载失败，请刷新页面。</div>';
      } else {
        session = buildSession(filter);
        renderQuestion();
      }

      return function cleanup() {
        if (activeKeyCleanup) { activeKeyCleanup(); activeKeyCleanup = null; }
        cleanupFns.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
        cleanupFns = [];
        document.body.classList.remove('is-dragging');
      };
    }
  });
})(window.NEG);
