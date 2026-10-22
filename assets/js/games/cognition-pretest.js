import '../main-plays.js';

/* ============================================================
   核纪元 · 第一章开场：开卷前测
   ------------------------------------------------------------
   三道简短问题 + 初始态度记录。前测只用于建立个人起点，
   不公布答案、不计分；终章会回看“前测 → 结业”的变化。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  NEG.mainPlays.register('cognition_pretest', {
    label: '开卷前测',

    mount(container, payload, ctx, done) {
      const U = NEG.util || {};
      const g = payload || {};
      const questions = Array.isArray(g.questions) ? g.questions : [];
      const attitudes = Array.isArray(g.attitude_options) ? g.attitude_options : ['好奇', '害怕', '想了解真相'];

      let stage = 'intro';
      let attitude = '';
      let idx = 0;
      const answers = new Array(questions.length).fill(null);

      function storeAttitude(value) {
        if (!ctx.store) return;
        const s = ctx.store.get();
        if (!s.modes.main) s.modes.main = {};
        s.modes.main.attitude_baseline = value;
        if (ctx.store.save) ctx.store.save();
      }

      function renderIntro() {
        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('book', 15) + ' ' + esc(g.title || '开卷前测') + '</h3>' +
              '<span class="badge badge-cyan">学习起点</span>' +
            '</div>' +
            (g.intro_text ? '<p class="ls-intro">' + esc(g.intro_text) + '</p>' : '') +
            '<div class="ls-body">' +
              '<div class="ls-main" style="overflow-y:auto">' +
                '<div class="ls-card">' +
                  '<div class="ls-ask">' + esc(g.attitude_prompt || '开始前，你对核能的态度更接近？') + '</div>' +
                  '<p class="ls-note" style="margin-top:4px">这个选择只用于终章回看，不影响成绩，也不会被判定对错。</p>' +
                  '<div class="ls-chips" style="margin-top:8px">' + attitudes.map((op) => (
                    '<button class="ls-chip' + (attitude === op ? ' is-on' : '') + '" type="button" data-attitude="' + esc(op) + '">' +
                      esc(op) + '</button>'
                  )).join('') + '</div>' +
                '</div>' +
                '<div class="ls-card">' +
                  '<p class="ls-note">接下来是三道简短问题。它们不公布答案，只记录你的起点；带着这些问题进入八章，终章再看自己走了多远。</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="ls-foot">' +
              '<span class="ls-note">' + (attitude ? '已记录初始态度：' + esc(attitude) : '可以先不选态度，直接开始。') + '</span>' +
              '<button class="btn btn-primary btn-sm" type="button" data-start>开始前测' + NEG.icon('arrowRight', 14) + '</button>' +
            '</div>' +
          '</div>';

        container.querySelectorAll('[data-attitude]').forEach((btn) => {
          btn.addEventListener('click', () => {
            attitude = btn.dataset.attitude;
            if (ctx.audio) ctx.audio.play('click');
            storeAttitude(attitude);
            renderIntro();
          });
        });
        container.querySelector('[data-start]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('click');
          stage = 'questions';
          renderQuestion();
        });
      }

      function renderQuestion() {
        const q = questions[idx] || {};
        const options = Array.isArray(q.options) ? q.options : [];
        const picked = answers[idx];
        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('search', 15) + ' ' + esc(g.title || '开卷前测') + '</h3>' +
              '<span class="badge badge-cyan">' + (idx + 1) + ' / ' + questions.length + '</span>' +
            '</div>' +
            '<p class="ls-intro">' + esc(g.note || '凭第一反应作答即可，不公布答案。') + '</p>' +
            '<div class="ls-body">' +
              '<div class="ls-main" style="overflow-y:auto">' +
                '<div class="pre-q">' + esc(q.text || '') + '</div>' +
                '<div class="ls-opts">' + options.map((o, i) => (
                  '<button class="ls-opt' + (picked === i ? ' is-on' : '') + '" type="button" data-opt="' + i + '"' +
                    (picked != null ? ' disabled' : '') + '>' +
                    '<span class="ls-key">' + 'ABC'[i] + '</span><span>' + esc(o.text) + '</span>' +
                  '</button>'
                )).join('') + '</div>' +
                (picked != null ? '<div class="ls-feedback">已记录你的选择。前测不展示对错，终章会对照结果。</div>' : '') +
              '</div>' +
            '</div>' +
            '<div class="ls-foot">' +
              '<span class="ls-note">' + NEG.icon('info', 13) + ' 前测不参与评分。</span>' +
              '<button class="btn btn-primary btn-sm" type="button" data-next' + (picked == null ? ' disabled' : '') + '>' +
                (idx + 1 >= questions.length ? '完成前测' : '下一题') + NEG.icon('arrowRight', 14) + '</button>' +
            '</div>' +
          '</div>';

        container.querySelectorAll('[data-opt]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (answers[idx] != null) return;
            answers[idx] = Number(btn.dataset.opt);
            if (ctx.audio) ctx.audio.play('click');
            renderQuestion();
          });
        });
        const next = container.querySelector('[data-next]');
        if (next) next.addEventListener('click', () => {
          if (answers[idx] == null) return;
          if (ctx.audio) ctx.audio.play('click');
          if (idx + 1 >= questions.length) renderFinish();
          else { idx++; renderQuestion(); }
        });
      }

      function renderFinish() {
        const correct = questions.reduce((n, q, i) => (
          n + ((answers[i] != null && (q.options || [])[answers[i]] && q.options[answers[i]].ok) ? 1 : 0)
        ), 0);
        stage = 'done';
        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('check', 15) + ' 前测完成</h3>' +
              '<span class="badge badge-line">已记录</span>' +
            '</div>' +
            '<div class="ls-body">' +
              '<div class="ls-main" style="overflow-y:auto">' +
                '<div class="ls-card">' +
                  '<div class="ls-ask">你的学习起点已记录</div>' +
                  '<p class="ls-note" style="margin-top:4px">前测不公布答案，也不计入成绩。带着问题进入八章，终章会展示“前测 → 结业”的变化，并把需要复习的主题列出来。</p>' +
                '</div>' +
                '<div class="ls-chips">' +
                  '<span class="ls-chip">前测完成 <b>' + questions.length + ' / ' + questions.length + '</b></span>' +
                  (attitude ? '<span class="ls-chip">初始态度 <b>' + esc(attitude) + '</b></span>' : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="ls-foot">' +
              '<span class="ls-note">' + NEG.icon('info', 13) + ' 接下来先看学习路线，再进入正文。</span>' +
              '<button class="btn btn-primary btn-sm" type="button" data-route>查看学习路线' + NEG.icon('arrowRight', 14) + '</button>' +
            '</div>' +
          '</div>';

        container.querySelector('[data-route]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('fanfare');
          done({ ok: true, correct: correct, total: questions.length, answers: answers.slice(), attitude: attitude });
        });
      }

      function onKey(e) {
        if (stage === 'done' || (U.isTyping && U.isTyping(e))) return;
        if (document.querySelector('.overlay')) return;
        const n = ['1', '2', '3', '4'].indexOf(e.key);
        if (n >= 0) {
          const btn = container.querySelectorAll('.ls-opt:not(:disabled)')[n];
          if (btn) { e.preventDefault(); btn.click(); }
        }
        if (e.key === 'Enter') {
          const btn = container.querySelector('[data-start],[data-next]');
          if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
        }
      }
      document.addEventListener('keydown', onKey);

      renderIntro();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
