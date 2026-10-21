/* ============================================================
   核纪元 · 剂量实验室
   对数刻度剂量对比 · 天然本底构成 · 单位换算
   ============================================================ */
(function (NEG) {
  'use strict';

  const GROUP_META = {
    daily: { icon: '🏠', color: '#38e1ff' },
    medical: { icon: '🏥', color: '#a78bfa' },
    nature: { icon: '🌍', color: '#3ef0a2' },
    work: { icon: '⚡', color: '#ffc857' },
    space: { icon: '🚀', color: '#ff6b6b' }
  };
  const LOG_MIN = -4;    // 0.0001 mSv
  const LOG_MAX = 5;     // 100 Sv

  function logWidth(v) {
    if (!(v > 0)) return 0;
    const p = (Math.log10(v) - LOG_MIN) / (LOG_MAX - LOG_MIN) * 100;
    return Math.max(2, Math.min(100, p));
  }

  NEG.registerMode({
    id: 'dose',
    order: 4,
    title: '剂量实验室',
    nav: '剂量实验室',
    icon: 'radiation',
    accent: '#a78bfa',
    blurb: '把香蕉、胸片、CT、职业限值和事故放在同一把对数标尺上。',
    progress(s) {
      const total = (NEG.data.doses || []).length || 25;
      return Math.min(1, (s.modes.dose.viewed || []).length / total);
    },
    isComplete(s) {
      const total = (NEG.data.doses || []).length;
      return total > 0 && (s.modes.dose.viewed || []).length >= total;
    },

    render(root, ctx) {
      const { store, data, ui, audio, util: U } = ctx;
      const doses = (data.doses || []).slice();
      const groups = data.doseGroups || [];
      const refs = data.doseRefs || [];
      const bg = data.background || [];
      const units = data.units || [];
      const intro = data.radiationIntro || {};
      const viewed = new Set(store.get().modes.dose.viewed || []);
      let filter = 'all';
      let activeId = null;

      const groupName = (id) => (groups.find((g) => g.id === id) || {}).name || id;

      root.innerHTML =
        ui.pageHead({
          eyebrow: 'DOSE LAB · 辐射剂量',
          icon: 'radiation',
          title: '剂量实验室',
          lead: '离开剂量谈辐射没有意义。所有剂量统一折算为 mSv，用对数刻度放在同一把尺子上比较。',
          tools: '<span class="badge badge-violet">已查看 ' + viewed.size + ' / ' + doses.length + '</span>'
        }) +
        '<div class="dose-layout">' +
          '<section class="panel dose-main anim-fade-up">' +
            '<div class="dose-toolbar">' +
              '<div class="chip-row" id="doseChips">' +
                '<button class="chip is-active" data-group="all">全部</button>' +
                groups.map((g) => '<button class="chip" data-group="' + g.id + '">' +
                  GROUP_META[g.id].icon + ' ' + U.esc(g.name) + '</button>').join('') +
              '</div>' +
              '<span class="dose-scale-note">对数刻度 · 每格 = 100 倍</span>' +
            '</div>' +
            '<div class="dose-rows" id="doseRows"></div>' +
            '<div class="dose-axis">' +
              '<span class="axis-label"></span>' +
              '<span class="axis-ticks">' +
                ['0.1 µSv', '10 µSv', '1 mSv', '100 mSv', '10 Sv'].map((t) => '<span>' + t + '</span>').join('') +
              '</span>' +
              '<span class="axis-label" style="text-align:right">mSv</span>' +
            '</div>' +
            '<p class="data-note">数据为公开资料中的典型量级（UNSCEAR、ICRP、IAEA、国家核安全局等），不同来源、不同个体可能存在差异。点击任意条目查看详情。</p>' +
          '</section>' +

          '<aside class="dose-layout-side">' +
            '<section class="panel dose-detail-card anim-fade-up d1" id="doseDetail"></section>' +
            '<section class="panel panel-pad anim-fade-up d2">' +
              '<div class="panel-head"><h3>' + NEG.icon('radiation') + '天然本底构成</h3></div>' +
              '<div class="donut-wrap">' +
                '<div class="donut">' + donutSVG(bg) +
                  '<div class="donut-center"><b>2.4</b><span>mSv / 年</span></div>' +
                '</div>' +
                '<div class="donut-legend">' +
                  bg.map((b) => '<span class="legend-item"><i style="--lc:' + (b.color || '#38e1ff') + '"></i>' +
                    U.esc(b.name) + '<b>' + b.pct + '%</b></span>').join('') +
                '</div>' +
              '</div>' +
              '<p class="data-note">全球平均年有效剂量约 2.4 mSv，其中约一半来自氡及其子体。天然本底无法避免，也不构成需要担心的风险。</p>' +
            '</section>' +
            '<section class="panel panel-pad anim-fade-up d2">' +
              '<div class="panel-head"><h3>' + NEG.icon('book') + '剂量单位小词典</h3></div>' +
              '<div class="unit-grid">' +
                units.map((u) => '<div class="unit-card"><span class="unit-sym">' + U.esc(u.unit) + '</span>' +
                  '<b>' + U.esc(u.name) + '</b><span>' + U.esc(u.desc) + '</span></div>').join('') +
              '</div>' +
              '<div class="divider"></div>' +
              '<p class="explain-text"><strong class="text-cyan">非电离辐射</strong>：' + U.esc(intro.nonIonizing || '') + '</p>' +
              '<p class="explain-text" style="margin-top:8px"><strong class="text-amber">电离辐射</strong>：' + U.esc(intro.ionizing || '') + '</p>' +
            '</section>' +
            '<section class="panel panel-pad anim-fade-up d3">' +
              '<div class="panel-head"><h3>' + NEG.icon('info') + '为什么放疗剂量不在图里？</h3></div>' +
              '<p class="explain-text">横轴比较的是<strong>全身有效剂量（mSv）</strong>。癌症放疗的 60 Gy 是<strong>局部靶区吸收剂量</strong>（戈瑞），只作用于肿瘤区域、分次照射，不能换算成全身有效剂量，因此不混入同一把尺子。剂量类型和受照范围，与剂量数值同样重要。</p>' +
            '</section>' +
            '<section class="panel panel-pad anim-fade-up d3">' +
              '<div class="panel-head"><h3>' + NEG.icon('target') + '剂量换算器</h3></div>' +
              '<div class="converter">' +
                '<div class="converter-row">' +
                  '<input id="convInput" type="number" min="0" step="any" value="0.1" aria-label="剂量数值">' +
                  '<select id="convUnit" aria-label="剂量单位">' +
                    '<option value="0.001">µSv</option>' +
                    '<option value="1" selected>mSv</option>' +
                    '<option value="1000">Sv</option>' +
                  '</select>' +
                '</div>' +
                '<div class="converter-result" id="convResult"></div>' +
                '<p class="panel-note" id="convNote">相当于约 1 次胸片的剂量量级。</p>' +
              '</div>' +
            '</section>' +
          '</aside>' +
        '</div>';

      const rowsEl = root.querySelector('#doseRows');
      const detailEl = root.querySelector('#doseDetail');
      const convInput = root.querySelector('#convInput');
      const convUnit = root.querySelector('#convUnit');
      const convResult = root.querySelector('#convResult');
      const convNote = root.querySelector('#convNote');

      /* ---------- 列表 ---------- */
      function renderRows() {
        const list = doses
          .filter((d) => filter === 'all' || d.group === filter)
          .slice()
          .sort((a, b) => a.value - b.value);
        rowsEl.innerHTML = list.map((d, i) => {
          const meta = GROUP_META[d.group] || GROUP_META.daily;
          return '<button class="dose-row ' + (activeId === d.id ? 'is-active' : '') + '" data-id="' + d.id + '" type="button">' +
            '<span class="dose-name">' +
              '<span class="dose-icon">' + (d.icon || meta.icon) + '</span>' +
              '<span class="dose-text">' + U.esc(d.name) + '</span>' +
            '</span>' +
            '<span class="dose-bar-track">' +
              '<span class="dose-bar" data-target="' + logWidth(d.value) + '" style="--bar-c:' + meta.color + '"></span>' +
            '</span>' +
            '<span class="dose-value">' + U.formatDose(d.value).replace(/^([\d.]+) (.+)$/, '$1 <span class="dose-unit">$2</span>') + '</span>' +
          '</button>';
        }).join('');

        ui.qsa('.dose-row', rowsEl).forEach((row) => {
          row.addEventListener('click', () => {
            const d = doses.find((x) => x.id === row.dataset.id);
            audio.play('click');
            selectDose(d);
          });
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            ui.qsa('.dose-bar', rowsEl).forEach((bar) => {
              bar.style.width = bar.dataset.target + '%';
            });
          });
        });
      }

      /* ---------- 详情 ---------- */
      function bananaEquiv(d) {
        const n = d.value / 0.0001;
        if (n >= 1) return U.fmtNum(n) + ' 根香蕉';
        if (n > 0) return U.trimNum(n) + ' 根香蕉';
        return '—';
      }

      function selectDose(d) {
        if (!d) return;
        activeId = d.id;
        const meta = GROUP_META[d.group] || GROUP_META.daily;
        const isNew = !viewed.has(d.id);
        viewed.add(d.id);
        if (isNew) {
          store.addScore(1, 'dose');
          store.set((st) => {
            st.modes.dose.viewed = Array.from(new Set((st.modes.dose.viewed || []).concat([d.id])));
          }, 'dose');
          ctx.achievements.checkAll();
        }
        ui.qsa('.dose-row', rowsEl).forEach((r) => r.classList.toggle('is-active', r.dataset.id === d.id));

        const barEquiv = Math.min(100, logWidth(d.value));
        detailEl.innerHTML =
          '<div class="dose-detail-hero">' +
            '<span class="dd-icon" style="background:' + meta.color + '18;border-color:' + meta.color + '45">' + (d.icon || meta.icon) + '</span>' +
            '<div><h3>' + U.esc(d.name) + '</h3><div class="dd-group">' + U.esc(groupName(d.group)) + ' · 有效剂量</div></div>' +
          '</div>' +
          '<div class="big-dose">' + U.formatDose(d.value) + '<small>典型量级</small></div>' +
          '<div class="dose-bar-track" style="margin-top:12px">' +
            '<div class="dose-bar" style="width:' + barEquiv + '%;--bar-c:' + meta.color + '"></div>' +
          '</div>' +
          '<p class="explain-text" style="margin-top:14px">' + U.esc(d.note) + '</p>' +
          '<div class="equiv-list">' +
            '<div class="equiv-item"><span class="equiv-icon">🍌</span><span>相当于 <b>' + bananaEquiv(d) + '</b></span></div>' +
            '<div class="equiv-item"><span class="equiv-icon">🫁</span><span>相当于 <b>' + U.trimNum(d.value / 0.1) + '</b> 次胸片</span></div>' +
            '<div class="equiv-item"><span class="equiv-icon">🌍</span><span>占全球平均年本底 <b>' + U.trimNum(d.value / 2.4 * 100) + '%</b></span></div>' +
            '<div class="equiv-item"><span class="equiv-icon">📏</span><span>占公众年剂量限值 <b>' + U.trimNum(d.value / 1 * 100) + '%</b></span></div>' +
          '</div>' +
          (isNew ? '<p class="hint-line" style="margin-top:10px">' + NEG.icon('check', 13) + '首次查看 +1 分</p>' : '');

        detailEl.classList.remove('anim-pop');
        void detailEl.offsetWidth;
        detailEl.classList.add('anim-pop');
      }

      /* ---------- 环形图 ---------- */
      function donutSVG(items) {
        const C = 2 * Math.PI * 54;
        let offset = 0;
        const circles = items.map((b) => {
          const len = C * (b.pct / 100);
          const c = '<circle class="donut-seg" cx="74" cy="74" r="54" stroke="' + (b.color || '#38e1ff') + '" ' +
            'stroke-dasharray="' + (len - 1.6) + ' ' + (C - len + 1.6) + '" ' +
            'stroke-dashoffset="' + (-offset) + '"><title>' + U.esc(b.name) + ' ' + b.pct + '%</title></circle>';
          offset += len;
          return c;
        }).join('');
        return '<svg viewBox="0 0 148 148">' +
          '<circle cx="74" cy="74" r="54" stroke="rgba(120,190,255,.08)" stroke-width="18" fill="none"/>' +
          circles + '</svg>';
      }

      /* ---------- 换算器 ---------- */
      function convert() {
        const v = Number(convInput.value);
        const factor = Number(convUnit.value);
        if (!isFinite(v) || v < 0) { convResult.innerHTML = ''; return; }
        const mSv = v * factor;
        convResult.innerHTML =
          '<div class="conv-out"><span>微西弗 µSv</span><b>' + U.trimNum(mSv * 1000) + '</b></div>' +
          '<div class="conv-out"><span>毫西弗 mSv</span><b>' + U.trimNum(mSv) + '</b></div>' +
          '<div class="conv-out"><span>西弗 Sv</span><b>' + U.trimNum(mSv / 1000) + '</b></div>' +
          '<div class="conv-out"><span>相当于香蕉</span><b>' + U.trimNum(mSv / 0.0001) + ' 根</b></div>';
        let note;
        if (mSv >= 1000) note = '已达到急性辐射病阈值（约 1000 mSv）量级，属于事故照射水平。';
        else if (mSv >= 100) note = '超过职业照射年剂量限值（20 mSv）的 ' + U.trimNum(mSv / 20) + ' 倍。';
        else if (mSv >= 20) note = '约为职业照射年剂量限值（20 mSv）的 ' + U.trimNum(mSv / 20 * 100) + '%。';
        else if (mSv >= 1) note = '约为公众年剂量限值（人工源 1 mSv）的 ' + U.trimNum(mSv) + ' 倍。';
        else if (mSv >= 0.1) note = '相当于 ' + U.trimNum(mSv / 0.1) + ' 次胸片的剂量量级。';
        else note = '约为全球平均年天然本底（2.4 mSv）的 ' + U.trimNum(mSv / 2.4 * 100) + '%。';
        convNote.textContent = note;
      }

      /* ---------- 交互 ---------- */
      root.querySelectorAll('[data-group]').forEach((chip) => {
        chip.addEventListener('click', () => {
          filter = chip.dataset.group;
          audio.play('click');
          root.querySelectorAll('[data-group]').forEach((c) => c.classList.toggle('is-active', c === chip));
          renderRows();
        });
      });

      convInput.addEventListener('input', convert);
      convUnit.addEventListener('change', convert);

      /* ---------- 初始化 ---------- */
      renderRows();
      convert();

      const initial = (store.get().modes.dose.viewed || []).length > 0
        ? doses.find((d) => d.id === activeId)
        : null;
      if (!initial) {
        detailEl.innerHTML =
          '<div class="dose-detail-hero">' +
            '<span class="dd-icon">' + '☢️' + '</span>' +
            '<div><h3>从一条剂量开始</h3><div class="dd-group">点击左侧任意条目查看详情</div></div>' +
          '</div>' +
          '<p class="explain-text">同样叫“辐射”，剂量可能相差上千万倍。把香蕉（0.0001 mSv）、胸片（0.1 mSv）、腹部 CT（10 mSv）和事故剂量放在一起比较，你会发现：<strong>风险取决于剂量，而不是名词。</strong></p>' +
          '<div class="equiv-list">' +
            refs.map((r) => '<div class="equiv-item"><span class="equiv-icon">📌</span><span>' + U.esc(r.label) +
              '：<b>' + U.formatDose(Number(r.value)) + '</b></span></div>').join('') +
          '</div>';
      }

      return function cleanup() { /* 无长驻监听 */ };
    }
  });
})(window.NEG);
