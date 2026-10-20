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
  const ANNUAL_REFERENCES = [
    { id: 'public', label: '公众额外照射', value: 1, color: '#38e1ff' },
    { id: 'background', label: '天然本底均值', value: 2.4, color: '#3ef0a2' },
    { id: 'occupational', label: '职业照射', value: 20, color: '#ffc857' }
  ];
  // 次数上限只限定教学工具的输入范围，不是医学或辐射防护建议。
  const ANNUAL_COUNT_MAX = 1000;

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
      const bg = data.background || [];
      const units = data.units || [];
      const intro = data.radiationIntro || {};
      const viewed = new Set(store.get().modes.dose.viewed || []);
      let filter = 'all';
      let activeId = null;
      const annualEvents = [
        { id: 'flight-long', label: '长途飞行', category: 'travel', fallback: 0.06, scope: '约 10 小时，单程' },
        { id: 'chest-xray', label: '胸片', category: 'medical', fallback: 0.1, scope: '正侧位合计' },
        { id: 'head-ct', label: '头部 CT', category: 'medical', fallback: 2, scope: '一次检查' },
        { id: 'chest-ct', label: '胸部 CT', category: 'medical', fallback: 7, scope: '常规检查，FDA 代表值' },
        { id: 'dental-xray', label: '牙科 X 光', category: 'medical', fallback: 0.005, scope: '一次根尖片' }
      ].map((event) => {
        const existing = doses.find((d) => d.id === event.id);
        return Object.assign({}, event, { value: existing ? existing.value : event.fallback });
      });
      const annualFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 3 });
      const convertFormat = new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 10 });

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
          '<div class="dose-layout-main">' +
          '<section class="panel dose-main anim-fade-up">' +
            '<div class="dose-toolbar">' +
              '<div class="chip-row" id="doseChips">' +
                '<button class="chip is-active" data-group="all">全部</button>' +
                groups.map((g) => '<button class="chip" data-group="' + g.id + '">' +
                  GROUP_META[g.id].icon + ' ' + U.esc(g.name) + '</button>').join('') +
              '</div>' +
              '<span class="dose-scale-note">对数刻度 · 相同间距代表相同比率</span>' +
            '</div>' +
            '<fieldset class="dose-reference-controls"><legend>年度参考线 · 可切换显示</legend>' +
              ANNUAL_REFERENCES.map((ref) => '<label style="--ref-color:' + ref.color + '">' +
                '<input type="checkbox" data-dose-reference="' + ref.id + '" checked>' +
                '<span>' + ref.label + ' <b>' + ref.value + ' mSv/年</b></span></label>').join('') +
            '</fieldset>' +
            '<div class="dose-plot">' +
              '<div class="dose-rows" id="doseRows"></div>' +
              '<div class="dose-reference-grid" aria-hidden="true"><div class="dose-reference-lines">' +
                ANNUAL_REFERENCES.map((ref) => '<span class="dose-reference-line" data-reference-line="' + ref.id + '" ' +
                  'style="left:' + logWidth(ref.value) + '%;--ref-color:' + ref.color + '"></span>').join('') +
              '</div></div>' +
            '</div>' +
            '<div class="dose-axis">' +
              '<span class="axis-label"></span>' +
              '<span class="axis-ticks">' +
                [{ value: 0.0001, label: '0.1 µSv' }, { value: 0.01, label: '10 µSv' }, { value: 1, label: '1 mSv' },
                  { value: 100, label: '100 mSv' }, { value: 100000, label: '100 Sv' }]
                  .map((tick) => '<span style="left:' + Math.max(0, (Math.log10(tick.value) - LOG_MIN) / (LOG_MAX - LOG_MIN) * 100) + '%">' + tick.label + '</span>').join('') +
              '</span>' +
              '<span class="axis-label" style="text-align:right">mSv</span>' +
            '</div>' +
            '<p class="dose-reference-note">参考线是<strong>年有效剂量</strong>，仅用于量级参照。公众 1 mSv/年指受监管计划照射的额外公众剂量，<strong>不含天然本底、患者医疗照射和职业照射</strong>。职业 20 mSv/年为连续 5 年平均（合计 ≤100 mSv），单年 ≤50 mSv。不能据此将一次医疗检查机械判为“超标”。</p>' +
            '<p class="data-note">数据为公开资料中的典型量级（UNSCEAR、ICRP、IAEA、国家核安全局等），不同来源、不同个体可能存在差异。点击任意条目查看详情。</p>' +
          '</section>' +
          '<section class="panel panel-pad dose-annual anim-fade-up d1" aria-labelledby="annualDoseTitle">' +
            '<div class="panel-head"><h3 id="annualDoseTitle">' + NEG.icon('target') + '年度剂量估算器</h3></div>' +
            '<p class="explain-text">填入一年内的次数，查看医疗、出行与天然本底的剂量分项。所有次数默认 0，按代表值相加。</p>' +
            '<form id="annualDoseForm" novalidate>' +
              '<div class="annual-dose-inputs">' +
                annualEvents.map((event) => '<div class="annual-dose-field">' +
                  '<label for="annual-' + event.id + '">' + U.esc(event.label) + '<span class="sr-only">年度次数</span>' +
                    '<small>' + annualFormat.format(event.value) + ' mSv/次 · ' + U.esc(event.scope) + '</small></label>' +
                  '<div class="annual-dose-count"><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="8" ' +
                    'id="annual-' + event.id + '" name="' + event.id + '" value="0" autocomplete="off" ' +
                    'aria-describedby="annualInputHelp annual-error-' + event.id + '"><span aria-hidden="true">次</span></div>' +
                  '<p class="annual-dose-error" id="annual-error-' + event.id + '" hidden></p>' +
                '</div>').join('') +
              '</div>' +
              '<p class="panel-note" id="annualInputHelp">每项填 0–1000 的整数；此范围只用于本教学工具，并非医学建议。</p>' +
              '<div class="annual-dose-actions">' +
                '<label class="annual-dose-background"><input type="checkbox" id="annualIncludeBackground" name="background">计入全球平均天然本底 <b>2.4 mSv/年</b></label>' +
                '<button type="reset" class="btn btn-ghost btn-sm" id="annualDoseReset">全部清零</button>' +
              '</div>' +
              '<div class="annual-dose-results" id="annualDoseResults" role="status" aria-live="polite" aria-atomic="true"></div>' +
            '</form>' +
            '<p class="dose-annual-scope">这是全年有效剂量的粗略估算，不是个人实测值、诊疗建议或限值判定。实际医疗剂量依设备、检查方案与个体而变；飞行剂量依航线、高度、时长而变。未列项目不计入，本底采用全球均值，不能替代当地水平。总量不能直接与公众或职业限值比较。</p>' +
            '<details class="dose-sources"><summary>代表值与原始资料</summary>' +
              '<ul><li>长途飞行沿用本数据集的 0.06 mSv/次（约 10 小时、代表范围 0.04–0.08），不是固定航线的实测值。' +
                '<a href="https://www.cdc.gov/radiation-health/data-research/facts-stats/air-travel.html" target="_blank" rel="noopener noreferrer">CDC · Air Travel</a> 另给出美国东西海岸单程约 0.035 mSv 的示例；飞行时长、高度和纬度决定实际剂量，两个示例不能等同。</li>' +
              '<li>胸片沿用 0.1 mSv（本数据集正侧位合计代表值），普通牙科 X 光沿用 0.005 mSv（不含全景片和锥形束 CT）：' +
                '<a href="https://www.radiologyinfo.org/en/info/safety-xray" target="_blank" rel="noopener noreferrer">ACR / RSNA · Radiation Dose</a>。不同机构代表值可能不同；本工具胸部 CT 采用下列 FDA 数值。</li>' +
              '<li>头部 CT 沿用 2 mSv；胸部 CT 取 7 mSv：' +
                '<a href="https://www.fda.gov/radiation-emitting-products/medical-x-ray-imaging/what-are-radiation-risks-ct" target="_blank" rel="noopener noreferrer">FDA · What are the Radiation Risks from CT?</a>。表内数值为成人检查的典型值，不能代替检查报告。</li>' +
              '<li>本底与防护口径：<a href="https://www.unscear.org/unscear/en/publications/2008_1.html" target="_blank" rel="noopener noreferrer">UNSCEAR 2008 报告</a>；' +
                '<a href="https://www.iaea.org/publications/8930/radiation-protection-and-safety-of-radiation-sources-international-basic-safety-standards" target="_blank" rel="noopener noreferrer">IAEA · GSR Part 3</a>。</li></ul>' +
            '</details>' +
          '</section>' +
          '</div>' +

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
              '<p class="data-note">全球平均年有效剂量约 2.4 mSv，其中约一半来自氡及其子体；各地区水平不同。改善通风、开展当地氡检测等措施有助于减少部分天然照射。</p>' +
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
            '<details class="panel panel-pad dose-therapy anim-fade-up d3" id="doseTherapy">' +
              '<summary>' + NEG.icon('info') + '<span>为什么放疗的 Gy 不能直接与 Sv 比？</span></summary>' +
              '<p class="explain-text">本图主要比较<strong>有效剂量（mSv）</strong>的量级。放疗中所说的 60 Gy 是<strong>靶区吸收剂量</strong>（戈瑞），往往分次给予；正常组织也可能受照。Gy 与 Sv 描述不同物理量，不能把局部靶区的 Gy 直接当作全身有效剂量。辐射类型、受照组织、范围和时间同样重要。</p>' +
              '<p class="data-note">事故条目含由全身急性吸收剂量给出的近似量级，仅供科普比较；不能用于医疗剂量换算或个人风险判断。</p>' +
            '</details>' +
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
      const annualForm = root.querySelector('#annualDoseForm');
      const annualBackground = root.querySelector('#annualIncludeBackground');
      const annualResults = root.querySelector('#annualDoseResults');
      const annualInputs = annualEvents.map((event) => ({
        event,
        input: root.querySelector('#annual-' + event.id),
        error: root.querySelector('#annual-error-' + event.id)
      }));

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
          '</div>' +
          '<p class="dose-comparison-note">以上仅比较典型量级，不判断个人风险。香蕉当量不能按食用数量线性累加为人体额外年剂量；医疗检查不按公众年度限值判定是否“超标”。</p>' +
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
        const raw = convInput.value.trim();
        const v = Number(raw);
        const factor = Number(convUnit.value);
        if (!raw || !Number.isFinite(v) || v < 0 || !Number.isFinite(v * factor) || v * factor > 1e9) {
          convInput.setAttribute('aria-invalid', 'true');
          convResult.innerHTML = '';
          convNote.textContent = '请输入非负的有限剂量数值（本工具换算上限为 10 亿 mSv）。';
          return;
        }
        convInput.removeAttribute('aria-invalid');
        const mSv = v * factor;
        convResult.innerHTML =
          '<div class="conv-out"><span>微西弗 µSv</span><b>' + convertFormat.format(mSv * 1000) + '</b></div>' +
          '<div class="conv-out"><span>毫西弗 mSv</span><b>' + convertFormat.format(mSv) + '</b></div>' +
          '<div class="conv-out"><span>西弗 Sv</span><b>' + convertFormat.format(mSv / 1000) + '</b></div>' +
          '<div class="conv-out"><span>相当于香蕉</span><b>' + U.trimNum(mSv / 0.0001) + ' 根</b></div>';
        convNote.textContent = '约为全球平均年天然本底（2.4 mSv）的 ' + U.trimNum(mSv / 2.4 * 100) +
          '%，仅作量级类比。单位换算不能判断急性效应或是否超限，还需区分受照范围、时长与剂量类型。';
      }

      /* ---------- 年度代表剂量估算 ---------- */
      function estimateAnnualDose() {
        const totals = { medical: 0, travel: 0, background: annualBackground.checked ? 2.4 : 0 };
        let invalid = false;
        let count = 0;
        annualInputs.forEach(({ event, input, error }) => {
          const raw = input.value.trim();
          const numeric = Number(raw);
          let message = '';
          if (!raw) message = '请输入次数；没有发生请填 0。';
          else if (!/^\d+$/.test(raw) || !Number.isSafeInteger(numeric) || numeric < 0) message = '请输入 0–1000 的整数，不使用负数、小数或字母。';
          else if (numeric > ANNUAL_COUNT_MAX) message = '超出工具输入范围，请填 0–1000 的整数。';
          error.textContent = message;
          error.hidden = !message;
          if (message) {
            invalid = true;
            input.setAttribute('aria-invalid', 'true');
          } else {
            input.removeAttribute('aria-invalid');
            totals[event.category] += numeric * event.value;
            count += numeric;
          }
        });
        if (invalid) {
          annualResults.innerHTML = '<p class="annual-dose-invalid">请先修正标出的次数，本次暂不估算。</p>';
          return false;
        }
        const total = totals.medical + totals.travel + totals.background;
        annualResults.innerHTML =
          '<div class="annual-dose-total"><span>全年所选项目估算</span><output id="annualDoseTotal">' +
            (total > 0 ? '约 ' : '') + annualFormat.format(total) + ' <small>mSv / 年</small></output></div>' +
          '<dl class="annual-dose-breakdown">' +
            '<div><dt>医疗检查</dt><dd id="annualMedicalTotal">' + annualFormat.format(totals.medical) + ' mSv</dd></div>' +
            '<div><dt>出行 · 飞行</dt><dd id="annualTravelTotal">' + annualFormat.format(totals.travel) + ' mSv</dd></div>' +
            '<div><dt>天然本底' + (annualBackground.checked ? '' : ' · 未计入') + '</dt><dd id="annualBackgroundTotal">' + annualFormat.format(totals.background) + ' mSv</dd></div>' +
          '</dl>' +
          '<p class="panel-note">' + (count === 0
            ? (annualBackground.checked ? '事件次数均为 0，仅计入全球平均天然本底。' : '尚未计入事件或天然本底。填写次数即可自动估算。')
            : '按一年内 ' + annualFormat.format(count) + ' 次所选事件计算；不包含未列出的照射。') + '</p>';
        return true;
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
      root.querySelectorAll('[data-dose-reference]').forEach((toggle) => {
        toggle.addEventListener('change', () => {
          const line = root.querySelector('[data-reference-line="' + toggle.dataset.doseReference + '"]');
          line.hidden = !toggle.checked;
        });
      });
      annualInputs.forEach(({ input }) => input.addEventListener('input', estimateAnnualDose));
      annualBackground.addEventListener('change', estimateAnnualDose);
      annualForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!estimateAnnualDose()) annualForm.querySelector('[aria-invalid="true"]').focus();
      });
      annualForm.addEventListener('reset', (event) => {
        event.preventDefault();
        annualInputs.forEach(({ input }) => { input.value = '0'; });
        annualBackground.checked = false;
        estimateAnnualDose();
      });

      /* ---------- 初始化 ---------- */
      renderRows();
      convert();
      estimateAnnualDose();

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
            ANNUAL_REFERENCES.map((r) => '<div class="equiv-item"><span class="equiv-icon">📌</span><span>' + U.esc(r.label) +
              '：<b>' + r.value + ' mSv/年</b></span></div>').join('') +
          '</div>' +
          '<p class="dose-comparison-note">职业参考值为连续 5 年平均，单年 ≤50 mSv。年度参考线不用于判断一次医疗检查是否“超标”，详细口径见图下说明。</p>';
      }

      return function cleanup() { /* 无长驻监听 */ };
    }
  });
})(window.NEG);
