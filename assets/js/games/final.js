import '../main-plays.js';

/* ============================================================
   核纪元 · 终章：公众科普回应 + 认知总结 + 结业认证
   ------------------------------------------------------------
   单题流程：选结论（错→解释→可重试）→ 选依据（错→解释→可重试）
   全部题目解决后，汇总“已掌握 / 已纠正 / 建议复习”，再完成认证。
   只有所有题目都完成“结论 + 依据”两关，才会发放证书。
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
    label: '公众科普回应',

    mount(container, payload, ctx, done) {
      const U = NEG.util || {};
      const ch = payload || {};
      const p1 = ch.phase_1_stats || {};
      const p2 = ch.phase_2_response || {};
      const p3 = ch.phase_3_certificate || {};
      const questions = Array.isArray(p2.questions) ? p2.questions : [];

      const st = (ctx.store && ctx.store.get) ? ctx.store.get() : {};
      const m = (st.modes && st.modes.main) || {};
      const games = m.games || {};
      const pretestKey = Object.keys(games).find((key) => /::cognition_pretest$/.test(key));
      const pretest = pretestKey ? games[pretestKey] : null;

      let attitudeAfter = m.attitude_after || '';
      let idx = 0;
      let finished = false;
      const state = questions.map(() => ({
        conclusionOk: false,
        evidenceOk: false,
        wrong: 0,
        resolved: false
      }));

      function chapterTally() {
        const doneCount = Array.isArray(m.completed) ? m.completed.length : 0;
        const total = (NEG.story && Array.isArray(NEG.story.order)) ? NEG.story.order.length : doneCount;
        const bump = (Array.isArray(m.completed) && m.completed.indexOf(ch.module_id) >= 0) ? 0 : 1;
        return { done: Math.min(total || doneCount, doneCount + bump), total: total };
      }

      function gameCount() {
        return Object.keys(games).filter((k) => k.indexOf('::final_summary') < 0).length;
      }

      function statValue(key, def) {
        if (key === 'attitude_baseline') return m.attitude_baseline || def || '未记录';
        if (key === 'knowledge_cards_collected') return String((m.cards || []).length);
        if (key === 'modules_completed') {
          const t = chapterTally();
          return t.done + ' / ' + t.total;
        }
        if (key === 'games_completed') return String(gameCount());
        if (key === 'pretest_correct') {
          return pretest && Number.isFinite(Number(pretest.total))
            ? Number(pretest.correct || 0) + ' / ' + Number(pretest.total)
            : '未记录';
        }
        return def != null ? String(def) : '—';
      }

      function fit() {
        if (NEG.mainPlays && NEG.mainPlays.fit) NEG.mainPlays.fit(container, null, 9);
      }

      /* ---------------- 阶段 1：统计 + 态度回看 ---------------- */
      function renderStats() {
        const fields = Array.isArray(p1.fields) ? p1.fields : [];
        const tally = chapterTally();
        const options = Array.isArray(p1.attitude_options) ? p1.attitude_options : [];
        const baseline = m.attitude_baseline || '未记录';

        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('trophy', 15) + ' ' + esc(p1.title || '你的核科学认知档案') + '</h3>' +
              '<span class="badge badge-amber">结业前</span>' +
            '</div>' +
            '<div class="ls-body">' +
              '<div class="ls-main" style="overflow-y:auto">' +
                '<div class="kpi-row">' + fields.map((f) => (
                  '<div class="kpi"><b>' + esc(statValue(f.key, f.default)) + '</b><span>' + esc(f.label || '') + '</span></div>'
                )).join('') + '</div>' +
                '<div class="ls-card">' +
                  '<div class="ls-ask">' + esc(p1.attitude_prompt || '现在再选一次你的态度') + '</div>' +
                  '<p class="ls-note" style="margin-top:4px">初始态度：<b>' + esc(baseline) + '</b>' +
                    (attitudeAfter ? ' → 现在：<b>' + esc(attitudeAfter) + '</b>' : '') + '</p>' +
                  '<div class="ls-chips" style="margin-top:8px">' + options.map((op) => (
                    '<button class="ls-chip" type="button" data-attitude="' + esc(op) + '"' +
                      (attitudeAfter === op ? ' style="border-color:var(--cyan);color:var(--cyan);background:rgba(56,225,255,.08)"' : '') + '>' +
                      esc(op) + '</button>'
                  )).join('') + '</div>' +
                '</div>' +
                '<div class="ls-card">' +
                  '<p class="ls-note">接下来是三道公众提问。每题需要完成“结论 + 依据”两步；答错会给出解释，可以纠正。' +
                    '全部完成后才会进入结业认证。已完成 ' + tally.done + ' / ' + tally.total + ' 章。</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="ls-foot">' +
              '<span class="ls-note">' + NEG.icon('info', 13) + ' 态度选择仅用于回看，不影响成绩。</span>' +
              '<button class="btn btn-primary btn-sm" type="button" data-start>进入公众回应' + NEG.icon('arrowRight', 14) + '</button>' +
            '</div>' +
          '</div>';

        container.querySelectorAll('[data-attitude]').forEach((btn) => {
          btn.addEventListener('click', () => {
            attitudeAfter = btn.dataset.attitude;
            if (ctx.audio) ctx.audio.play('click');
            renderStats();
          });
        });
        container.querySelector('[data-start]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('click');
          if (questions.length) renderQuestion(0); else renderSummary();
        });
      }

      /* ---------------- 阶段 2：结论 + 依据 ---------------- */
      function renderQuestion(i) {
        idx = i;
        const q = questions[i] || {};
        const s = state[i];
        const conclusions = Array.isArray(q.conclusions) ? q.conclusions : [];
        const evidence = Array.isArray(q.evidence) ? q.evidence : [];

        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('search', 15) + ' ' + esc(p2.title || '公众科普回应') + '</h3>' +
              '<span class="badge badge-cyan">第 ' + (i + 1) + ' / ' + questions.length + ' 题</span>' +
            '</div>' +
            (p2.intro_text ? '<p class="ls-intro">' + esc(p2.intro_text) + '</p>' : '') +
            '<div class="ls-body">' +
              '<div class="pr-question">' +
                '<div class="pr-left">' +
                  '<div class="pr-context"><b>' + esc(q.role || '公众') + '：</b>' + esc(q.context || '') +
                    '<div style="margin-top:6px;color:var(--text);font-weight:600">“' + esc(q.question || '') + '”</div></div>' +
                  '<div class="pr-step-title"><b>STEP 1</b> 选择结论</div>' +
                  (s.conclusionOk
                    ? '<div class="ls-feedback is-ok"><b>结论：</b>' + esc(((conclusions.find((o) => o.ok) || {}).text) || '') + '</div>'
                    : '<div class="ls-opts">' + conclusions.map((o, oi) => (
                        '<button class="ls-opt" type="button" data-conclusion="' + oi + '">' +
                          '<span class="ls-key">' + 'ABC'[oi] + '</span><span>' + esc(o.text) + '</span></button>'
                      )).join('') + '</div>') +
                '</div>' +
                '<div class="pr-right">' +
                  '<div class="pr-step-title"><b>STEP 2</b> 选择支持结论的依据</div>' +
                  (!s.conclusionOk
                    ? '<div class="ls-note" style="padding:10px;border:1px dashed var(--line);border-radius:8px">先完成左侧的结论判断，再选择依据。</div>'
                    : (s.evidenceOk
                      ? '<div class="ls-feedback is-ok"><b>依据：</b>' + esc(((evidence.find((o) => o.ok) || {}).text) || '') + '</div>' +
                        '<div class="ls-feedback">' + esc(q.explain || '') + '</div>'
                      : '<div class="ls-opts">' + evidence.map((o, oi) => (
                          '<button class="ls-opt" type="button" data-evidence="' + oi + '">' +
                            '<span class="ls-key">' + 'ABC'[oi] + '</span><span>' + esc(o.text) + '</span></button>'
                        )).join('') + '</div>')) +
                  '<div data-qfb></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="ls-foot" data-foot></div>' +
          '</div>';

        /* 结论 */
        if (!s.conclusionOk) {
          container.querySelectorAll('[data-conclusion]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const o = conclusions[Number(btn.dataset.conclusion)] || {};
              if (o.ok) {
                s.conclusionOk = true;
                if (ctx.audio) ctx.audio.play('correct');
                renderQuestion(i);
              } else {
                s.wrong++;
                btn.classList.add('is-bad');
                if (ctx.audio) ctx.audio.play('wrong');
                const holder = container.querySelector('[data-qfb]');
                if (holder) holder.innerHTML = '<div class="ls-feedback is-bad">' + esc(o.why || '再读一遍问题，注意区分不同来源与剂量。') + '</div>';
              }
            });
          });
        }

        /* 依据 */
        if (s.conclusionOk && !s.evidenceOk) {
          container.querySelectorAll('[data-evidence]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const o = evidence[Number(btn.dataset.evidence)] || {};
              if (o.ok) {
                s.evidenceOk = true;
                s.resolved = true;
                if (ctx.audio) ctx.audio.play('correct');
                renderQuestion(i);
              } else {
                s.wrong++;
                btn.classList.add('is-bad');
                if (ctx.audio) ctx.audio.play('wrong');
                const holder = container.querySelector('[data-qfb]');
                if (holder) holder.innerHTML = '<div class="ls-feedback is-bad">' + esc(o.why || '这条依据不能支持你的结论，再对照左侧结论想一想。') + '</div>';
              }
            });
          });
        }

        renderFoot(i);
      }

      function renderFoot(i) {
        const foot = container.querySelector('[data-foot]');
        if (!foot) return;
        const s = state[i];
        if (!s.resolved) {
          foot.innerHTML = '<span class="ls-note">' + NEG.icon('info', 13) + ' 完成“结论 + 依据”两步后进入下一题。</span>';
          return;
        }
        const last = i + 1 >= questions.length;
        foot.innerHTML = '<span class="ls-note">' + NEG.icon('check', 13) + ' 本题已完成。' +
          (s.wrong > 0 ? '（经过纠正）' : '（一次通过）') + '</span>' +
          '<button class="btn btn-primary btn-sm" type="button" data-next>' +
            (last ? '查看认知总结' : '下一题') + NEG.icon('arrowRight', 14) + '</button>';
        foot.querySelector('[data-next]').addEventListener('click', () => {
          if (ctx.audio) ctx.audio.play('click');
          if (last) renderSummary(); else renderQuestion(i + 1);
        });
      }

      /* ---------------- 阶段 3：总结 + 认证 ---------------- */
      function renderSummary() {
        const unresolved = state.filter((s) => !s.resolved).length;
        const mastered = [];
        const corrected = [];
        const review = [];
        questions.forEach((q, i) => {
          const s = state[i];
          if (!s.resolved) return;
          if (s.wrong === 0) mastered.push(q);
          else {
            corrected.push(q);
            if (q.review_tag) review.push(q.review_tag);
            else if (q.review) review.push(q.review);
          }
        });
        const tally = chapterTally();
        const cards = (m.cards || []).length;
        const allResolved = unresolved === 0;
        const cert = p3;

        container.innerHTML =
          '<div class="ls-game">' +
            '<div class="ls-head">' +
              '<h3>' + NEG.icon('trophy', 15) + ' 认知总结' + '</h3>' +
              '<span class="badge ' + (allResolved ? 'badge-green' : 'badge-amber') + '">' +
                (allResolved ? '已完成回应' : '还有 ' + unresolved + ' 题未完成') + '</span>' +
            '</div>' +
            '<div class="ls-body">' +
              '<div class="pr-summary ls-summary">' +
                '<div class="ls-chips">' +
                  '<span class="ls-chip">已掌握 <b>' + mastered.length + '</b></span>' +
                  '<span class="ls-chip">已纠正 <b>' + corrected.length + '</b></span>' +
                  '<span class="ls-chip">建议复习 <b>' + review.length + '</b></span>' +
                  '<span class="ls-chip">知识卡 <b>' + cards + '</b></span>' +
                  '<span class="ls-chip">章节 <b>' + tally.done + '/' + tally.total + '</b></span>' +
                '</div>' +
                '<div class="ls-card" style="padding:8px 10px">' +
                  '<div class="ls-ask">前测 → 终章</div>' +
                  '<p class="ls-note" style="margin-top:3px">前测答对 <b>' +
                    (pretest ? Number(pretest.correct || 0) + ' / ' + Number(pretest.total || 3) : '未记录') +
                    '</b>（前测不公布对错，只作起点对照）· 终章一次答对 <b>' + mastered.length + ' / ' + questions.length +
                    '</b> · 经纠正掌握 <b>' + corrected.length + '</b></p>' +
                  '<p class="ls-note">态度：<b>' + esc(m.attitude_baseline || '未记录') + '</b> → <b>' +
                    esc(attitudeAfter || '未记录') + '</b></p>' +
                '</div>' +
                '<div class="pr-lists">' +
                  '<div class="pr-list is-ok"><h5>已掌握</h5><ul>' +
                    (mastered.length ? mastered.map((q) => '<li>' + esc(q.question) + '</li>').join('') : '<li>暂无</li>') +
                  '</ul></div>' +
                  '<div class="pr-list is-fix"><h5>已纠正</h5><ul>' +
                    (corrected.length ? corrected.map((q) => '<li>' + esc(q.review || q.question) + '</li>').join('') : '<li>暂无</li>') +
                  '</ul></div>' +
                  '<div class="pr-list is-review"><h5>建议复习</h5><ul>' +
                    (review.length ? Array.from(new Set(review)).map((r) => '<li>' + esc(r) + '</li>').join('') : '<li>暂无（全部一次掌握）</li>') +
                  '</ul></div>' +
                '</div>' +
                '<div class="pr-cert">' +
                  '<span class="ls-chip" style="border-color:rgba(255,200,87,.4);color:var(--amber)">' +
                    (allResolved ? '认证条件已满足' : '认证条件未满足') + '</span>' +
                  '<h4>' + esc(cert.cert_name || '核科学认知档案管理员') + '</h4>' +
                  '<p>' + esc(cert.description || '') + '</p>' +
                  '<p style="margin-top:6px">初始态度：<b>' + esc(m.attitude_baseline || '未记录') + '</b>' +
                    (attitudeAfter ? ' → 现在：<b>' + esc(attitudeAfter) + '</b>' : '') + '</p>' +
                  '<p style="margin-top:4px">已掌握 ' + mastered.length + ' 题 · 已纠正 ' + corrected.length + ' 题' +
                    ' · 建议复习 ' + new Set(review).size + ' 个主题</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="ls-foot">' +
              (allResolved
                ? '<button class="btn btn-primary" type="button" data-finish>' +
                  NEG.icon('check', 15) + ' 完成认证并保存' + '</button>'
                : '<button class="btn btn-primary" type="button" data-resume>继续完成未答题目' + NEG.icon('arrowRight', 14) + '</button>') +
            '</div>' +
          '</div>';

        const finish = container.querySelector('[data-finish]');
        if (finish) {
          finish.addEventListener('click', () => {
            if (finished) return;
            finished = true;
            m.attitude_after = attitudeAfter || m.attitude_after || '';
            if (ctx.store && ctx.store.save) ctx.store.save();
            if (ctx.audio) ctx.audio.play('fanfare');
            done({
              ok: true,
              certificate: true,
              mastered: mastered.length,
              corrected: corrected.length,
              review: Array.from(new Set(review)),
              attitudeBefore: m.attitude_baseline || '',
              attitudeAfter: m.attitude_after || '',
              pretest: pretest ? { correct: Number(pretest.correct || 0), total: Number(pretest.total || 3) } : null
            });
          });
        }
        const resume = container.querySelector('[data-resume]');
        if (resume) {
          resume.addEventListener('click', () => {
            const next = state.findIndex((s) => !s.resolved);
            renderQuestion(next >= 0 ? next : 0);
          });
        }
        fit();
      }

      function onKey(e) {
        if (finished || (U.isTyping && U.isTyping(e))) return;
        if (document.querySelector('.overlay')) return;
        const n = ['1', '2', '3'].indexOf(e.key);
        if (n >= 0) {
          const btn = container.querySelectorAll('.ls-opt:not(:disabled)')[n];
          if (btn) { e.preventDefault(); btn.click(); }
        }
        if (e.key === 'Enter') {
          const btn = container.querySelector('[data-next]');
          if (btn) { e.preventDefault(); btn.click(); }
        }
      }
      document.addEventListener('keydown', onKey);

      renderStats();

      return function cleanup() {
        document.removeEventListener('keydown', onKey);
        container.innerHTML = '';
      };
    }
  });
})(window.NEG);
