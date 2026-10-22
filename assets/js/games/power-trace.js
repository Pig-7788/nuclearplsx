import '../main-plays.js';

/* ============================================================
   核纪元 · 第五章第二关：追踪一度电
   ------------------------------------------------------------
   先按顺序连接“核裂变热 → 电网”的能量路径，
   再判断汽轮机与发电机各自承担的能量转换。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  NEG.mainPlays.register('power_trace', {
    label: '追踪一度电',

    mount(container, payload, ctx, done) {
      const U = NEG.util || {};
      const g = payload || {};
      const path = Array.isArray(g.path) ? g.path : [];
      const roles = Array.isArray(g.roles) ? g.roles : [];

      if (!path.length) {
        container.innerHTML = '<div class="empty">关卡数据缺失，请刷新页面。</div>';
        return null;
      }

      let placed = [];
      let roleIdx = 0;
      let roleDone = false;
      let wrong = 0;
      let finished = false;
      const roleState = roles.map(() => ({ ok: false, wrong: 0 }));
      const order = U.shuffle ? U.shuffle(path.map((p, i) => i)) : path.map((p, i) => i);
      const tray = order.slice();

      function render() {
        if (roleDone) return renderSummary();
        if (placed.length === path.length) return renderRole();
        const next = path[placed.length];
        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('bolt', 15) + ' ' + esc(g.title || '追踪一度电') + '</h3>' +
              '<span class="badge badge-cyan">' + placed.length + ' / ' + path.length + ' 环</span>' +
            '</div>' +
            (g.intro_text ? '<p class="ls-intro">' + esc(g.intro_text) + '</p>' : '') +
            '<div class="ls-body">' +
              '<div class="pt-wrap">' +
                '<div class="pt-col">' +
                  '<div class="svc-step-badge"><b>PATH</b> 能量经过这里</div>' +
                  '<div class="pt-path">' + path.map((node, i) => {
                    const filled = i < placed.length;
                    return '<div class="pt-slot' + (filled ? ' is-filled' : '') + '">' +
                      '<span class="pt-no">' + (i + 1) + '</span>' +
                      '<span class="pt-name">' + esc(filled ? node.name : '待连接') + '</span>' +
                      (filled && node.note ? '<small>' + esc(node.note) + '</small>' : '') +
                    '</div>';
                  }).join('') + '</div>' +
                '</div>' +
                '<div class="pt-col">' +
                  '<div class="svc-step-badge"><b>STEP</b> 点击下一环</div>' +
                  '<div class="pt-tray">' + tray.map((i) => (
                    '<button class="pt-card" type="button" data-card="' + i + '">' +
                      '<b>' + esc(path[i].name) + '</b>' +
                      (path[i].hint ? '<span>' + esc(path[i].hint) + '</span>' : '') +
                    '</button>'
                  )).join('') + '</div>' +
                  '<div data-fb></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="ls-foot"><span class="ls-note">' + NEG.icon('info', 13) +
              ' 从堆芯开始，沿着热量与工质的路径点下去。</span></div>' +
          '</div>';

        container.querySelectorAll('[data-card]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const i = Number(btn.dataset.card);
            if (placed.indexOf(i) >= 0) return;
            if (i === placed.length) {
              placed.push(i);
              tray.splice(tray.indexOf(i), 1);
              if (ctx.audio) ctx.audio.play('correct');
              render();
            } else {
              wrong++;
              if (ctx.audio) ctx.audio.play('wrong');
              btn.classList.add('is-bad');
              const fb = container.querySelector('[data-fb]');
              if (fb) fb.innerHTML = '<div class="ls-feedback is-bad">还不是下一环。当前等待第 ' +
                (placed.length + 1) + ' 环：' + esc(next.name) + '。先想想上一环把能量交给了谁。</div>';
            }
          });
        });
      }

      function renderRole() {
        if (roleIdx >= roles.length) { roleDone = true; return renderSummary(); }
        const q = roles[roleIdx] || {};
        const options = Array.isArray(q.options) ? q.options : [];
        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('bolt', 15) + ' ' + esc(g.title || '追踪一度电') + '</h3>' +
              '<span class="badge badge-cyan">路径完成 · 作用判断</span>' +
            '</div>' +
            '<div class="ls-body"><div class="ls-main" style="overflow-y:auto">' +
              '<div class="ls-card">' +
                '<div class="ls-ask">' + esc(q.question || '') + '</div>' +
                '<div class="ls-opts" style="margin-top:8px">' + options.map((o, i) => (
                  '<button class="ls-opt" type="button" data-role="' + i + '">' +
                    '<span class="ls-key">' + 'ABC'[i] + '</span><span>' + esc(o.text) + '</span>' +
                  '</button>'
                )).join('') + '</div>' +
                '<div data-rfb></div>' +
              '</div>' +
            '</div></div>' +
            '<div class="ls-foot"><span class="ls-note">' + NEG.icon('info', 13) + ' 能量形式在每一步发生了什么变化？</span></div>' +
          '</div>';

        container.querySelectorAll('[data-role]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const o = options[Number(btn.dataset.role)] || {};
            if (o.ok) {
              roleState[roleIdx].ok = true;
              if (ctx.audio) ctx.audio.play('correct');
              roleIdx++;
              render();
            } else {
              roleState[roleIdx].wrong++;
              btn.classList.add('is-bad');
              if (ctx.audio) ctx.audio.play('wrong');
              const fb = container.querySelector('[data-rfb]');
              if (fb) fb.innerHTML = '<div class="ls-feedback is-bad">' + esc(o.why || '再想想这一环输入和输出的能量形式。') + '</div>';
            }
          });
        });
      }

      function renderSummary() {
        finished = true;
        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head"><h3>' + NEG.icon('check', 15) + ' 一度电的旅程</h3>' +
              '<span class="badge badge-green">已完成</span></div>' +
            '<div class="ls-body"><div class="ls-main" style="overflow-y:auto">' +
              '<div class="ls-card"><div class="ls-ask">核裂变热 → 蒸汽 → 机械能 → 电能</div>' +
                '<p class="ls-note" style="margin-top:4px">一回路的高压水把堆芯热量带到蒸汽发生器，二回路产生蒸汽推动汽轮机旋转，发电机再把机械能转换成电能，经主变压器升压并入电网。' +
                '核岛与常规岛之间通过蒸汽发生器换热，放射性一回路水不会直接进入汽轮机。</p></div>' +
              '<div class="ls-chips">' +
                '<span class="ls-chip">路径连接 <b>' + path.length + ' / ' + path.length + '</b></span>' +
                '<span class="ls-chip">作用判断 <b>' + roleState.filter((r) => r.ok).length + ' / ' + roles.length + '</b></span>' +
                '<span class="ls-chip">尝试次数 <b>' + (wrong + roleState.reduce((n, r) => n + r.wrong, 0)) + '</b></span>' +
              '</div>' +
            '</div></div>' +
            '<div class="ls-foot"><span class="ls-note">' + NEG.icon('check', 13) + ' 本关完成。</span>' +
              '<button class="btn btn-primary btn-sm" type="button" data-done>完成本节' + NEG.icon('arrowRight', 14) + '</button></div>' +
          '</div>';
        container.querySelector('[data-done]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('fanfare');
          done({ ok: true, path: path.length, roles: roles.length, attempts: wrong + roleState.reduce((n, r) => n + r.wrong, 0) });
        });
      }

      function onKey(e) {
        if (finished || (U.isTyping && U.isTyping(e))) return;
        if (document.querySelector('.overlay')) return;
        const n = ['1', '2', '3', '4'].indexOf(e.key);
        if (n >= 0) {
          const btn = container.querySelectorAll('.pt-card, .ls-opt:not(:disabled)')[n];
          if (btn) { e.preventDefault(); btn.click(); }
        }
      }
      document.addEventListener('keydown', onKey);

      render();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
