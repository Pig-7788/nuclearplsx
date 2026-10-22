import '../main-plays.js';

/* ============================================================
   核纪元 · 主线关卡:前沿匹配(连线)
   ------------------------------------------------------------
   数据来源:章节 gameplay.type === 'match_connect'
   - pairs[]  { left, right, feedback }

   交互:先点左栏一项 → 再点右栏一项,配对成功即锁定并给出反馈。
   右栏顺序打乱,左栏保持原序。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  NEG.mainPlays.register('match_connect', {
    label: '前沿匹配',

    mount(container, payload, ctx, done) {
      const g = payload || {};
      const pairs = Array.isArray(g.pairs) ? g.pairs : [];

      if (!pairs.length) {
        container.innerHTML = '<div class="empty">关卡数据缺失,请刷新页面。</div>';
        return null;
      }

      const U = NEG.util || {};
      const baseOrder = pairs.map((p, i) => i);
      const rightOrder = U.shuffle ? U.shuffle(baseOrder) : baseOrder.slice().reverse();

      const matched = {};
      let selected = null;
      let wrong = 0;
      let solved = false;

      container.innerHTML =
        '<div class="game">' +
          '<div class="game-head">' +
            '<h3>' + esc(g.title || '前沿匹配') + '</h3>' +
            '<span class="badge badge-cyan" data-count>0 / ' + pairs.length + '</span>' +
          '</div>' +
          (g.intro_text ? '<p class="game-intro">' + esc(g.intro_text) + '</p>' : '') +
          '<div class="game-body">' +
            '<div class="match-cols">' +
              '<div class="match-col" data-left></div>' +
              '<div class="match-col" data-right></div>' +
            '</div>' +
          '</div>' +
          '<div class="game-foot" data-foot>先点左栏项目,再点右栏对应的应用。</div>' +
        '</div>';

      const leftEl = container.querySelector('[data-left]');
      const rightEl = container.querySelector('[data-right]');
      const footEl = container.querySelector('[data-foot]');
      const countEl = container.querySelector('[data-count]');

      function say(text) {
        if (footEl) footEl.textContent = text;
      }

      function matchedCount() {
        return Object.keys(matched).length;
      }

      function paint() {
        leftEl.innerHTML = baseOrder.map((i) => (
          '<button type="button" class="match-item' +
            (matched[i] ? ' is-done' : (selected === i ? ' is-active' : '')) + '"' +
            ' data-left-idx="' + i + '"' + (matched[i] ? ' disabled' : '') + '>' +
            esc(pairs[i].left) +
          '</button>'
        )).join('');

        rightEl.innerHTML = rightOrder.map((i) => (
          '<button type="button" class="match-item' +
            (matched[i] ? ' is-done' : '') + '"' +
            ' data-right-idx="' + i + '"' + (matched[i] ? ' disabled' : '') + '>' +
            esc(pairs[i].right) +
          '</button>'
        )).join('');

        if (countEl) countEl.textContent = matchedCount() + ' / ' + pairs.length;

        leftEl.querySelectorAll('[data-left-idx]').forEach((btn) => {
          btn.addEventListener('click', () => onLeft(Number(btn.dataset.leftIdx)));
        });
        rightEl.querySelectorAll('[data-right-idx]').forEach((btn) => {
          btn.addEventListener('click', () => onRight(Number(btn.dataset.rightIdx), btn));
        });
      }

      function onLeft(idx) {
        if (solved || matched[idx]) return;
        selected = selected === idx ? null : idx;
        if (selected != null && ctx && ctx.audio) ctx.audio.play('click');
        paint();
      }

      function onRight(idx, btn) {
        if (solved || matched[idx]) return;
        if (selected == null) {
          say('先在左栏选一项。');
          return;
        }
        if (selected === idx) {
          matched[idx] = true;
          const fb = pairs[idx].feedback;
          selected = null;
          if (ctx && ctx.audio) ctx.audio.play('correct');
          paint();
          say(fb || '配对正确。');
          if (matchedCount() === pairs.length) finish();
        } else {
          wrong++;
          if (ctx && ctx.audio) ctx.audio.play('wrong');
          btn.classList.add('is-wrong');
          setTimeout(() => btn.classList.remove('is-wrong'), 340);
          say('配对不对,再想想它们的对应关系。');
        }
      }

      function finish() {
        solved = true;
        say('全部配对完成。');
        setTimeout(() => done({ ok: true, mistakes: wrong }), 600);
      }

      paint();

      return function cleanup() {
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
