/* ============================================================
   核纪元 · 主线关卡:核谣言粉碎机(打假)
   ------------------------------------------------------------
   数据来源:assets/js/data/rumor-packs.js → window.NEG.data.rumorPacks[pack_id]
   触发来源:章节场景内 action { target_module:'rumor_debunking_game',
                               payload:{ rumor_pack_id } }

   视觉与交互完全沿用「辟谣实验室」(modes/rumor.js)的样式:
     .post 社交媒体卡片 → .answer-card 科普卡 → .result-panel 核查结论
   差异只在于题库来自 RUMORS.js,每题是「一对一错」两张卡。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  function packOf(payload) {
    const id = (payload && (payload.rumor_pack_id || payload.pack_id)) || '';
    const packs = (NEG.data && NEG.data.rumorPacks) || {};
    const list = packs[id];
    return { id: id, list: Array.isArray(list) ? list : [] };
  }

  NEG.mainPlays.register('rumor_debunking_game', {
    label: '核谣言粉碎机',

    mount(container, payload, ctx, done, opts) {
      const U = NEG.util || {};
      const replay = !!(opts && opts.replay);
      const pack = packOf(payload);
      const list = pack.list;

      if (!list.length) {
        container.innerHTML =
          '<div class="empty">题库「' + esc(pack.id || '未知') + '」未加载,请刷新页面。</div>';
        return null;
      }

      const score = (ctx.store && ctx.store.get) ? ctx.store.get() : null;

      let idx = 0;
      let correct = 0;
      let streak = 0;
      let answered = false;
      let solved = false;

      container.innerHTML =
        '<div class="game db-game">' +
          '<div class="game-head">' +
            '<h3>' + NEG.icon('search', 15) + ' 核谣言粉碎机</h3>' +
            '<span class="badge badge-line" data-pos></span>' +
          '</div>' +
          '<div class="game-body db-body">' +
            '<div class="db-stage" data-stage></div>' +
          '</div>' +
          '<div class="game-foot" data-foot></div>' +
        '</div>';

      const stageEl = container.querySelector('[data-stage]');
      const footEl = container.querySelector('[data-foot]');
      const posEl = container.querySelector('[data-pos]');

      function say(html) {
        if (footEl) footEl.innerHTML = html;
      }

      function fitIt() {
        if (NEG.mainPlays && NEG.mainPlays.fit) NEG.mainPlays.fit(stageEl, null, 10);
      }

      /* ---------------- 出题 ---------------- */
      function renderQuestion() {
        answered = false;
        const q = list[idx] || {};
        if (posEl) posEl.textContent = '第 ' + (idx + 1) + ' / ' + list.length + ' 题';

        const opts = [
          { text: q.correct_card || '', ok: true },
          { text: q.wrong_card || '', ok: false }
        ];
        const order = U.shuffle ? U.shuffle(opts) : opts;

        stageEl.className = 'db-stage';
        stageEl.innerHTML =
          /* 社交媒体谣言卡片(与辟谣实验室一致) */
          '<div class="post anim-fade-up">' +
            '<div class="post-top">' +
              '<span class="avatar">👤</span>' +
              '<span class="post-meta">' +
                '<b>热心网友 <span class="badge badge-red">疑似谣言</span></b>' +
                '<span>刚刚 · 来自「家族群」 · 转发 10万+</span>' +
              '</span>' +
            '</div>' +
            '<div class="post-text">' + esc(q.rumor_card || '') + '</div>' +
            '<div class="post-foot">' +
              '<span>💬 2.3 万评论</span><span>🔁 转发 8.7 万</span><span>❤️ 点赞 15 万</span>' +
            '</div>' +
          '</div>' +
          /* 两张科普卡 */
          '<div class="answer-head">' +
            '<h3>' + NEG.icon('target', 16) + ' 哪张科普卡片能驳倒它？</h3>' +
            '<span class="answer-hint">按 1 / 2 选择</span>' +
          '</div>' +
          '<div class="answer-grid">' +
            order.map((o, i) => (
              '<button class="answer-card" type="button" data-opt="' + i + '"' +
                ' data-ok="' + (o.ok ? '1' : '0') + '">' +
                '<span class="answer-letter">' + 'AB'[i] + '</span>' +
                '<span class="answer-text">' + esc(o.text) + '</span>' +
                '<span class="answer-state">' + NEG.icon(o.ok ? 'check' : 'x', 13) + '</span>' +
              '</button>'
            )).join('') +
          '</div>';

        stageEl.querySelectorAll('[data-opt]').forEach((btn) => {
          btn.addEventListener('click', () => answer(btn, order));
        });

        say('<span class="hint-line">' + NEG.icon('info', 13) + ' 先想想「这是哪种辐射？剂量有多大？」</span>');
        fitIt();
      }

      /* ---------------- 作答 ---------------- */
      function answer(btn, order) {
        if (answered) return;
        answered = true;
        const q = list[idx] || {};
        const ok = btn.dataset.ok === '1';

        if (ok) { correct++; streak++; } else { streak = 0; }
        const gain = ok ? 10 + Math.min(streak, 5) * 2 : -3;
        /* 重玩不计分 */
        if (!replay && ctx.store && ctx.store.addScore) ctx.store.addScore(gain, 'rumor');

        /* 锁定卡片,标出对错(同辟谣实验室) */
        const cards = stageEl.querySelectorAll('.answer-card');
        cards.forEach((card, i) => {
          card.classList.add('is-locked');
          const o = order[i] || {};
          if (o.ok) card.classList.add('is-correct');
          else if (card === btn) card.classList.add('is-wrong');
          else card.classList.add('is-dimmed');
          if (card === btn) card.classList.add('is-selected');
        });

        if (ctx.audio) ctx.audio.play(ok ? 'correct' : 'wrong');
        if (U.vibrate) U.vibrate(ok ? 30 : [20, 40, 20]);

        /* 结果面板(同辟谣实验室 renderResult 的结构) */
        const panel = document.createElement('div');
        panel.className = 'result-panel ' + (ok ? 'is-success' : 'is-fail') + ' anim-fade-up';
        panel.innerHTML =
          '<div class="verdict-row">' +
            '<span class="verdict-stamp ' + (ok ? 'ok' : 'bad') + '">' +
              (ok ? '✓ 判断正确' : '✗ 判断错误') + '</span>' +
            '<h3>' + (ok ? '这是一条谣言，你识破了它' : '差一点，这条才是正确的') + '</h3>' +
            '<span class="badge ' + (ok ? 'badge-green' : 'badge-red') + '">' +
              (replay ? '复习' : (gain > 0 ? '+' : '') + gain + ' 分') + '</span>' +
          '</div>' +
          '<p class="truth-line">' + esc(q.correct_card || '') + '</p>' +
          '<p class="explain-text">' + esc(q.debunk_explanation || '') + '</p>';

        stageEl.appendChild(panel);
        if (panel.scrollIntoView) {
          try { panel.scrollIntoView({ block: 'nearest' }); } catch (e) { /* noop */ }
        }

        /* 主按钮统一放底栏右侧,不塞进内容里 */
        say(
          '<span class="panel-note">' + (ok ? '继续保持。' : '记住机制比记住结论更重要。') + '</span>' +
          '<button class="btn btn-primary btn-sm" type="button" data-next>' +
            (idx + 1 >= list.length ? '继续' : '下一题') + NEG.icon('arrowRight', 15) +
          '</button>'
        );
        const nb = footEl.querySelector('[data-next]');
        if (nb) {
          nb.addEventListener('click', () => {
            if (ctx.audio) ctx.audio.play('click');
            next();
          });
        }
        fitIt();
      }

      function next() {
        if (solved) return;
        if (idx + 1 >= list.length) { finish(); return; }
        idx++;
        renderQuestion();
      }

      /* ---------------- 结算 ---------------- */
      function finish() {
        if (solved) return;
        solved = true;
        if (ctx.audio) ctx.audio.play('fanfare');
        /* 不等结果页,直接交还控制权退出关卡 */
        done({ ok: true, correct: correct, total: list.length });
      }

      /* 键盘 1 / 2 选择,Enter 继续(与辟谣实验室一致) */
      function onKey(e) {
        if (U.isTyping && U.isTyping(e)) return;
        if (document.querySelector('.overlay')) return;
        if (!answered) {
          const i = ['1', '2'].indexOf(e.key);
          if (i >= 0) {
            const btn = stageEl.querySelectorAll('[data-opt]')[i];
            if (btn) { e.preventDefault(); btn.click(); }
          }
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          const nb = footEl.querySelector('[data-next]');
          if (nb) { e.preventDefault(); nb.click(); }
        }
      }
      document.addEventListener('keydown', onKey);

      renderQuestion();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
