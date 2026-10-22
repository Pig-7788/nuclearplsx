import '../main-plays.js';

/* ============================================================
   核纪元 · 主线关卡：核技术生活服务站（第四章）
   ------------------------------------------------------------
   数据来源：章节 gameplay.type === 'life_service_station'
   case = { id, icon, place, title, role, request,
            use:{question, options:[{text,ok,why}], feedbackOk, feedbackBad},
            evidence:[{title,text}],
            explain:{question, options:[{text,ok,why}], feedbackOk, feedbackBad} }

   学习流程（每个案例）：
     1. 判断用途（选对才继续；错了给解释，可重试）
     2. 逐张查看三条依据（全部展开才进入下一步）
     3. 解释原因（可重试；错一次记为“已纠正”）
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  NEG.mainPlays.register('life_service_station', {
    label: '核技术生活服务站',

    mount(container, payload, ctx, done) {
      const U = NEG.util || {};
      const g = payload || {};
      const cases = Array.isArray(g.cases) ? g.cases : [];

      if (!cases.length) {
        container.innerHTML = '<div class="empty">关卡数据缺失，请刷新页面。</div>';
        return null;
      }

      let idx = 0;
      let solved = false;
      const result = cases.map(() => ({
        useOk: false,
        useWrong: 0,
        opened: [],
        explainOk: false,
        explainWrong: 0
      }));

      container.innerHTML =
        '<div class="ls-game">' +
          '<div class="ls-head">' +
            '<h3>' + NEG.icon('bolt', 15) + ' ' + esc(g.title || '核技术生活服务站') + '</h3>' +
            '<span class="badge badge-cyan" data-count></span>' +
          '</div>' +
          (g.intro_text ? '<p class="ls-intro">' + esc(g.intro_text) + '</p>' : '') +
          '<div class="ls-body">' +
            '<div class="svc-wrap">' +
              '<div class="svc-rail" data-rail></div>' +
              '<div class="svc-panel" data-panel></div>' +
            '</div>' +
          '</div>' +
          '<div class="ls-foot" data-foot></div>' +
        '</div>';

      const railEl = container.querySelector('[data-rail]');
      const panelEl = container.querySelector('[data-panel]');
      const footEl = container.querySelector('[data-foot]');
      const countEl = container.querySelector('[data-count]');

      function say(html) { if (footEl) footEl.innerHTML = html; }
      function caseSolved(i) { return result[i].useOk && result[i].explainOk; }
      function solvedCount() { return result.filter((r, i) => caseSolved(i)).length; }

      function renderRail() {
        railEl.innerHTML = cases.map((c, i) => {
          const doneCase = caseSolved(i);
          return '<button class="svc-tab' + (i === idx ? ' is-active' : '') + (doneCase ? ' is-done' : '') +
            '" type="button" data-case="' + i + '">' +
            '<span class="svc-ico">' + esc(c.icon || '🧪') + '</span>' +
            '<span>' + esc(c.place || c.title || '案例 ' + (i + 1)) + '</span>' +
            '<span class="svc-state">' + (doneCase ? '已处理' : '待处理') + '</span>' +
          '</button>';
        }).join('');
        railEl.querySelectorAll('[data-case]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (solved) return;
            idx = Number(btn.dataset.case);
            if (ctx.audio) ctx.audio.play('click');
            renderCase();
          });
        });
        if (countEl) countEl.textContent = solvedCount() + ' / ' + cases.length + ' 个案例';
      }

      function optList(options, handler, disabled) {
        return '<div class="ls-opts">' + options.map((o, i) => (
          '<button class="ls-opt" type="button" data-opt="' + i + '"' + (disabled ? ' disabled' : '') + '>' +
            '<span class="ls-key">' + 'ABCDE'[i] + '</span>' +
            '<span>' + esc(o.text) + '</span>' +
          '</button>'
        )).join('') + '</div>';
      }

      function renderCase() {
        const c = cases[idx] || {};
        const r = result[idx];
        renderRail();
        const use = c.use || { question: '', options: [] };
        const explain = c.explain || { question: '', options: [] };
        const evidence = Array.isArray(c.evidence) ? c.evidence : [];
        const evidenceReady = evidence.length > 0 && r.opened.length >= evidence.length;

        let html =
          '<div class="svc-scroll">' +
            '<div class="svc-head">' +
              '<h4>' + esc(c.icon || '🧪') + ' ' + esc(c.title || c.place || '') + '</h4>' +
              '<span class="badge badge-line">案例 ' + (idx + 1) + ' / ' + cases.length + '</span>' +
            '</div>' +
            '<div class="ls-card svc-request">' + esc(c.request || '') + '</div>' +
            '<div class="svc-step-badge"><b>STEP 1</b> 识别用途</div>' +
            (r.useOk
              ? '<div class="ls-feedback is-ok"><b>已识别用途：</b>' +
                  esc(((use.options || []).find((o) => o.ok) || {}).text || '') + '。' +
                  esc(use.feedbackOk || '') + '</div>'
              : '<div class="ls-ask">' + esc(use.question || '') + '</div>' +
                optList(use.options || [], null, false) +
                (r.useWrong ? '<div class="ls-feedback is-bad">' + esc(use.feedbackBad || '再想想这项技术的核心能力。') + '</div>' : '')) +
            (r.useOk
              ? '<div class="svc-step-badge"><b>STEP 2</b> 查看依据（' + r.opened.length + ' / ' + evidence.length + '）</div>' +
                '<div class="svc-ev-grid">' + evidence.map((ev, i) => {
                  const open = r.opened.indexOf(i) >= 0;
                  return '<button class="svc-ev' + (open ? ' is-open' : '') + '" type="button" data-ev="' + i + '">' +
                    '<b>' + esc(ev.title || ('依据 ' + (i + 1))) + '</b>' +
                    '<span>' + (open ? '点击收起' : '点击展开') + '</span>' +
                    '<span class="svc-ev-body">' + esc(ev.text || '') + '</span>' +
                  '</button>';
                }).join('') + '</div>'
              : '') +
            (r.useOk
              ? '<div class="svc-step-badge"><b>STEP 3</b> 解释原因' + (evidenceReady ? '' : '（先看完三条依据）') + '</div>' +
                (evidenceReady
                  ? '<div class="ls-ask">' + esc(explain.question || '') + '</div>' +
                    optList(explain.options || [], null, r.explainOk) +
                    (r.explainOk
                      ? '<div class="ls-feedback is-ok">' + esc(explain.feedbackOk || '解释正确。') + '</div>'
                      : (r.explainWrong ? '<div class="ls-feedback is-bad">' + esc(explain.feedbackBad || '再对照依据想一想。') + '</div>' : ''))
                  : '')
              : '') +
          '</div>';

        panelEl.innerHTML = html;

        /* 用途选项 */
        if (!r.useOk) {
          panelEl.querySelectorAll('.ls-opt').forEach((btn, i) => {
            btn.addEventListener('click', () => {
              const opt = (use.options || [])[i] || {};
              if (opt.ok) {
                r.useOk = true;
                if (ctx.audio) ctx.audio.play('correct');
                renderCase();
              } else {
                r.useWrong++;
                if (ctx.audio) ctx.audio.play('wrong');
                btn.classList.add('is-bad');
                const fb = panelEl.querySelector('.ls-feedback.is-bad');
                if (!fb) {
                  const box = document.createElement('div');
                  box.className = 'ls-feedback is-bad';
                  box.textContent = opt.why || use.feedbackBad || '再想想这项技术的核心能力。';
                  btn.closest('.ls-opts').insertAdjacentElement('afterend', box);
                }
              }
            });
          });
        }

        /* 依据展开 */
        panelEl.querySelectorAll('[data-ev]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const i = Number(btn.dataset.ev);
            const p = r.opened.indexOf(i);
            if (p >= 0) r.opened.splice(p, 1);
            else r.opened.push(i);
            if (ctx.audio) ctx.audio.play('click');
            renderCase();
          });
        });

        /* 解释选项 */
        if (r.useOk && evidenceReady && !r.explainOk) {
          panelEl.querySelectorAll('.ls-opt').forEach((btn, i) => {
            btn.addEventListener('click', () => {
              const opt = (explain.options || [])[i] || {};
              if (opt.ok) {
                r.explainOk = true;
                if (ctx.audio) ctx.audio.play('correct');
                renderCase();
              } else {
                r.explainWrong++;
                if (ctx.audio) ctx.audio.play('wrong');
                btn.classList.add('is-bad');
                const box = document.createElement('div');
                box.className = 'ls-feedback is-bad';
                box.textContent = opt.why || explain.feedbackBad || '再对照依据想一想。';
                btn.closest('.ls-opts').insertAdjacentElement('afterend', box);
              }
            });
          });
        }

        renderFoot();
        if (panelEl.scrollTo) panelEl.scrollTo({ top: 0 });
      }

      function renderFoot() {
        const currentSolved = caseSolved(idx);
        const allSolved = solvedCount() === cases.length;
        if (allSolved) {
          say('<span class="ls-note">' + NEG.icon('check', 13) + ' 三个案例都已处理，可以查看服务小结。</span>' +
            '<button class="btn btn-primary btn-sm" type="button" data-action="summary">查看服务小结' + NEG.icon('arrowRight', 14) + '</button>');
          footEl.querySelector('[data-action="summary"]').addEventListener('click', showSummary);
          return;
        }
        const nextIdx = result.findIndex((r, i) => i > idx && !caseSolved(i));
        const anyUnsolved = result.some((r, i) => !caseSolved(i));
        say('<span class="ls-note">' + NEG.icon('info', 13) + ' ' + (currentSolved ? '本案例已完成。' : '完成三步后会记录为已处理。') + '</span>' +
          (currentSolved && anyUnsolved
            ? '<button class="btn btn-primary btn-sm" type="button" data-action="next">' +
              (nextIdx >= 0 ? '下一个案例' : '前往未完成案例') + NEG.icon('arrowRight', 14) + '</button>'
            : ''));
        const nextBtn = footEl.querySelector('[data-action="next"]');
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            idx = nextIdx >= 0 ? nextIdx : result.findIndex((r, i) => !caseSolved(i));
            if (ctx.audio) ctx.audio.play('click');
            renderCase();
          });
        }
      }

      function showSummary() {
        solved = true;
        const mastered = result.filter((r) => r.useWrong === 0 && r.explainWrong === 0).length;
        const corrected = result.filter((r) => r.useWrong + r.explainWrong > 0).length;
        container.querySelector('.ls-body').innerHTML =
          '<div class="ls-main ls-summary">' +
            '<div class="ls-card" style="flex:0 0 auto">' +
              '<div class="ls-ask">服务站小结：' + esc(g.summary_title || '你已完成三个生活案例') + '</div>' +
              '<p class="ls-note" style="margin-top:4px">同一个“核”字，在医院、超市和工厂里用的是完全不同的能力：示踪显像、辐照处理、无损检测。判断用途，比记住名词更重要。</p>' +
            '</div>' +
            '<div class="ls-chips">' +
              '<span class="ls-chip">一次判断正确 <b>' + mastered + ' / ' + cases.length + '</b></span>' +
              '<span class="ls-chip">经纠正掌握 <b>' + corrected + ' / ' + cases.length + '</b></span>' +
            '</div>' +
            '<div class="pr-lists">' + cases.map((c, i) => (
              '<div class="pr-list ' + (result[i].useWrong + result[i].explainWrong === 0 ? 'is-ok' : 'is-fix') + '">' +
                '<h5>' + esc(c.place || c.title || ('案例 ' + (i + 1))) + '</h5>' +
                '<ul><li>' + esc(c.title || '') + '</li><li>' +
                  (result[i].useWrong + result[i].explainWrong === 0 ? '一次判断与解释均正确' : '经过解释后完成纠正') +
                '</li></ul>' +
              '</div>'
            )).join('') + '</div>' +
          '</div>';
        say('<span class="ls-note">' + NEG.icon('check', 13) + ' 服务站闭馆，本章完成。</span>' +
          '<button class="btn btn-primary btn-sm" type="button" data-action="done">完成本章' + NEG.icon('arrowRight', 14) + '</button>');
        footEl.querySelector('[data-action="done"]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('fanfare');
          done({ ok: true, cases: cases.length, mastered: mastered, corrected: corrected });
        });
      }

      function onKey(e) {
        if (solved || (U.isTyping && U.isTyping(e))) return;
        if (document.querySelector('.overlay')) return;
        const n = ['1', '2', '3', '4', '5'].indexOf(e.key);
        if (n >= 0) {
          const btns = panelEl.querySelectorAll('.ls-opt:not(:disabled)');
          if (btns[n]) { e.preventDefault(); btns[n].click(); }
        }
        if (e.key === 'Enter') {
          const next = footEl.querySelector('[data-action="next"],[data-action="summary"]');
          if (next) { e.preventDefault(); next.click(); }
        }
      }
      document.addEventListener('keydown', onKey);

      renderCase();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
