import '../main-plays.js';

/* ============================================================
   核纪元 · 主线关卡：防护原理体验（第七章）
   ------------------------------------------------------------
   两个场景：
     external 外照射：调时间 / 距离 / 屏蔽，把相对剂量降到目标以下
     internal 内照射：选择正确防护动作，阻止放射性物质进入体内
   每个场景达标后必须完成一次“解释”，才算真正理解。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function esc(s) {
    const U = NEG.util;
    return U && U.esc ? U.esc(s) : String(s == null ? '' : s);
  }

  const SHIELD_COLOR = {
    none: 'transparent',
    paper: '#d7dee8',
    aluminum: '#9aa7b8',
    concrete: '#8b9099',
    lead: '#5b6470'
  };

  NEG.mainPlays.register('protection_lab', {
    label: '防护原理体验',

    mount(container, payload, ctx, done) {
      const U = NEG.util || {};
      const g = payload || {};
      const ext = g.external || {};
      const inn = g.internal || {};
      const shields = Array.isArray(ext.shields) && ext.shields.length ? ext.shields : [
        { id: 'none', name: '无屏蔽', factor: 1, ok: false },
        { id: 'concrete', name: '混凝土', factor: 0.35, ok: true },
        { id: 'lead', name: '铅板', factor: 0.08, ok: true }
      ];
      const actions = Array.isArray(inn.actions) ? inn.actions : [];
      const goal = Number(ext.goal) || 10;

      let phase = 'external';
      const ex = { time: 10, distance: 1, shield: 'none', quizOk: false, quizWrong: 0, shieldWarned: false };
      const ins = { picked: [], submitted: false, correct: false, wrong: 0, quizOk: false, quizWrong: 0 };
      let finished = false;

      container.innerHTML =
        '<div class="ls-game">' +
          '<div class="ls-head">' +
            '<h3>' + NEG.icon('shield', 15) + ' ' + esc(g.title || '防护原理体验') + '</h3>' +
            '<span class="badge badge-cyan" data-step>01 · 外照射</span>' +
          '</div>' +
          (g.intro_text ? '<p class="ls-intro">' + esc(g.intro_text) + '</p>' : '') +
          '<div class="ls-body" data-body></div>' +
          '<div class="ls-foot" data-foot></div>' +
        '</div>';

      const bodyEl = container.querySelector('[data-body]');
      const footEl = container.querySelector('[data-foot]');
      const stepEl = container.querySelector('[data-step]');

      function say(html) { footEl.innerHTML = html; }

      function shieldOf(id) {
        return shields.find((s) => s.id === id) || shields[0];
      }

      function dosePercent() {
        const d = Math.max(1, Number(ex.distance) || 1);
        const t = Math.max(1, Number(ex.time) || 1);
        const f = Number(shieldOf(ex.shield).factor);
        return (t / 10) * (1 / (d * d)) * f * 100;
      }

      function externalViz() {
        const d = Math.max(1, Number(ex.distance) || 1);
        const t = Math.max(1, Number(ex.time) || 1);
        const dose = dosePercent();
        const shield = shieldOf(ex.shield);
        const sourceX = 56;
        const personX = 138 + (d / 10) * 218;
        const shieldX = (sourceX + personX) / 2 - 5;
        const shieldColor = SHIELD_COLOR[ex.shield] || 'transparent';
        const rayOpacity = Math.max(0.08, Math.min(0.9, dose / 100));

        const rays = [0, 1, 2, 3, 4].map((i) => {
          const spread = (i - 2) * 16;
          return '<line x1="' + (sourceX + 18) + '" y1="120" x2="' + (personX - 10) +
            '" y2="' + (116 + spread) + '" stroke="rgba(255,200,87,' + rayOpacity.toFixed(2) +
            ')" stroke-width="1.4" stroke-dasharray="5 5"/>';
        }).join('');

        return '<svg class="pl-svg" viewBox="0 0 420 240" role="img" aria-label="外照射剂量示意：源、屏蔽与人员">' +
          '<defs><radialGradient id="pl-src"><stop offset="0" stop-color="#ffe6a0"/><stop offset="1" stop-color="rgba(255,180,60,0)"/></radialGradient></defs>' +
          '<rect x="0" y="0" width="420" height="240" fill="transparent"/>' +
          '<circle cx="' + sourceX + '" cy="120" r="34" fill="url(#pl-src)" opacity="0.8"/>' +
          '<circle cx="' + sourceX + '" cy="120" r="13" fill="#ffc857" stroke="#ffe6a0" stroke-width="1.5"/>' +
          '<text x="' + sourceX + '" y="158" text-anchor="middle" fill="#ffc857" font-size="10" font-family="monospace">Co-60 γ</text>' +
          rays +
          '<rect x="' + shieldX + '" y="74" width="10" height="92" rx="2" fill="' + shieldColor + '" opacity="' + (ex.shield === 'none' ? 0 : 0.9) + '"/>' +
          (ex.shield !== 'none'
            ? '<text x="' + (shieldX + 5) + '" y="66" text-anchor="middle" fill="rgba(200,220,240,.7)" font-size="9">' + esc(shield.name) + '</text>'
            : '') +
          '<circle cx="' + personX + '" cy="96" r="12" fill="none" stroke="#8fe9ff" stroke-width="1.6"/>' +
          '<path d="M' + (personX - 14) + ' 154 L' + (personX - 14) + ' 118 Q' + personX + ' 102 ' + (personX + 14) + ' 118 L' + (personX + 14) + ' 154" fill="none" stroke="#8fe9ff" stroke-width="1.6"/>' +
          '<text x="' + personX + '" y="178" text-anchor="middle" fill="rgba(143,233,255,.8)" font-size="9">工作人员</text>' +
          '<line x1="' + sourceX + '" y1="204" x2="' + personX + '" y2="204" stroke="rgba(120,190,255,.35)" stroke-width="1" stroke-dasharray="3 4"/>' +
          '<text x="' + ((sourceX + personX) / 2) + '" y="218" text-anchor="middle" fill="rgba(160,185,210,.7)" font-size="9">距离 ' + d + ' m</text>' +
          '</svg>';
      }

      function renderExternal() {
        const dose = dosePercent();
        const shield = shieldOf(ex.shield);
        const reached = dose <= goal && !!shield.ok && ex.quizOk;

        bodyEl.innerHTML =
          '<div class="pl-wrap">' +
            '<div class="pl-viz" data-viz>' + externalViz() + '</div>' +
            '<div class="pl-side">' +
              '<div class="ls-card" style="padding:8px 10px">' +
                '<div class="svc-step-badge"><b>外照射</b> 源在体外，射线从外部照射人体</div>' +
                '<p class="ls-note" style="margin-top:3px">' + esc(ext.setup || '') + '</p>' +
              '</div>' +
              '<div class="pl-control">' +
                '<div class="pl-control-top"><span>作业时间</span><b data-time>' + ex.time + ' 分钟</b></div>' +
                '<input type="range" min="1" max="10" step="1" value="' + ex.time + '" data-time-range aria-label="作业时间">' +
              '</div>' +
              '<div class="pl-control">' +
                '<div class="pl-control-top"><span>与源距离</span><b data-dist>' + ex.distance + ' m</b></div>' +
                '<input type="range" min="1" max="10" step="1" value="' + ex.distance + '" data-dist-range aria-label="与源距离">' +
              '</div>' +
              '<div class="pl-control">' +
                '<div class="pl-control-top"><span>屏蔽材料</span></div>' +
                '<div class="pl-shields" data-shields>' + shields.map((s) => (
                  '<button class="pl-shield' + (ex.shield === s.id ? ' is-on' : '') + '" type="button" data-shield="' + s.id + '">' + esc(s.name) + '</button>'
                )).join('') + '</div>' +
              '</div>' +
              '<div class="pl-dose' + (dose > goal ? (dose > 50 ? ' is-bad' : ' is-warn') : '') + '" data-dose>' +
                '<div class="pl-dose-top"><span>相对剂量</span><b data-dose-val>' + (dose < 1 ? dose.toFixed(2) : dose.toFixed(1)) + '%</b></div>' +
                '<div class="pl-dose-track"><i data-dose-bar style="width:' + Math.max(0, Math.min(100, dose)) + '%"></i></div>' +
              '</div>' +
              '<div class="pl-goal">目标：相对剂量 ≤ ' + goal + '%，并且选择对 γ 射线有效的屏蔽。' +
                '<span data-shield-note>' + (shield.ok ? '' : ' 当前屏蔽对钴-60 的 γ 射线几乎无效。') + '</span></div>' +
              '<div data-quiz></div>' +
            '</div>' +
          '</div>';

        bindExternal();
        updateQuiz();
        renderFoot();
      }

      function bindExternal() {
        const timeRange = bodyEl.querySelector('[data-time-range]');
        const distRange = bodyEl.querySelector('[data-dist-range]');
        timeRange.addEventListener('input', () => {
          ex.time = Number(timeRange.value);
          bodyEl.querySelector('[data-time]').textContent = ex.time + ' 分钟';
          updateExternal();
        });
        distRange.addEventListener('input', () => {
          ex.distance = Number(distRange.value);
          bodyEl.querySelector('[data-dist]').textContent = ex.distance + ' m';
          updateExternal();
        });
        bodyEl.querySelectorAll('[data-shield]').forEach((btn) => {
          btn.addEventListener('click', () => {
            ex.shield = btn.dataset.shield;
            bodyEl.querySelectorAll('[data-shield]').forEach((b) => b.classList.toggle('is-on', b === btn));
            updateExternal();
          });
        });
      }

      function updateExternal() {
        const dose = dosePercent();
        const shield = shieldOf(ex.shield);
        const viz = bodyEl.querySelector('[data-viz]');
        if (viz) viz.innerHTML = externalViz();
        const val = bodyEl.querySelector('[data-dose-val]');
        if (val) val.textContent = dose < 1 ? dose.toFixed(2) + '%' : dose.toFixed(1) + '%';
        const bar = bodyEl.querySelector('[data-dose-bar]');
        if (bar) bar.style.width = Math.max(0, Math.min(100, dose)) + '%';
        const box = bodyEl.querySelector('[data-dose]');
        if (box) {
          box.classList.toggle('is-warn', dose > goal && dose <= 50);
          box.classList.toggle('is-bad', dose > 50);
        }
        const note = bodyEl.querySelector('[data-shield-note]');
        if (note) note.innerHTML = shield.ok ? '' : ' 当前屏蔽对钴-60 的 γ 射线几乎无效。';
        updateQuiz();
        renderFoot();
      }

      function updateQuiz() {
        const holder = bodyEl.querySelector('[data-quiz]');
        if (!holder) return;
        const dose = dosePercent();
        const shield = shieldOf(ex.shield);
        const ok = dose <= goal && !!shield.ok;
        const q = ext.quiz || {};
        if (!ok) { holder.innerHTML = ''; return; }
        if (ex.quizOk) {
          holder.innerHTML = '<div class="ls-feedback is-ok">' + NEG.icon('check', 13) + ' 外照射防护已达标，解释也通过了。</div>';
          return;
        }
        const options = Array.isArray(q.options) ? q.options : [];
        holder.innerHTML =
          '<div class="ls-card" style="padding:8px 10px">' +
            '<div class="svc-step-badge"><b>解释</b> 为什么这样选？</div>' +
            '<div class="ls-ask" style="margin:4px 0 6px">' + esc(q.question || '') + '</div>' +
            '<div class="ls-opts">' + options.map((o, i) => (
              '<button class="ls-opt" type="button" data-ext-opt="' + i + '">' +
                '<span class="ls-key">' + 'ABC'[i] + '</span><span>' + esc(o.text) + '</span></button>'
            )).join('') + '</div>' +
            '<div data-ext-fb></div>' +
          '</div>';
        holder.querySelectorAll('[data-ext-opt]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const opt = options[Number(btn.dataset.extOpt)] || {};
            if (opt.ok) {
              ex.quizOk = true;
              if (ctx.audio) ctx.audio.play('correct');
              updateQuiz();
              renderFoot();
            } else {
              ex.quizWrong++;
              if (ctx.audio) ctx.audio.play('wrong');
              btn.classList.add('is-bad');
              const fb = holder.querySelector('[data-ext-fb]');
              if (fb) fb.innerHTML = '<div class="ls-feedback is-bad">' + esc(opt.why || q.feedbackBad || '再想一想。') + '</div>';
            }
          });
        });
      }

      function renderInternal() {
        const correctText = [];
        const picked = ins.picked;
        bodyEl.innerHTML =
          '<div class="ls-main">' +
            '<div class="ls-card" style="flex:0 0 auto">' +
              '<div class="svc-step-badge"><b>内照射</b> 放射性物质可能通过吸入、食入或伤口进入体内</div>' +
              '<p class="ls-note" style="margin-top:3px">' + esc(inn.setup || '') + '</p>' +
            '</div>' +
            '<div class="ls-ask">请选择 ' + (inn.need || 3) + ' 项正确防护措施，然后提交。</div>' +
            '<div class="pl-actions">' + actions.map((a, i) => (
              '<button class="pl-action' + (picked.indexOf(i) >= 0 ? ' is-on' : '') + '" type="button" data-inner="' + i + '">' +
                '<span class="ls-key">' + (i + 1) + '</span><span>' + esc(a.text) + '</span></button>'
            )).join('') + '</div>' +
            '<div data-inner-fb></div>' +
            (ins.quizOk ? '<div class="ls-feedback is-ok">' + NEG.icon('check', 13) + ' 内照射防护判断正确。</div>' : '') +
          '</div>';

        bodyEl.querySelectorAll('[data-inner]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (ins.correct) return;
            const i = Number(btn.dataset.inner);
            const p = picked.indexOf(i);
            if (p >= 0) picked.splice(p, 1);
            else if (picked.length < (inn.need || 3)) picked.push(i);
            if (ctx.audio) ctx.audio.play('click');
            renderInternal();
            renderFoot();
          });
        });

        if (ins.submitted) {
          const fb = bodyEl.querySelector('[data-inner-fb]');
          const chosen = picked.slice().sort((a, b) => a - b);
          const right = actions.map((a, i) => a.ok ? i : -1).filter((i) => i >= 0).sort((a, b) => a - b);
          const isRight = chosen.length === right.length && chosen.every((v, i) => v === right[i]);
          if (fb) {
            fb.innerHTML = '<div class="ls-feedback ' + (isRight ? 'is-ok' : 'is-bad') + '">' +
              (isRight ? esc(inn.feedbackOk || '正确。内照射防护的核心是阻止放射性物质进入体内。') :
                esc(inn.feedbackBad || '还有不正确或漏选的动作，看看每项的提示。')) + '</div>';
          }
          bodyEl.querySelectorAll('[data-inner]').forEach((btn) => {
            const i = Number(btn.dataset.inner);
            const a = actions[i] || {};
            if (a.ok) btn.classList.add('is-ok');
            else if (picked.indexOf(i) >= 0) btn.classList.add('is-bad');
            btn.disabled = true;
          });
        }
        renderFoot();
      }

      function renderFoot() {
        if (phase === 'external') {
          const dose = dosePercent();
          const shield = shieldOf(ex.shield);
          const extDone = dose <= goal && !!shield.ok && ex.quizOk;
          say(
            '<span class="ls-note">' + NEG.icon('info', 13) + ' ' +
              (extDone ? '外照射达标。' : '调整时间、距离和屏蔽，把相对剂量降到 ' + goal + '% 以下。') + '</span>' +
            (extDone
              ? '<button class="btn btn-primary btn-sm" type="button" data-next>进入内照射场景' + NEG.icon('arrowRight', 14) + '</button>'
              : '')
          );
          const btn = footEl.querySelector('[data-next]');
          if (btn) btn.addEventListener('click', () => {
            phase = 'internal';
            stepEl.textContent = '02 · 内照射';
            if (ctx.audio) ctx.audio.play('click');
            renderInternal();
          });
          return;
        }

        if (phase === 'internal') {
          const allOk = ins.correct && ins.quizOk;
          if (!ins.submitted) {
            say('<span class="ls-note">' + NEG.icon('info', 13) + ' 已选 ' + ins.picked.length + ' / ' + (inn.need || 3) + ' 项。</span>' +
              '<button class="btn btn-primary btn-sm" type="button" data-submit' +
              (ins.picked.length === (inn.need || 3) ? '' : ' disabled') + '>提交判断' + NEG.icon('arrowRight', 14) + '</button>');
            const submit = footEl.querySelector('[data-submit]');
            if (submit) submit.addEventListener('click', () => {
              ins.submitted = true;
              const chosen = ins.picked.slice().sort((a, b) => a - b);
              const right = actions.map((a, i) => a.ok ? i : -1).filter((i) => i >= 0).sort((a, b) => a - b);
              ins.correct = chosen.length === right.length && chosen.every((v, i) => v === right[i]);
              if (ctx.audio) ctx.audio.play(ins.correct ? 'correct' : 'wrong');
              renderInternal();
              renderFoot();
            });
            return;
          }
          if (!ins.correct) {
            say('<span class="ls-note">解释已给出，把选错的动作去掉，再提交一次。</span>' +
              '<button class="btn btn-ghost btn-sm" type="button" data-retry>重新选择</button>');
            const retry = footEl.querySelector('[data-retry]');
            if (retry) retry.addEventListener('click', () => {
              ins.submitted = false;
              ins.correct = false;
              ins.picked = [];
              renderInternal();
              renderFoot();
            });
            return;
          }
          /* 动作正确后，做解释题 */
          if (!ins.quizOk) {
            const q = inn.quiz || {};
            const options = Array.isArray(q.options) ? q.options : [];
            say('<span class="ls-note">最后一步：解释内照射防护的核心。</span>');
            const holder = bodyEl.querySelector('[data-inner-fb]');
            if (holder && !holder.querySelector('[data-inner-quiz]')) {
              holder.innerHTML += '<div class="ls-card" style="padding:8px 10px;margin-top:6px" data-inner-quiz>' +
                '<div class="ls-ask">' + esc(q.question || '') + '</div>' +
                '<div class="ls-opts" style="margin-top:6px">' + options.map((o, i) => (
                  '<button class="ls-opt" type="button" data-inner-opt="' + i + '">' +
                    '<span class="ls-key">' + 'ABC'[i] + '</span><span>' + esc(o.text) + '</span></button>'
                )).join('') + '</div><div data-inner-qfb></div></div>';
              holder.querySelectorAll('[data-inner-opt]').forEach((btn) => {
                btn.addEventListener('click', () => {
                  const opt = options[Number(btn.dataset.innerOpt)] || {};
                  if (opt.ok) {
                    ins.quizOk = true;
                    if (ctx.audio) ctx.audio.play('correct');
                    renderInternal();
                    renderFoot();
                  } else {
                    btn.classList.add('is-bad');
                    const qfb = holder.querySelector('[data-inner-qfb]');
                    if (qfb) qfb.innerHTML = '<div class="ls-feedback is-bad">' + esc(opt.why || q.feedbackBad || '再想想。') + '</div>';
                  }
                });
              });
            }
            return;
          }
          /* 全部完成 */
          if (!finished) { finished = true; showSummary(); }
        }
      }

      function showSummary() {
        const dose = dosePercent();
        bodyEl.innerHTML =
          '<div class="ls-main">' +
            '<div class="ls-card" style="flex:0 0 auto">' +
              '<div class="ls-ask">' + esc(g.summary_title || '两句话记住防护原理') + '</div>' +
              '<p class="ls-note" style="margin-top:4px">外照射：缩短时间、增大距离、加合适屏蔽（γ 用高密度材料）。内照射：阻止吸入、食入和伤口进入，靠通风、负压、防护装备与规范操作。</p>' +
            '</div>' +
            '<div class="ls-chips">' +
              '<span class="ls-chip">外照射最终相对剂量 <b>' + dose.toFixed(1) + '%</b></span>' +
              '<span class="ls-chip">内照射动作 <b>' + (inn.need || 3) + ' 项</b></span>' +
            '</div>' +
            '<div class="pr-lists">' +
              '<div class="pr-list is-ok"><h5>外照射三原则</h5><ul><li>时间：越短越好</li><li>距离：越远越好（剂量约按距离平方反比下降）</li><li>屏蔽：γ 射线用混凝土、铅等高密度材料</li></ul></div>' +
              '<div class="pr-list is-ok"><h5>内照射防护</h5><ul><li>通风与负压，降低空气浓度</li><li>正压防护服、手套箱等隔离</li><li>不在控制区饮食、吸烟</li></ul></div>' +
              '<div class="pr-list is-fix"><h5>常见误区</h5><ul><li>碘盐不能当“防辐射药”</li><li>纸和铝挡不住 γ 射线</li><li>植物不能吸收电磁辐射</li></ul></div>' +
            '</div>' +
          '</div>';
        say('<span class="ls-note">' + NEG.icon('check', 13) + ' 两个场景都完成了。</span>' +
          '<button class="btn btn-primary btn-sm" type="button" data-done>完成本章' + NEG.icon('arrowRight', 14) + '</button>');
        footEl.querySelector('[data-done]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('fanfare');
          done({ ok: true, externalDose: Math.round(dose * 10) / 10, internalCorrect: ins.correct, quizCorrect: ex.quizOk && ins.quizOk });
        });
      }

      function onKey(e) {
        if (finished || (U.isTyping && U.isTyping(e))) return;
        if (document.querySelector('.overlay')) return;
        const n = ['1', '2', '3', '4', '5'].indexOf(e.key);
        if (n >= 0) {
          const btn = bodyEl.querySelectorAll('.pl-action, .ls-opt:not(:disabled)')[n];
          if (btn) { e.preventDefault(); btn.click(); }
        }
      }
      document.addEventListener('keydown', onKey);

      renderExternal();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
