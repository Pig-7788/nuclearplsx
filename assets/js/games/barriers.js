import '../main-plays.js';
import '../waste-barrier-scene.js';
import '../waste-barriers.js';

/* ============================================================
   核纪元 · 第六章：四重屏障组装 + 作用判断
   ------------------------------------------------------------
   在原有拖放 / 点选组装之上增加两层理解检查：
     1. 每放入一层，回答这层屏障的主要作用；
     2. 四层全部就位后，把四张作用卡对应到四层屏障。
   只有两层检查都完成，才会出现“完成本节”按钮。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  NEG.mainPlays.register('multi_barrier_sort', {
    label: '四重屏障组装',

    mount(container, payload, ctx, done) {
      if (!NEG.WasteBarriers) return null;
      const layers = NEG.WasteBarriers.layers || [];
      const data = payload || {};
      const questions = data.layer_questions || {};
      const mappingPrompt = data.mapping_prompt || '把四张作用卡对应到四层屏障，检验你是否真的理解每一层在做什么。';

      let completed = false;
      let closed = false;
      let allPlaced = false;
      let mappingDone = false;
      let finishBtn = null;
      let overlay = null;
      const answered = {};

      container.classList.add('wb-inline-host');

      function clearOverlay() {
        if (overlay) {
          overlay.remove();
          overlay = null;
        }
      }

      function makeOverlay(html) {
        clearOverlay();
        overlay = document.createElement('div');
        overlay.className = 'wb-quiz';
        overlay.innerHTML = '<div class="wb-quiz-card">' + html + '</div>';
        container.appendChild(overlay);
        return overlay;
      }

      function removeFinish() {
        if (finishBtn) {
          finishBtn.remove();
          finishBtn = null;
        }
      }

      function showFinish() {
        if (finishBtn) return;
        const feedback = container.querySelector('.wb-feedback');
        if (!feedback) return;
        finishBtn = document.createElement('button');
        finishBtn.className = 'btn btn-primary wb-finish';
        finishBtn.type = 'button';
        finishBtn.textContent = '完成本节，返回正文';
        finishBtn.addEventListener('click', () => {
          if (closed) return;
          closed = true;
          done({ ok: true, barriers: layers.length, layerQuizzes: Object.keys(answered).length, mapping: mappingDone });
        }, { once: true });
        feedback.insertAdjacentElement('afterend', finishBtn);
        finishBtn.focus();
      }

      function maybeFinish() {
        if (!allPlaced) return;
        if (!layers.every((layer) => answered[layer.id] || !questions[layer.id])) return;
        if (!mappingDone) {
          showMapping();
          return;
        }
        showFinish();
      }

      function showLayerQuiz(index) {
        const layer = layers[index];
        if (!layer) return;
        const q = questions[layer.id];
        if (!q) {
          answered[layer.id] = true;
          maybeFinish();
          return;
        }
        const options = Array.isArray(q.options) ? q.options : [];
        const el = makeOverlay(
          '<div class="wb-quiz-head"><span class="ls-chip">第 ' + (index + 1) + ' 层 · ' + esc(layer.name) + '</span></div>' +
          '<div class="ls-ask">' + esc(q.question || '') + '</div>' +
          '<div class="ls-opts" style="margin-top:8px">' + options.map((o, i) => (
            '<button class="ls-opt" type="button" data-layer-opt="' + i + '">' +
              '<span class="ls-key">' + 'ABC'[i] + '</span><span>' + esc(o.text) + '</span>' +
            '</button>'
          )).join('') + '</div>' +
          '<div data-layer-fb></div>'
        );
        el.querySelectorAll('[data-layer-opt]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const o = options[Number(btn.dataset.layerOpt)] || {};
            if (o.ok) {
              answered[layer.id] = true;
              if (ctx.audio) ctx.audio.play('correct');
              clearOverlay();
              maybeFinish();
            } else {
              btn.classList.add('is-bad');
              if (ctx.audio) ctx.audio.play('wrong');
              const fb = el.querySelector('[data-layer-fb]');
              if (fb) fb.innerHTML = '<div class="ls-feedback is-bad">' + esc(o.why || '再对照这一层的材料和位置想一想。') + '</div>';
            }
          });
        });
      }

      function showMapping() {
        if (mappingDone || overlay) return;
        const shuffled = layers.map((layer) => layer.id);
        const U = NEG.util || {};
        const order = U.shuffle ? U.shuffle(shuffled) : shuffled.slice().reverse();
        let selected = null;
        const matched = {};
        const el = makeOverlay(
          '<div class="wb-quiz-head"><span class="ls-chip">最终检查 · 四层屏障</span></div>' +
          '<div class="ls-ask">' + esc(mappingPrompt) + '</div>' +
          '<div class="wb-map">' +
            '<div class="wb-map-col" data-barriers>' + layers.map((layer, i) => (
              '<button class="wb-map-item wb-map-barrier" type="button" data-barrier="' + layer.id + '">' +
                '<span class="wb-map-no">' + (i + 1) + '</span><b>' + esc(layer.name) + '</b>' +
              '</button>'
            )).join('') + '</div>' +
            '<div class="wb-map-col" data-roles>' + order.map((id) => {
              const layer = layers.find((l) => l.id === id);
              return '<button class="wb-map-item wb-map-role" type="button" data-role="' + id + '">' +
                esc(layer ? layer.role : '') + '</button>';
            }).join('') + '</div>' +
          '</div>' +
          '<div data-map-fb></div>'
        );

        function say(text, ok) {
          const fb = el.querySelector('[data-map-fb]');
          if (fb) fb.innerHTML = '<div class="ls-feedback ' + (ok ? 'is-ok' : 'is-bad') + '">' + esc(text) + '</div>';
        }

        el.querySelectorAll('[data-role]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (btn.disabled) return;
            selected = btn.dataset.role;
            el.querySelectorAll('[data-role]').forEach((b) => b.classList.toggle('is-on', b === btn));
            if (ctx.audio) ctx.audio.play('click');
          });
        });

        el.querySelectorAll('[data-barrier]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (btn.disabled) return;
            if (!selected) {
              say('先选一张右侧的作用卡，再点左侧的屏障。', false);
              return;
            }
            if (selected === btn.dataset.barrier) {
              matched[selected] = true;
              btn.classList.add('is-ok');
              el.querySelectorAll('[data-role="' + selected + '"]').forEach((b) => {
                b.classList.add('is-ok');
                b.disabled = true;
              });
              btn.disabled = true;
              selected = null;
              el.querySelectorAll('[data-role]').forEach((b) => b.classList.remove('is-on'));
              const layer = layers.find((l) => l.id === btn.dataset.barrier);
              say('正确：' + (layer ? layer.name : '') + ' —— ' + (layer ? layer.role : ''), true);
              if (Object.keys(matched).length === layers.length) {
                mappingDone = true;
                if (ctx.audio) ctx.audio.play('correct');
                setTimeout(() => {
                  clearOverlay();
                  maybeFinish();
                }, 500);
              } else if (ctx.audio) {
                ctx.audio.play('correct');
              }
            } else {
              say('这张作用卡描述的不是这一层，再想想材料与位置。', false);
              if (ctx.audio) ctx.audio.play('wrong');
            }
          });
        });
      }

      function resetChecks() {
        clearOverlay();
        removeFinish();
        allPlaced = false;
        mappingDone = false;
        Object.keys(answered).forEach((key) => { delete answered[key]; });
      }

      const handle = NEG.WasteBarriers.mount(container, {
        onComplete() {
          if (closed) return;
          allPlaced = true;
          maybeFinish();
        },
        onProgress(progress) {
          if (closed) return;
          if (progress === 0) {
            resetChecks();
            return;
          }
          if (progress <= layers.length) showLayerQuiz(progress - 1);
        }
      }, ctx);

      /* onComplete 可能在最后一条答题前触发；答题完成后 maybeFinish 会继续。 */
      if (handle && handle.getProgress && handle.getProgress() === layers.length) {
        allPlaced = true;
      }

      return function cleanup() {
        closed = true;
        clearOverlay();
        if (handle) handle.destroy();
        else container.innerHTML = '';
        container.classList.remove('wb-inline-host');
      };
    }
  });
})(window.NEG);
