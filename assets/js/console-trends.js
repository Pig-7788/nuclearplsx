/* 运行趋势：独立采样、SVG 绘图与 CSV 导出，不参与反应堆计算。 */
(function (NEG) {
  'use strict';

  const SERIES = [
    { key: 'power', label: '热功率', unit: '%', max: 140, ref: 100, reference: '额定热功率 100%', color: 'var(--cyan)' },
    { key: 'fuelTemp', label: '燃料温度', unit: '°C', max: 1400, ref: 800, reference: '模型警戒温度 800 °C', color: 'var(--amber)' },
    { key: 'xenon', label: '氙毒指数', unit: '相对值', max: 3.5, ref: 1, reference: '相对参考值 1', color: 'var(--violet)' },
    { key: 'electricalMW', label: '电功率', unit: 'MWe', max: 1600, ref: null, reference: '', color: 'var(--green)' }
  ];
  const CSV_HEADER = ['simulation_hour', 'thermal_percent', 'thermal_MWt', 'fuel_C', 'xenon_relative', 'electrical_MWe', 'grid_demand_percent', 'status'];
  const round = (n, digits) => Number(n.toFixed(digits == null ? 1 : digits));

  function createHistory() {
    const points = [];
    function capture(s, force) {
      const last = points[points.length - 1];
      if (last && !force && s.status === last.status && s.t - last.t < 1 / 60 - 1e-8) return false;
      if (last && s.t === last.t && s.status === last.status && s.power === last.power &&
          s.electricalMW === last.electricalMW && s.fuelTemp === last.fuelTemp && s.xenon === last.xenon &&
          s.loadDemand === last.loadDemand && s.power / 100 * s.thermalMW === last.thermalMW) return false;
      points.push({
        t: s.t, power: s.power, thermalMW: s.power / 100 * s.thermalMW,
        fuelTemp: s.fuelTemp, xenon: s.xenon, electricalMW: s.electricalMW,
        loadDemand: s.loadDemand, status: s.status
      });
      // 12 小时班次约 720 个分钟采样点；额外保留状态切换点，内存有上限。
      if (points.length > 1500) points.splice(1, 1);
      return true;
    }
    function csv() {
      return '\uFEFF' + CSV_HEADER.join(',') + '\r\n' + points.map((p) => [
        p.t.toFixed(5), p.power.toFixed(4), p.thermalMW.toFixed(4), p.fuelTemp.toFixed(3),
        p.xenon.toFixed(5), p.electricalMW.toFixed(4), p.loadDemand, p.status
      ].join(',')).join('\r\n');
    }
    return { points, capture, csv };
  }

  function mount(root, state) {
    const history = createHistory();
    let active = SERIES[0];
    let scope = 'recent';
    let cursor = null;
    let dirty = true;
    let lastPaint = -Infinity;
    const abort = new AbortController();
    const listen = (el, name, fn) => el.addEventListener(name, fn, { signal: abort.signal });
    const chartId = 'consoleTrend';

    root.innerHTML =
      '<div class="trend-heading"><h3>运行趋势</h3>' +
        '<label class="trend-scope">时间范围 <select id="trendScope"><option value="recent">最近 2 小时</option><option value="shift">整个班次</option></select></label></div>' +
      '<div class="trend-metrics" role="group" aria-label="选择趋势指标">' + SERIES.map((m, i) =>
        '<button type="button" data-trend="' + m.key + '" aria-pressed="' + (i === 0) + '"><span>' + m.label + '</span><b data-value="' + m.key + '">—</b></button>'
      ).join('') + '</div>' +
      '<div class="trend-legend"><span class="trend-series-key">模拟采样</span><span class="trend-reference-key" id="trendReference"></span></div>' +
      '<svg id="' + chartId + '" class="trend-plot" viewBox="0 0 480 240" role="img" tabindex="0" aria-label="热功率运行趋势" aria-describedby="trendHelp trendReading"></svg>' +
      '<output class="trend-reading mono" id="trendReading"></output>' +
      '<p class="trend-help" id="trendHelp">移动指针或轻点曲线查看采样；聚焦图表后用 ← → 键回看，End 返回最新。</p>' +
      '<details class="trend-data"><summary>采样数据与导出</summary><p>表内显示最近 10 个采样点；CSV 包含本班次全部已记录指标。</p>' +
        '<button class="btn btn-quiet btn-sm" type="button" id="trendExport">导出班次 CSV</button>' +
        '<div class="trend-table-wrap"><table><caption class="sr-only">最近的运行采样</caption><thead><tr><th scope="col">模拟 h</th><th scope="col">热功率 %</th><th scope="col">燃料 °C</th><th scope="col">氙指数</th><th scope="col">电功率 MWe</th></tr></thead><tbody></tbody></table></div></details>' +
      '<p class="trend-model-note">简化教学模拟，时间轴经压缩；氙毒是模型相对指数。温度警戒线为游戏设定。</p>';

    const svg = root.querySelector('svg');
    const reading = root.querySelector('#trendReading');
    const reference = root.querySelector('#trendReference');
    const details = root.querySelector('details');
    const table = root.querySelector('tbody');
    const valueNodes = SERIES.map((m) => root.querySelector('[data-value="' + m.key + '"]'));
    const bounds = { left: 46, top: 14, width: 418, height: 182 };

    function timeBounds() {
      const latest = history.points[history.points.length - 1];
      const end = scope === 'shift' ? state.missionHours : Math.max(2, latest.t);
      return { min: scope === 'shift' ? 0 : Math.max(0, end - 2), max: end };
    }

    function render() {
      const points = history.points;
      if (!points.length) return;
      const latest = points[points.length - 1];
      const time = timeBounds();
      const x = (t) => bounds.left + (t - time.min) / (time.max - time.min) * bounds.width;
      const y = (v) => bounds.top + (1 - v / active.max) * bounds.height;
      const visible = points.filter((p, i) => p.t >= time.min || (points[i + 1] && points[i + 1].t >= time.min));
      const selected = cursor == null ? latest : points[cursor];
      const ref = active.key === 'electricalMW' ? state.ratedMW : active.ref;
      const refLabel = active.key === 'electricalMW' ? '额定电功率 ' + state.ratedMW + ' MWe' : active.reference;
      let markup = '<defs><clipPath id="trendClip"><rect x="46" y="14" width="418" height="182"/></clipPath></defs>';
      for (let i = 0; i <= 4; i++) {
        const val = active.max * i / 4;
        markup += '<line class="trend-gridline" x1="46" x2="464" y1="' + y(val) + '" y2="' + y(val) + '"/>' +
          '<text class="trend-axis" x="39" y="' + (y(val) + 4) + '" text-anchor="end">' + round(val, 2) + '</text>';
      }
      for (let i = 0; i <= 4; i++) {
        const t = time.min + (time.max - time.min) * i / 4;
        markup += '<text class="trend-axis" x="' + x(t) + '" y="218" text-anchor="' + (i === 0 ? 'start' : i === 4 ? 'end' : 'middle') + '">' + round(t, 1) + ' h</text>';
      }
      markup += '<g clip-path="url(#trendClip)"><line class="trend-reference-line" x1="46" x2="464" y1="' + y(ref) + '" y2="' + y(ref) + '"/>';
      // 标出进入停堆的时刻；保留采样时间，不把模拟小时换成真实时间。
      points.filter((p, i) => p.status === 'scram' && (!i || points[i - 1].status !== 'scram') && p.t >= time.min).forEach((p) => {
        markup += '<line class="trend-event" x1="' + x(p.t) + '" x2="' + x(p.t) + '" y1="14" y2="196"><title>停堆 ' + p.t.toFixed(2) + ' h</title></line>';
      });
      markup += '<path class="trend-line" d="' + visible.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(2) + ',' + y(p[active.key]).toFixed(2)).join(' ') + '"/>';
      if (selected && selected.t >= time.min) {
        markup += '<line class="trend-cursor" x1="' + x(selected.t) + '" x2="' + x(selected.t) + '" y1="14" y2="196"/>' +
          '<circle class="trend-point" cx="' + x(selected.t) + '" cy="' + y(selected[active.key]) + '" r="4"/>';
      }
      svg.innerHTML = markup + '</g>';
      root.style.setProperty('--trend-color', active.color);
      reference.textContent = refLabel;
      SERIES.forEach((m, i) => { valueNodes[i].textContent = round(latest[m.key], m.key === 'xenon' ? 2 : 1) + ' ' + m.unit; });
      reading.textContent = (cursor == null ? '最新 ' : '回看 ') + selected.t.toFixed(2) + ' h · ' + active.label + ' ' + round(selected[active.key], active.key === 'xenon' ? 3 : 1) + ' ' + active.unit;
      svg.setAttribute('aria-label', active.label + '趋势，纵轴单位' + active.unit + '，横轴为模拟小时。' + reading.textContent);
      if (details.open) renderTable();
      dirty = false;
    }

    function renderTable() {
      table.innerHTML = history.points.slice(-10).reverse().map((p) => '<tr><td>' + p.t.toFixed(2) + '</td><td>' + p.power.toFixed(1) + '</td><td>' + p.fuelTemp.toFixed(1) + '</td><td>' + p.xenon.toFixed(3) + '</td><td>' + p.electricalMW.toFixed(1) + '</td></tr>').join('');
    }

    root.querySelectorAll('[data-trend]').forEach((btn) => listen(btn, 'click', () => {
      active = SERIES.find((m) => m.key === btn.dataset.trend);
      root.querySelectorAll('[data-trend]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    }));
    listen(root.querySelector('select'), 'change', (e) => { scope = e.target.value; cursor = null; render(); });
    function inspect(e) {
      const rect = svg.getBoundingClientRect();
      const time = timeBounds();
      const t = time.min + ((e.clientX - rect.left) / rect.width * 480 - bounds.left) / bounds.width * (time.max - time.min);
      let nearest = null;
      history.points.forEach((p, i) => {
        if (p.t >= time.min && (nearest == null || Math.abs(p.t - t) < Math.abs(history.points[nearest].t - t))) nearest = i;
      });
      cursor = nearest;
      render();
    }
    listen(svg, 'pointermove', inspect);
    listen(svg, 'pointerdown', inspect);
    listen(svg, 'pointerleave', () => { cursor = null; render(); });
    listen(svg, 'blur', () => { cursor = null; render(); });
    listen(svg, 'keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) return;
      e.preventDefault();
      const points = history.points;
      const min = Math.max(0, points.findIndex((p) => p.t >= timeBounds().min));
      const start = cursor == null ? points.length - 1 : cursor;
      if (e.key === 'End' || e.key === 'Escape') cursor = null;
      else if (e.key === 'Home') cursor = min;
      else cursor = Math.max(min, Math.min(points.length - 1, start + (e.key === 'ArrowLeft' ? -1 : 1)));
      render();
    });
    listen(details, 'toggle', () => { if (details.open) renderTable(); });
    listen(root.querySelector('#trendExport'), 'click', () => {
      const url = URL.createObjectURL(new Blob([history.csv()], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nuclear-epoch-shift.csv';
      a.click();
      URL.revokeObjectURL(url);
    });

    history.capture(state);
    render();
    return {
      update(s, force) {
        if (history.capture(s, force)) dirty = true;
        const now = performance.now();
        if (force || (dirty && now - lastPaint >= 200)) {
          render();
          lastPaint = now;
        }
      },
      destroy() { abort.abort(); history.points.length = 0; }
    };
  }

  NEG.ConsoleTrends = { createHistory, mount };
})(window.NEG);
