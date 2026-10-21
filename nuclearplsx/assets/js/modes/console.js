/* ============================================================
   核纪元 · 反应堆控制台
   把反应堆开到满功率，完成 12 小时班次考核
   ============================================================ */
(function (NEG) {
  'use strict';

  const FMT = (n, d) => {
    if (!isFinite(n)) return '—';
    const p = Math.pow(10, d == null ? 0 : d);
    return String(Math.round(n * p) / p);
  };

  NEG.registerMode({
    id: 'console',
    order: 3,
    title: '反应堆控制台',
    nav: '反应堆控制台',
    icon: 'gauge',
    accent: '#3ef0a2',
    blurb: '控制棒、主泵、汽轮机：在 12 小时班次里把一座压水堆稳定开到满功率。',
    progress(s) {
      const c = s.modes.console || {};
      if (c.completed > 0) return 1;
      return Math.min(0.9, ((c.bestEnergy || 0) / 5500) * 0.5 + ((c.bestSafety || 0) / 100) * 0.4);
    },
    isComplete(s) { return (s.modes.console.completed || 0) > 0; },

    render(root, ctx) {
      const { store, data, ui, audio, util: U } = ctx;
      const cfg = data.console || {};
      if (!NEG.ReactorModel) {
        root.innerHTML = '<div class="empty">控制台模型加载失败，请刷新页面。</div>';
        return;
      }

      const model = NEG.ReactorModel.create();
      const s = model.state;
      let rafId = null;
      let lastTs = 0;
      let uiAccum = 0;
      let finished = false;
      let maxPower = 0;
      let firstCriticalAt = null;

      const state = store.get();
      const bestEnergy = state.modes.console.bestEnergy || 0;
      const bestSafety = state.modes.console.bestSafety || 0;

      root.innerHTML =
        ui.pageHead({
          eyebrow: 'REACTOR CONSOLE · 主控室',
          icon: 'gauge',
          title: '反应堆控制台',
          lead: '一座压水堆正在等待并网。缓慢提棒找到临界，把热功率稳定在 100%，跟随电网负荷完成 12 小时班次。',
          tools: '<span class="badge badge-green">最佳发电 ' + FMT(bestEnergy) + ' MWh</span>' +
                 '<button class="btn btn-quiet btn-sm" data-action="restart">' + NEG.icon('refresh', 14) + '重新开始</button>'
        }) +
        '<div class="console-grid">' +
          /* ---------- 左：控制 ---------- */
          '<div class="console-col left-col">' +
            '<section class="panel console-card anim-fade-up">' +
              '<h4>CONTROLS <b>控制</b></h4>' +
              '<div class="slider-block">' +
                '<div class="slider-head"><label for="rodRange">控制棒插入位置</label><span class="slider-value" id="rodVal">82%</span></div>' +
                '<input class="range" id="rodRange" type="range" min="0" max="100" step="0.5" value="82" aria-label="控制棒插入位置">' +
                '<div class="slider-scale"><span>0% 全部提出</span><span>100% 全部插入</span></div>' +
              '</div>' +
              '<div class="slider-block">' +
                '<div class="slider-head"><label for="pumpRange">主泵流量</label><span class="slider-value" id="pumpVal">100%</span></div>' +
                '<input class="range" id="pumpRange" type="range" min="40" max="120" step="1" value="100" aria-label="主泵流量">' +
                '<div class="slider-scale"><span>40%</span><span>120%</span></div>' +
              '</div>' +
              '<div class="slider-block">' +
                '<div class="slider-head"><label for="loadRange">汽轮机负荷</label><span class="slider-value" id="loadVal">0%</span></div>' +
                '<input class="range" id="loadRange" type="range" min="0" max="100" step="1" value="0" aria-label="汽轮机负荷">' +
                '<div class="slider-scale"><span>0%</span><span>100%</span></div>' +
              '</div>' +
              '<button class="btn-scram" id="scramBtn" type="button">⏹ 紧 急 停 堆 SCRAM</button>' +
              '<button class="btn btn-quiet btn-block btn-sm" id="resetScramBtn" style="margin-top:8px;display:none" type="button">' +
                '<span id="resetScramText">停堆后复位</span></button>' +
              '<p class="console-hint" style="margin-top:10px">提示：保持「反应性」在 0 附近，功率才会稳定；正反应性会让功率持续上升。</p>' +
            '</section>' +

            '<section class="panel console-card anim-fade-up d1">' +
              '<h4>MISSION <b>班次考核</b></h4>' +
              '<div class="row" style="justify-content:space-between;margin-bottom:6px">' +
                '<span class="panel-note">班次进度</span>' +
                '<span class="mono" id="clockText" style="font-size:12px;color:var(--cyan)">0.0 / 12 h</span>' +
              '</div>' +
              '<div class="progress" style="margin-bottom:12px"><i id="clockBar"></i></div>' +
              '<div class="readout-grid" style="margin-bottom:10px">' +
                '<div class="readout"><span>累计发电量</span><b><span id="energyVal">0</span><small>MWh</small></b></div>' +
                '<div class="readout"><span>目标发电量</span><b>' + FMT(cfg.energyTarget || 6000) + '<small>MWh</small></b></div>' +
              '</div>' +
              '<div class="mission-steps" id="missionSteps">' +
                '<div class="mission-step" data-step="1"><span class="ms-dot">1</span><span>启动反应堆：热功率达到 30%</span></div>' +
                '<div class="mission-step" data-step="2"><span class="ms-dot">2</span><span>并网发电：功率 ≥ 50% 且汽轮机带上负荷</span></div>' +
                '<div class="mission-step" data-step="3"><span class="ms-dot">3</span><span>稳定运行 12 小时，累计发电 ≥ ' + FMT(cfg.energyTarget || 6000) + ' MWh</span></div>' +
              '</div>' +
              '<div class="divider"></div>' +
              '<div class="row" style="justify-content:space-between">' +
                '<span class="panel-note">电网负荷需求</span>' +
                '<span class="badge badge-amber" id="demandBadge">100%</span>' +
              '</div>' +
            '</section>' +

            '<section class="panel console-card anim-fade-up d2">' +
              '<h4>SPEED <b>时间倍速</b></h4>' +
              '<div class="segmented" id="speedSeg" role="group" aria-label="时间倍速">' +
                '<button data-speed="1" class="is-active">×1</button>' +
                '<button data-speed="2">×2</button>' +
                '<button data-speed="4">×4</button>' +
              '</div>' +
              '<p class="console-hint" style="margin-top:8px">×1 时 1 秒 ≈ 5 分钟模拟时间；12 小时班次约 2.4 分钟。</p>' +
            '</section>' +
          '</div>' +

          /* ---------- 中：堆芯 ---------- */
          '<div class="console-col center-col">' +
            '<section class="panel core-stage anim-fade-up">' +
              '<div class="reactor-banner" id="reactorBanner" style="margin-bottom:10px">' +
                '<span class="row" style="gap:8px"><span class="status-dot"></span><b id="statusText">热备用</b></span>' +
                '<span class="mono" id="statusInfo">P 0% · ρ -280 pcm</span>' +
              '</div>' +
              NEG.svg.core() +
              '<div class="row wrap" style="justify-content:space-between;gap:8px;margin-top:6px">' +
                '<span class="hint-line">' + NEG.icon('info', 13) + '控制棒插入越深，堆芯越“冷”</span>' +
                '<span class="mono" style="font-size:11px;color:var(--text-3)" id="tickInfo">25 fps</span>' +
              '</div>' +
            '</section>' +
            '<section class="panel console-card anim-fade-up d1">' +
              '<h4>TEMPERATURE <b>热工参数</b></h4>' +
              '<div class="readout-grid">' +
                '<div class="readout"><span>电功率</span><b><span id="elecVal">0</span><small>MWe</small></b></div>' +
                '<div class="readout"><span>热功率</span><b><span id="thermalVal">0</span><small>MWt</small></b></div>' +
                '<div class="readout"><span>一回路平均温度</span><b><span id="tcVal">290</span><small>°C</small></b></div>' +
                '<div class="readout"><span>燃料温度</span><b><span id="tfVal">300</span><small>°C</small></b></div>' +
              '</div>' +
            '</section>' +
          '</div>' +

          /* ---------- 右：仪表 ---------- */
          '<div class="console-col right-col">' +
            '<section class="panel console-card anim-fade-up">' +
              '<h4>INSTRUMENTS <b>仪表</b></h4>' +
              '<div class="gauge-grid" id="gaugeGrid"></div>' +
              '<div class="rho-card" style="margin-top:8px">' +
                '<div class="row" style="justify-content:space-between">' +
                  '<span class="panel-note">反应性 ρ</span>' +
                  '<span class="mono" id="rhoVal" style="font-size:15px;font-weight:700;color:var(--green)">0 pcm</span>' +
                '</div>' +
                '<div class="rho-bar"><span class="rho-center"></span><i id="rhoMarker" style="left:50%"></i></div>' +
                '<div class="slider-scale"><span>-1000</span><span>临界 0</span><span>+1000</span></div>' +
              '</div>' +
            '</section>' +
            '<section class="panel console-card anim-fade-up d1">' +
              '<h4>ALERTS <b>状态与日志</b></h4>' +
              '<div class="reactor-banner" id="alarmBanner" style="margin-bottom:10px">' +
                '<span class="alarm-icon" id="alarmIcon">' + NEG.icon('check', 14) + '</span><span id="alarmText">系统正常</span>' +
              '</div>' +
              '<div class="event-log" id="eventLog"></div>' +
            '</section>' +
          '</div>' +
        '</div>';

      /* ---------- 控件 ---------- */
      const rodRange = root.querySelector('#rodRange');
      const pumpRange = root.querySelector('#pumpRange');
      const loadRange = root.querySelector('#loadRange');
      const rodVal = root.querySelector('#rodVal');
      const pumpVal = root.querySelector('#pumpVal');
      const loadVal = root.querySelector('#loadVal');
      const scramBtn = root.querySelector('#scramBtn');
      const resetScramBtn = root.querySelector('#resetScramBtn');
      const speedSeg = root.querySelector('#speedSeg');
      const eventLog = root.querySelector('#eventLog');
      const alarmBanner = root.querySelector('#alarmBanner');
      const alarmIcon = root.querySelector('#alarmIcon');
      const alarmText = root.querySelector('#alarmText');
      const statusText = root.querySelector('#statusText');
      const statusInfo = root.querySelector('#statusInfo');
      const reactorBanner = root.querySelector('#reactorBanner');
      const coreRods = root.querySelector('#coreRods');
      const coreFuel = root.querySelector('#coreFuel');
      const coreHalo = root.querySelector('.core-halo');
      const demandBadge = root.querySelector('#demandBadge');
      const missionSteps = root.querySelector('#missionSteps');

      const sliders = [
        { input: rodRange, label: rodVal, key: 'rod', suffix: '%' },
        { input: pumpRange, label: pumpVal, key: 'pump', suffix: '%' },
        { input: loadRange, label: loadVal, key: 'load', suffix: '%' }
      ];

      function paintSlider(slider) {
        const pct = (Number(slider.input.value) - Number(slider.input.min)) /
          (Number(slider.input.max) - Number(slider.input.min)) * 100;
        slider.input.style.setProperty('--fill', pct + '%');
        slider.label.textContent = FMT(slider.input.value, 1) + slider.suffix;
      }

      function syncSlidersFromModel() {
        rodRange.value = s.rod;
        pumpRange.value = s.pump;
        loadRange.value = s.load;
        sliders.forEach(paintSlider);
        rodRange.disabled = s.status === 'scram' || s.status === 'failed' || s.status === 'complete';
        pumpRange.disabled = s.status === 'failed' || s.status === 'complete';
        loadRange.disabled = s.status === 'failed' || s.status === 'complete' || s.status === 'scram';
      }

      sliders.forEach((slider) => {
        paintSlider(slider);
        slider.input.addEventListener('input', () => {
          model.setControl(slider.key, Number(slider.input.value));
          /* 模型可能因停堆锁定拒绝修改，回读一次 */
          if (s[slider.key] !== Number(slider.input.value)) slider.input.value = s[slider.key];
          paintSlider(slider);
        });
      });

      speedSeg.querySelectorAll('[data-speed]').forEach((btn) => {
        btn.addEventListener('click', () => {
          audio.play('click');
          model.setSpeed(Number(btn.dataset.speed));
          speedSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
          ui.toast('时间倍速 ×' + btn.dataset.speed, 'info');
        });
      });

      scramBtn.addEventListener('click', () => {
        if (s.status === 'complete' || s.status === 'failed') return;
        if (model.scram('手动停堆')) {
          audio.play('scram');
          ui.toast('控制棒已全部插入。保持冷却，锁定期结束且功率不高于 5% 后可复位。', 'error', { duration: 4200 });
          syncSlidersFromModel();
        }
      });

      resetScramBtn.addEventListener('click', () => {
        if (s.power > 5 || s.t < s.rodLockUntil) {
          ui.toast('请保持冷却，等待停堆锁定期结束且功率不高于 5% 后复位', 'error');
          return;
        }
        if (model.resetAfterScram()) {
          audio.play('click');
          syncSlidersFromModel();
          ui.toast('控制棒已复位。注意：氙毒仍然存在，重启需要更多提棒。', 'info');
        }
      });

      root.querySelector('[data-action="restart"]').addEventListener('click', () => {
        ui.confirm({
          eyebrow: '重新开始',
          title: '放弃当前班次？',
          message: '当前发电量与安全评分不会保留，重新开始一个 12 小时班次。',
          confirmLabel: '重新开始',
          danger: true
        }).then((ok) => { if (ok) ctx.go('console', { force: true }); });
      });

      /* ---------- 仪表 ---------- */
      function gaugeHTML(id) {
        return '<div class="gauge" id="g-' + id + '">' +
          '<svg viewBox="0 0 120 76" aria-hidden="true">' +
            '<path class="gauge-arc-bg" d="M14 64 A46 46 0 0 1 106 64"/>' +
            '<path class="gauge-arc-fill" d="M14 64 A46 46 0 0 1 106 64" stroke-dasharray="145" stroke-dashoffset="145"/>' +
          '</svg>' +
          '<div class="gauge-value">0<small></small></div>' +
          '<div class="gauge-label"></div>' +
        '</div>';
      }
      const gaugeGrid = root.querySelector('#gaugeGrid');
      gaugeGrid.innerHTML =
        gaugeHTML('power') + gaugeHTML('load') + gaugeHTML('temp') + gaugeHTML('cool') + gaugeHTML('press') + gaugeHTML('xe');
      const gauges = {
        power: { el: root.querySelector('#g-power'), min: 0, max: 130, label: '热功率', unit: '%' },
        load: { el: root.querySelector('#g-load'), min: 0, max: 100, label: '汽轮机负荷', unit: '%' },
        temp: { el: root.querySelector('#g-temp'), min: 0, max: 1200, label: '燃料温度', unit: '°C' },
        cool: { el: root.querySelector('#g-cool'), min: 150, max: 420, label: '冷却剂温度', unit: '°C' },
        press: { el: root.querySelector('#g-press'), min: 10, max: 18, label: '一回路压力', unit: 'MPa' },
        xe: { el: root.querySelector('#g-xe'), min: 0, max: 2, label: '氙毒', unit: '×平衡' }
      };

      function setGauge(key, value, warn, bad) {
        const g = gauges[key];
        if (!g) return;
        const frac = U.clamp((value - g.min) / (g.max - g.min), 0, 1);
        const fill = g.el.querySelector('.gauge-arc-fill');
        fill.setAttribute('stroke-dashoffset', String(145 * (1 - frac)));
        const valEl = g.el.querySelector('.gauge-value');
        valEl.innerHTML = FMT(value, value < 10 && value % 1 !== 0 ? 1 : 0) + '<small>' + g.unit + '</small>';
        g.el.querySelector('.gauge-label').textContent = g.label;
        g.el.classList.toggle('is-warn', !!warn && !bad);
        g.el.classList.toggle('is-bad', !!bad);
      }

      /* ---------- 循环 ---------- */
      function statusLabel() {
        if (s.status === 'failed') return '严重事故';
        if (s.status === 'complete') return s.success ? '班次完成' : '班次结束';
        if (s.status === 'scram') return '已停堆';
        if (s.power >= 1) return '运行中';
        return '热备用';
      }

      function updateMission() {
        const pct = U.clamp(s.t / s.missionHours, 0, 1);
        root.querySelector('#clockBar').style.width = (pct * 100) + '%';
        root.querySelector('#clockText').textContent = s.t.toFixed(1) + ' / ' + s.missionHours + ' h';
        root.querySelector('#energyVal').textContent = FMT(s.energy);
        demandBadge.textContent = s.loadDemand + '%';
        demandBadge.className = 'badge ' + (s.load < s.loadDemand - 10 && s.power > 30 ? 'badge-red' : 'badge-amber');

        const steps = [
          { id: 1, done: maxPower >= 30 },
          { id: 2, done: maxPower >= 50 && s.energy > 1 },
          { id: 3, done: s.status === 'complete' }
        ];
        const firstUndone = steps.find((x) => !x.done);
        missionSteps.querySelectorAll('[data-step]').forEach((el) => {
          const id = Number(el.dataset.step);
          const done = steps.find((x) => x.id === id).done;
          el.classList.toggle('is-done', done);
          el.classList.toggle('is-active', !done && firstUndone && firstUndone.id === id);
        });
      }

      function updateCore() {
        const rodPct = U.clamp(s.rod, 0, 100);
        if (coreRods) coreRods.setAttribute('transform', 'translate(0,' + (rodPct * 1.25) + ')');
        if (coreFuel) {
          const heat = U.clamp((s.fuelTemp - 300) / 700, 0, 1);
          const hue = 45 - 35 * heat;
          const light = 62 - 14 * heat;
          coreFuel.setAttribute('fill', 'hsl(' + hue + ', 95%, ' + light + '%)');
          coreFuel.style.filter = 'drop-shadow(0 0 ' + (4 + 16 * (s.power / 100)) + 'px rgba(255,150,60,' + (0.25 + 0.5 * (s.power / 100)) + '))';
        }
        if (coreHalo) {
          coreHalo.style.opacity = String(0.15 + Math.min(1, s.power / 100) * 0.85);
          coreHalo.style.animationDuration = (4.5 - Math.min(1, s.power / 100) * 2.4) + 's';
        }
      }

      function updateReadouts() {
        root.querySelector('#elecVal').textContent = FMT(s.electricalMW);
        root.querySelector('#thermalVal').textContent = FMT((s.power / 100) * s.thermalMW);
        root.querySelector('#tcVal').textContent = FMT(s.coolantTemp);
        root.querySelector('#tfVal').textContent = FMT(s.fuelTemp);
        root.querySelector('#tickInfo').textContent = '模拟倍速 ×' + s.speed;

        const tfReadout = root.querySelector('#tfVal').closest('.readout');
        const tcReadout = root.querySelector('#tcVal').closest('.readout');
        tfReadout.classList.toggle('is-warn', s.fuelTemp > 800 && s.fuelTemp <= 1000);
        tfReadout.classList.toggle('is-bad', s.fuelTemp > 1000);
        tcReadout.classList.toggle('is-warn', s.coolantTemp > 380 && s.coolantTemp <= 410);
        tcReadout.classList.toggle('is-bad', s.coolantTemp > 410);

        setGauge('power', s.power, s.power > 112, s.power > 122);
        setGauge('load', s.load, false, false);
        setGauge('temp', s.fuelTemp, s.fuelTemp > 800, s.fuelTemp > 1000);
        setGauge('cool', s.coolantTemp, s.coolantTemp > 380, s.coolantTemp > 410);
        setGauge('press', s.pressure, s.pressure > 16.6, s.pressure > 17.2);
        setGauge('xe', s.xenon, false, false);

        const rho = s.reactivity;
        const rhoEl = root.querySelector('#rhoVal');
        rhoEl.textContent = (rho > 0 ? '+' : '') + Math.round(rho) + ' pcm';
        rhoEl.style.color = Math.abs(rho) < 60 ? 'var(--green)' : rho > 0 ? 'var(--amber)' : 'var(--cyan)';
        const marker = root.querySelector('#rhoMarker');
        marker.style.left = U.clamp(50 + rho / 40, 4, 96) + '%';
        marker.style.background = Math.abs(rho) < 60 ? 'var(--green)' : rho > 0 ? 'var(--amber)' : 'var(--cyan)';

        statusText.textContent = statusLabel();
        statusInfo.textContent = 'P ' + FMT(s.power) + '% · ρ ' + (rho > 0 ? '+' : '') + Math.round(rho) + ' pcm';
        reactorBanner.classList.toggle('is-scram', s.status === 'scram');
        reactorBanner.classList.toggle('is-dead', s.status === 'failed');
        reactorBanner.classList.toggle('is-complete', s.status === 'complete');

        /* 告警 */
        let alarm = null;
        if (s.status === 'failed') alarm = { text: s.failureReason, bad: true };
        else if (s.status === 'scram') alarm = { text: '反应堆已停堆，请保持冷却；锁定期结束且功率不高于 5% 后复位', bad: true };
        else if (s.fuelTemp > 1000) alarm = { text: '燃料温度过高！立即插入控制棒并提高冷却', bad: true };
        else if (s.pressure > 17.2) alarm = { text: '一回路压力接近安全阀动作值', bad: true };
        else if (s.power > 115) alarm = { text: '热功率过高，保护系统即将动作', bad: true };
        else if (s.fuelTemp > 800) alarm = { text: '燃料温度偏高，注意功率与冷却平衡', warn: true };
        else if (s.pressure > 16.6) alarm = { text: '一回路压力偏高', warn: true };
        else if (s.power > 10 && s.load < 8) alarm = { text: '汽轮机负荷过低，堆芯热量正在堆积', warn: true };
        else if (Math.abs(s.reactivity) > 500 && s.power > 5) alarm = { text: s.reactivity > 0 ? '正反应性较大，功率将持续上升' : '负反应性较大，功率将持续下降', warn: true };
        else if (s.power > 20 && Math.abs(s.reactivity) < 60) alarm = { text: '临界稳定运行', ok: true };

        alarmBanner.className = 'reactor-banner' + (alarm && alarm.bad ? ' is-dead' : alarm && alarm.warn ? ' is-scram' : '');
        alarmText.textContent = alarm ? alarm.text : '系统正常';
        const iconName = alarm && alarm.bad ? 'alert' : alarm && alarm.warn ? 'info' : 'check';
        if (alarmIcon.dataset.name !== iconName) {
          alarmIcon.dataset.name = iconName;
          alarmIcon.innerHTML = NEG.icon(iconName, 14);
        }
      }

      let lastLogItem = null;
      function renderLog() {
        // 日志只在新增条目时更新，避免每秒多次重建相同 DOM。
        if (s.log[0] === lastLogItem) return;
        lastLogItem = s.log[0];
        const items = s.log.slice(0, 24);
        eventLog.innerHTML = items.map((l) => {
          const t = l.time != null ? l.time : 0;
          return '<div class="log-item ' + (l.type === 'bad' ? 'is-bad' : l.type === 'warn' ? 'is-warn' : l.type === 'good' ? 'is-good' : '') + '">' +
            '<span class="log-time">' + t.toFixed(1) + 'h</span>' +
            '<span>' + U.esc(l.text) + '</span>' +
          '</div>';
        }).join('');
      }

      let scrambled = false;
      function syncScramUI() {
        const scrammed = s.status === 'scram';
        scrambled = scrammed;
        resetScramBtn.style.display = scrammed ? 'block' : 'none';
        const lockMinutes = Math.max(0, Math.ceil((s.rodLockUntil - s.t) * 60));
        resetScramBtn.disabled = !scrammed || s.power > 5 || lockMinutes > 0;
        const txt = root.querySelector('#resetScramText');
        if (txt) txt.textContent = lockMinutes > 0 ? '停堆锁定剩余 ' + lockMinutes + ' 分钟（模拟时间）' :
          s.power > 5 ? '等待功率降至 5%…' : '停堆后复位（功率 ≤ 5%）';
        scramBtn.disabled = s.status === 'complete' || s.status === 'failed' || scrammed;
        syncSlidersFromModel();
      }

      /* ---------- 主循环 ---------- */
      function loop(ts) {
        if (!lastTs) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 1000, 0.12);
        lastTs = ts;
        if (dt > 0) {
          model.step(dt);
          maxPower = Math.max(maxPower, s.power);
          if (s.power >= 30 && !firstCriticalAt) firstCriticalAt = s.t;
        }
        updateCore();

        uiAccum += dt;
        if (uiAccum > 0.1) {
          updateReadouts();
          updateMission();
          renderLog();
          if (s.status === 'scram' || scrambled) syncScramUI();
          else if (s.status === 'running' || s.status === 'standby') {
            if (scrambled) { scrambled = false; resetScramBtn.style.display = 'none'; scramBtn.disabled = false; syncSlidersFromModel(); }
          }
          uiAccum = 0;
        }

        if (s.status === 'complete' || s.status === 'failed') {
          if (!finished) finish(s.status === 'failed');
          return;
        }
        rafId = requestAnimationFrame(loop);
      }

      function finish(failed) {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        audio.play(failed ? 'wrong' : 'fanfare');
        updateReadouts();
        updateMission();
        renderLog();
        syncSlidersFromModel();
        scramBtn.disabled = true;

        const energy = Math.round(s.energy);
        const safety = Math.round(s.safety);
        const ratio = U.clamp(energy / s.energyTarget, 0, 1.5);
        const success = !failed && s.success;
        const score = failed
          ? Math.round(ratio * 30 + safety * 0.2)
          : Math.round(Math.min(1, ratio) * 120 + safety * 1.2);

        store.addScore(score, 'console');
        store.set((st2) => {
          if (success) st2.modes.console.completed = (st2.modes.console.completed || 0) + 1;
          st2.modes.console.bestEnergy = Math.max(st2.modes.console.bestEnergy || 0, energy);
          st2.modes.console.bestSafety = Math.max(st2.modes.console.bestSafety || 0, safety);
          if (success && s.scramCount === 0) st2.flags.noScramRun = true;
        }, 'console');
        ctx.achievements.checkAll();

        const reasons = failed
          ? s.failureReason
          : success ? '你完成了 12 小时并网发电班次，发电量与安全指标均达标。'
            : '班次结束，但发电量或安全评分未达到考核目标，再试一次。';

        ui.modal({
          eyebrow: failed ? 'INCIDENT REPORT · 事故报告' : 'SHIFT REPORT · 班次报告',
          title: failed ? '机组发生严重事故' : success ? '班次任务完成！' : '班次结束',
          wide: true,
          html:
            '<div class="summary-hero">' +
              '<div class="summary-score">' + score + '</div>' +
              '<div class="summary-label">本班次得分</div>' +
            '</div>' +
            '<div class="kpi-row">' +
              '<div class="kpi"><b>' + FMT(energy) + '<span class="kpi-unit">MWh</span></b><span>累计发电量</span></div>' +
              '<div class="kpi"><b>' + safety + '<span class="kpi-unit">/100</span></b><span>安全评分</span></div>' +
              '<div class="kpi"><b>' + s.scramCount + '</b><span>停堆次数</span></div>' +
              '<div class="kpi"><b>' + FMT(maxPower) + '%</b><span>最高热功率</span></div>' +
            '</div>' +
            '<p style="margin-top:16px">' + U.esc(reasons) + '</p>' +
            '<div class="data-note">' +
              '教学提示：压水堆的负温度系数会“自动刹车”——温度升高时反应性下降。' +
              '但停堆后仍有约 6% 余热，必须持续冷却；氙-135 会在功率变化后数小时内累积，形成“碘坑”。' +
            '</div>',
          actions: [
            { label: '返回首页', kind: 'ghost', onClick: () => ctx.go('home') },
            { label: '再来一个班次', kind: 'primary', icon: 'refresh', onClick: () => ctx.go('console', { force: true }) }
          ]
        });
      }

      /* ---------- 启动 ---------- */
      syncSlidersFromModel();
      syncScramUI();
      updateReadouts();
      updateMission();
      updateCore();
      renderLog();
      rafId = requestAnimationFrame(loop);

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      };
    }
  });
})(window.NEG);
