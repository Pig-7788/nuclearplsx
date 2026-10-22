import '../main-plays.js';

/* ============================================================
   核纪元 · 主线关卡：科研委托台（第三章）
   ------------------------------------------------------------
   数据来源：章节 gameplay.type === 'research_desk'
   commission = { id, icon, client, task, goal,
                  devices:[{name,sub,ok,why}],
                  reason:{question, options:[{text,ok,why}], feedbackOk, feedbackBad},
                  solve, limit }

   流程：接委托 → 选择合适装置 → 说明理由 → 看到“能解决什么 / 有什么局限”
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  NEG.mainPlays.register('research_desk', {
    label: '科研委托台',

    mount(container, payload, ctx, done) {
      const U = NEG.util || {};
      const g = payload || {};
      const list = Array.isArray(g.commissions) ? g.commissions : [];

      if (!list.length) {
        container.innerHTML = '<div class="empty">关卡数据缺失，请刷新页面。</div>';
        return null;
      }

      let idx = 0;
      let finished = false;
      const result = list.map(() => ({ deviceOk: false, deviceWrong: 0, reasonOk: false, reasonWrong: 0 }));

      container.innerHTML =
        '<div class="ls-game">' +
          '<div class="ls-head">' +
            '<h3>' + NEG.icon('search', 15) + ' ' + esc(g.title || '科研委托台') + '</h3>' +
            '<span class="badge badge-cyan" data-count></span>' +
          '</div>' +
          (g.intro_text ? '<p class="ls-intro">' + esc(g.intro_text) + '</p>' : '') +
          '<div class="ls-body">' +
            '<div class="rd-wrap">' +
              '<div class="rd-rail" data-rail></div>' +
              '<div class="rd-panel" data-panel></div>' +
            '</div>' +
          '</div>' +
          '<div class="ls-foot" data-foot></div>' +
        '</div>';

      const railEl = container.querySelector('[data-rail]');
      const panelEl = container.querySelector('[data-panel]');
      const footEl = container.querySelector('[data-foot]');
      const countEl = container.querySelector('[data-count]');

      function say(html) { footEl.innerHTML = html; }
      function solved(i) { return result[i].deviceOk && result[i].reasonOk; }
      function solvedCount() { return result.filter((r, i) => solved(i)).length; }

      function renderRail() {
        railEl.innerHTML = list.map((c, i) => (
          '<button class="rd-task' + (i === idx ? ' is-active' : '') + (solved(i) ? ' is-done' : '') + '" type="button" data-task="' + i + '">' +
            '<b>' + esc(c.icon || '📋') + ' ' + esc(c.client || ('委托 ' + (i + 1))) + '</b>' +
            '<span>' + (solved(i) ? '已受理' : '待受理') + '</span>' +
          '</button>'
        )).join('');
        railEl.querySelectorAll('[data-task]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (finished) return;
            idx = Number(btn.dataset.task);
            if (ctx.audio) ctx.audio.play('click');
            renderCommission();
          });
        });
        if (countEl) countEl.textContent = solvedCount() + ' / ' + list.length + ' 项委托';
      }

      function renderCommission() {
        const c = list[idx] || {};
        const r = result[idx];
        const devices = Array.isArray(c.devices) ? c.devices : [];
        const reason = c.reason || { question: '', options: [] };
        const device = devices.find((d) => d.ok) || {};
        renderRail();

        panelEl.innerHTML =
          '<div class="rd-brief"><b>委托方：' + esc(c.client || '') + '</b><br>' + esc(c.task || '') +
            (c.goal ? '<br><span class="ls-note">目标：' + esc(c.goal) + '</span>' : '') + '</div>' +
          '<div class="svc-step-badge"><b>STEP 1</b> 选择合适的技术 / 装置</div>' +
          (r.deviceOk
            ? '<div class="ls-feedback is-ok"><b>已选择：</b>' + esc(device.name || '') + '。' + esc(device.why || '') + '</div>'
            : '<div class="rd-devices">' + devices.map((d, i) => (
                '<button class="rd-device" type="button" data-device="' + i + '">' +
                  '<b>' + esc(d.name || '') + '</b>' +
                  (d.sub ? '<span>' + esc(d.sub) + '</span>' : '') +
                '</button>'
              )).join('') + '</div>') +
          (r.deviceOk
            ? '<div class="svc-step-badge"><b>STEP 2</b> 说明理由</div>' +
              (r.reasonOk
                ? '<div class="ls-feedback is-ok">' + esc(reason.feedbackOk || '理由正确。') + '</div>' +
                  '<div class="rd-feedback">' +
                    '<div class="ls-card"><b>它能解决什么</b>' + esc(c.solve || '') + '</div>' +
                    '<div class="ls-card is-limit"><b>局限与代价</b>' + esc(c.limit || '') + '</div>' +
                  '</div>'
                : '<div class="ls-ask">' + esc(reason.question || '') + '</div>' +
                  '<div class="ls-opts">' + (reason.options || []).map((o, i) => (
                    '<button class="ls-opt" type="button" data-reason="' + i + '">' +
                      '<span class="ls-key">' + 'ABC'[i] + '</span><span>' + esc(o.text) + '</span></button>'
                  )).join('') + '</div>' +
                  (r.reasonWrong ? '<div class="ls-feedback is-bad">' + esc(reason.feedbackBad || '再对照装置能力想一想。') + '</div>' : ''))
            : (r.deviceWrong ? '<div class="ls-feedback is-bad">这个装置解决不了委托里的核心问题，换一个试试。</div>' : ''));

        if (!r.deviceOk) {
          panelEl.querySelectorAll('[data-device]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const d = devices[Number(btn.dataset.device)] || {};
              if (d.ok) {
                r.deviceOk = true;
                if (ctx.audio) ctx.audio.play('correct');
                renderCommission();
              } else {
                r.deviceWrong++;
                btn.classList.add('is-bad');
                if (ctx.audio) ctx.audio.play('wrong');
                const fb = panelEl.querySelector('.ls-feedback.is-bad');
                if (!fb) {
                  const box = document.createElement('div');
                  box.className = 'ls-feedback is-bad';
                  box.textContent = d.why || '这个装置与委托目标不匹配。';
                  btn.closest('.rd-devices').insertAdjacentElement('afterend', box);
                }
              }
            });
          });
        }

        if (r.deviceOk && !r.reasonOk) {
          panelEl.querySelectorAll('[data-reason]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const o = (reason.options || [])[Number(btn.dataset.reason)] || {};
              if (o.ok) {
                r.reasonOk = true;
                if (ctx.audio) ctx.audio.play('correct');
                renderCommission();
              } else {
                r.reasonWrong++;
                btn.classList.add('is-bad');
                if (ctx.audio) ctx.audio.play('wrong');
                const fb = panelEl.querySelector('.ls-feedback.is-bad');
                if (!fb) {
                  const box = document.createElement('div');
                  box.className = 'ls-feedback is-bad';
                  box.textContent = o.why || reason.feedbackBad || '再对照装置能力想一想。';
                  btn.closest('.ls-opts').insertAdjacentElement('afterend', box);
                }
              }
            });
          });
        }

        renderFoot();
        if (panelEl.scrollTo) panelEl.scrollTo({ top: 0 });
      }

      function renderFoot() {
        const all = solvedCount() === list.length;
        if (all) {
          say('<span class="ls-note">' + NEG.icon('check', 13) + ' 三项委托都已受理。</span>' +
            '<button class="btn btn-primary btn-sm" type="button" data-action="summary">查看委托总结' + NEG.icon('arrowRight', 14) + '</button>');
          footEl.querySelector('[data-action="summary"]').addEventListener('click', showSummary);
          return;
        }
        const cur = solved(idx);
        const nextIdx = result.findIndex((r, i) => i > idx && !solved(i));
        say('<span class="ls-note">' + NEG.icon('info', 13) + ' ' +
          (cur ? '本项委托已完成。' : '先选对装置，再说明理由。') + '</span>' +
          (cur ? '<button class="btn btn-primary btn-sm" type="button" data-action="next">' +
            (nextIdx >= 0 ? '下一项委托' : '前往未完成委托') + NEG.icon('arrowRight', 14) + '</button>' : ''));
        const next = footEl.querySelector('[data-action="next"]');
        if (next) next.addEventListener('click', () => {
          idx = nextIdx >= 0 ? nextIdx : result.findIndex((r, i) => !solved(i));
          if (ctx.audio) ctx.audio.play('click');
          renderCommission();
        });
      }

      function showSummary() {
        finished = true;
        const mastered = result.filter((r) => r.deviceWrong + r.reasonWrong === 0).length;
        const corrected = result.filter((r) => r.deviceWrong + r.reasonWrong > 0).length;
        container.querySelector('.ls-body').innerHTML =
          '<div class="ls-main ls-summary">' +
            '<div class="ls-card" style="flex:0 0 auto">' +
              '<div class="ls-ask">' + esc(g.summary_title || '同一台“核技术”，在不同任务里要选不同的工具') + '</div>' +
              '<p class="ls-note" style="margin-top:4px">合成新元素、解析材料结构、精准治疗肿瘤，靠的不是“更强的核”，而是“合适的装置 + 明确的能力边界”。</p>' +
            '</div>' +
            '<div class="ls-chips">' +
              '<span class="ls-chip">一次选对 <b>' + mastered + ' / ' + list.length + '</b></span>' +
              '<span class="ls-chip">经纠正掌握 <b>' + corrected + ' / ' + list.length + '</b></span>' +
            '</div>' +
            '<div class="pr-lists">' + list.map((c, i) => (
              '<div class="pr-list ' + (result[i].deviceWrong + result[i].reasonWrong === 0 ? 'is-ok' : 'is-fix') + '">' +
                '<h5>' + esc(c.client || ('委托 ' + (i + 1))) + '</h5>' +
                '<ul><li>' + esc(c.task || '') + '</li><li><b>能解决：</b>' + esc(c.solve || '') + '</li>' +
                '<li><b>局限：</b>' + esc(c.limit || '') + '</li></ul>' +
              '</div>'
            )).join('') + '</div>' +
          '</div>';
        say('<span class="ls-note">' + NEG.icon('check', 13) + ' 委托台关闭，本章完成。</span>' +
          '<button class="btn btn-primary btn-sm" type="button" data-done>完成本章' + NEG.icon('arrowRight', 14) + '</button>');
        footEl.querySelector('[data-done]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('fanfare');
          done({ ok: true, commissions: list.length, mastered: mastered, corrected: corrected });
        });
      }

      function onKey(e) {
        if (finished || (U.isTyping && U.isTyping(e))) return;
        if (document.querySelector('.overlay')) return;
        const n = ['1', '2', '3', '4', '5'].indexOf(e.key);
        if (n >= 0) {
          const btns = panelEl.querySelectorAll('.ls-opt:not(:disabled), .rd-device:not(:disabled)');
          if (btns[n]) { e.preventDefault(); btns[n].click(); }
        }
        if (e.key === 'Enter') {
          const next = footEl.querySelector('[data-action="next"],[data-action="summary"]');
          if (next) { e.preventDefault(); next.click(); }
        }
      }
      document.addEventListener('keydown', onKey);

      renderCommission();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
