import '../main-plays.js';

/* ============================================================
   核纪元 · 主线终章:统计 + 结业答辩 + 证书
   ------------------------------------------------------------
   数据来源:章节 module_type === 'final_summary'
   - phase_1_stats.fields[]        统计项(key / label / unit / default)
   - phase_2_defense.questions[]   答辩题(role / question / options[].is_correct)
   - phase_3_certificate           证书(cert_name / motto / description / buttons)

   统计口径全部读存档 modes.main:
     attitude_baseline     ch01 的选项记录
     rumors_debunked_count 各章打假关卡里答对的条数合计
     knowledge_cards_collected  已收集知识卡张数
     modules_completed     已完成章节数(本章未结算时算作已完成)
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  function num(v) {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  }

  NEG.mainPlays.register('final_summary', {
    label: '结业答辩',

    mount(container, payload, ctx, done) {
      const U = NEG.util || {};
      const ch = payload || {};
      const p1 = ch.phase_1_stats || {};
      const p2 = ch.phase_2_defense || {};
      const p3 = ch.phase_3_certificate || {};
      const questions = Array.isArray(p2.questions) ? p2.questions : [];

      const st = (ctx && ctx.store && ctx.store.get()) ? ctx.store.get() : {};
      const m = (st.modes && st.modes.main) || {};
      const games = m.games || {};

      /* ---------- 统计口径 ---------- */
      function rumorTally() {
        let total = 0;
        let correct = 0;
        Object.keys(games).forEach((k) => {
          if (k.indexOf('::rumor_debunking_game') < 0) return;
          const g = games[k] || {};
          total += num(g.total);
          correct += num(g.correct);
        });
        return { total: total, correct: correct };
      }

      function chapterTally() {
        const done = Array.isArray(m.completed) ? m.completed.length : 0;
        const total = (NEG.story && Array.isArray(NEG.story.order)) ? NEG.story.order.length : done;
        const bump = (Array.isArray(m.completed) && m.completed.indexOf(ch.module_id) >= 0) ? 0 : 1;
        return { done: Math.min(total || done, done + bump), total: total };
      }

      function statValue(key, def) {
        if (key === 'attitude_baseline') return m.attitude_baseline || def || '—';
        if (key === 'rumors_debunked_count') return String(rumorTally().correct);
        if (key === 'knowledge_cards_collected') return String((m.cards || []).length);
        if (key === 'modules_completed') return String(chapterTally().done) + ' / ' + chapterTally().total;
        return def != null ? String(def) : '—';
      }

      let defendCorrect = 0;

      /* ---------- 阶段 1:统计 ---------- */
      function renderStats() {
        const fields = Array.isArray(p1.fields) ? p1.fields : [];
        const tally = chapterTally();

        container.innerHTML =
          '<div class="game final-game">' +
            '<div class="game-head">' +
              '<h3>' + esc(p1.title || '结业统计') + '</h3>' +
              '<span class="badge badge-amber">结业</span>' +
            '</div>' +
            '<div class="game-body fin-body">' +
              '<div class="fin-stats">' +
                fields.map((f) => {
                  const val = statValue(f.key, f.default);
                  const isPair = f.key === 'modules_completed';
                  return '<div class="fin-stat">' +
                    '<b>' + esc(val) + '</b>' +
                    '<span>' + esc(f.label || '') + '</span>' +
                    (f.unit && !isPair ? '<em>' + esc(f.unit) + '</em>' : '') +
                  '</div>';
                }).join('') +
              '</div>' +
              '<p class="fin-note">八章主线走到这里。下面是最后一次检验。</p>' +
            '</div>' +
            '<div class="game-foot">' +
              '<button class="btn btn-primary btn-sm" type="button" data-go="defense">' +
                '进入结业答辩' + NEG.icon('arrowRight', 14) +
              '</button>' +
            '</div>' +
          '</div>';

        container.querySelector('[data-go="defense"]').addEventListener('click', () => {
          if (ctx && ctx.audio) ctx.audio.play('click');
          if (questions.length) renderDefense(0);
          else renderCert();
        });

        fitIt();
      }

      /* ---------- 阶段 2:答辩 ---------- */
      function renderDefense(idx) {
        const q = questions[idx] || {};
        const opts = Array.isArray(q.options) ? q.options.slice() : [];
        const order = U.shuffle ? U.shuffle(opts) : opts;

        container.innerHTML =
          '<div class="game final-game">' +
            '<div class="game-head">' +
              '<h3>' + esc(p2.title || '结业答辩') + '</h3>' +
              '<span class="badge badge-cyan">第 ' + (idx + 1) + ' / ' + questions.length + ' 题</span>' +
            '</div>' +
            (p2.intro_text ? '<p class="game-intro">' + esc(p2.intro_text) + '</p>' : '') +
            '<div class="game-body db-body">' +
              '<div class="db-rumor fin-q">' +
                '<span class="db-tag">' + esc(q.role || '') + '</span>' +
                '<span class="db-text">' + esc(q.question || '') + '</span>' +
              '</div>' +
              '<div class="db-answer" data-answer>' +
                '<div class="db-opts">' +
                  order.map((o, i) => (
                    '<button type="button" class="db-opt" data-opt="' + i + '"' +
                      ' data-ok="' + (o.is_correct ? '1' : '0') + '">' +
                      '<span class="db-letter">' + 'AB'[i] + '</span>' +
                      '<span class="db-opt-text">' + esc(o.text || '') + '</span>' +
                    '</button>'
                  )).join('') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="game-foot" data-foot>' +
              '<span class="panel-note">选择最科学、最符合核安全观的回答。</span>' +
            '</div>' +
          '</div>';

        const answerEl = container.querySelector('[data-answer]');
        const footEl = container.querySelector('[data-foot]');
        let answered = false;

        answerEl.querySelectorAll('[data-opt]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (answered) return;
            answered = true;
            const ok = btn.dataset.ok === '1';
            if (ok) defendCorrect++;

            answerEl.querySelectorAll('[data-opt]').forEach((b) => {
              if (b.dataset.ok === '1') b.classList.add('is-ok');
              else if (b === btn) b.classList.add('is-bad');
              b.disabled = true;
            });

            if (ctx && ctx.audio) ctx.audio.play(ok ? 'correct' : 'wrong');

            const picked = order[Number(btn.dataset.opt)] || {};
            const panel = document.createElement('div');
            panel.className = 'db-result anim-fade-up';
            panel.innerHTML =
              '<span class="db-verdict ' + (ok ? 'is-ok' : 'is-bad') + '">' +
                (ok ? '回答正确' : '回答错误') + '</span>' +
              '<p class="db-expl">' + esc(picked.feedback || '') + '</p>';
            answerEl.appendChild(panel);

            const last = idx + 1 >= questions.length;
            footEl.innerHTML =
              '<button class="btn btn-primary btn-sm" type="button" data-next>' +
                (last ? '查看结业结果' : '下一题') + NEG.icon('arrowRight', 14) +
              '</button>';
            footEl.querySelector('[data-next]').addEventListener('click', () => {
              if (ctx && ctx.audio) ctx.audio.play('click');
              if (last) renderCert();
              else renderDefense(idx + 1);
            });

            fitIt();
          });
        });

        fitIt();
      }

      /* ---------- 阶段 3:证书 ---------- */
      function renderCert() {
        const tally = chapterTally();
        const cards = (m.cards || []).length;
        const btnText = (Array.isArray(p3.buttons) && p3.buttons[0] && p3.buttons[0].text) || '完成';

        container.innerHTML =
          '<div class="game final-game">' +
            '<div class="game-head">' +
              '<h3>' + esc(p3.title || '结业认证') + '</h3>' +
              '<span class="badge badge-green">已结业</span>' +
            '</div>' +
            '<div class="game-body fin-body">' +
              '<div class="fin-cert anim-fade-up">' +
                '<span class="fin-motto">' + esc(p3.motto || '') + '</span>' +
                '<h2 class="fin-name">' + esc(p3.cert_name || '结业证书') + '</h2>' +
                '<p class="fin-desc">' + esc(p3.description || '') + '</p>' +
                '<div class="fin-meta">' +
                  '<span>主线 ' + tally.done + ' / ' + tally.total + ' 章</span>' +
                  '<span>知识卡 ' + cards + ' 张</span>' +
                  '<span>答辩 ' + defendCorrect + ' / ' + questions.length + ' 题</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="game-foot">' +
              '<button class="btn btn-primary" type="button" data-finish>' +
                NEG.icon('check', 15) + ' ' + esc(btnText) +
              '</button>' +
            '</div>' +
          '</div>';

        container.querySelector('[data-finish]').addEventListener('click', () => {
          if (ctx && ctx.audio) ctx.audio.play('fanfare');
          done({
            ok: true,
            certificate: true,
            defense: { correct: defendCorrect, total: questions.length },
            cards: cards
          });
        });

        fitIt();
        if (ctx && ctx.audio) ctx.audio.play('unlock');
      }

      /* ---------- 自适应字号 ---------- */
      function fitIt() {
        if (!(NEG.mainPlays && NEG.mainPlays.fit)) return;
        const body = container.querySelector('.game-body');
        if (body) NEG.mainPlays.fit(body, null, 9);
      }

      renderStats();

      return function cleanup() {
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
