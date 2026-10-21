/* ============================================================
   核纪元 · 反应堆控制台物理模型（纯逻辑，无 DOM）
   ------------------------------------------------------------
   教学用简化压水堆模型，保留关键因果关系：
   - 控制棒位置 ↔ 反应性 ↔ 功率
   - 燃料温度 / 冷却剂温度 → 负反馈（压水堆固有安全特性）
   - 氙-135 碘坑效应（功率下降后毒性先升后降）
   - 主泵流量 → 传热；汽轮机负荷 → 带走热量
   - 停堆后余热、超温超压保护、任务考核
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const CFG = (NEG.data.console || {});
  const RATED_MW = CFG.ratedMW || 1000;
  const THERMAL_MW = RATED_MW / 0.33;         // 约 3030 MW 热功率
  const MISSION_HOURS = CFG.missionHours || 12;
  const ENERGY_TARGET = CFG.energyTarget || 6000;

  const K = {
    rodWorth: 4000,          // pcm，控制棒全行程价值
    fuelCoeff: -3.0,         // pcm/°C（相对 600 °C）
    modCoeff: -20,           // pcm/°C（相对 326 °C）
    xeCoeff: -1800,          // pcm（相对氙毒 = 1）
    powerRate: 25,           // pcm → %/s：反应性每 25 pcm 使功率每秒变化 1%
    xfer: 11,                // MW/°C 燃料→冷却剂传热系数（泵 100%）
    fuelCap: 180000,         // MW·s/°C
    coolCap: 260000,         // MW·s/°C
    steam: 35,               // MW/°C 蒸汽带走热量系数（负荷 100%）
    eff: 0.33,               // 热电转换效率
    fuelWarn: 800,
    fuelFail: 1200,
    pressWarn: 16.6,
    pressTrip: 17.15,
    pressFail: 17.35,
    timeScale: 300,          // 1 倍速下：1 秒 = 300 秒模拟时间（5 分钟）
    xeTimeScale: 3,          // 氙毒时间轴加速（教学压缩，便于在班次内观察碘坑）
    lambdaI: 0.1035,         // 碘-135 衰变常数 /h
    lambdaXe: 0.0753,        // 氙-135 衰变常数 /h
    sigmaBurn: 0.03          // 氙燃耗系数（满功率）
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function create(opts) {
    const o = opts || {};
    const start = CFG.start || { rod: 100, pump: 100, load: 0 };
    const events = (CFG.events || []).slice();

    const state = {
      /* 时间 */
      t: 0,                  // 模拟小时
      speed: clamp(Number(o.speed) || 1, 1, 4),
      /* 控制量 */
      rod: start.rod,        // 控制棒插入位置 %：100 = 全插入，0 = 全提出
      pump: start.pump,      // 主泵流量 %
      load: start.load,      // 汽轮机负荷 %
      /* 物理量 */
      power: 0,              // 热功率 %
      fuelTemp: 300,         // 燃料温度 °C
      coolantTemp: 290,      // 冷却剂平均温度 °C
      pressure: 15.5,        // 一回路压力 MPa
      iodine: 0.6,           // 碘-135 相对浓度（换料后 0.6，未完全平衡）
      xenon: 0.6,            // 氙-135 相对毒性（1 = 满功率平衡）
      reactivity: 0,         // 当前反应性 pcm
      decayHeat: 0,          // 余热 MW
      energy: 0,             // 累计发电量 MWh
      electricalMW: 0,       // 当前电功率 MW
      safety: 100,           // 安全评分
      /* 状态机 */
      status: 'standby',     // standby | running | scram | complete | failed
      success: false,
      failureReason: '',
      scramCount: 0,
      overPowerTimer: 0,
      rodLockUntil: 0,
      loadDemand: 100,
      eventsFired: {},
      log: [],
      missionHours: MISSION_HOURS,
      energyTarget: ENERGY_TARGET,
      ratedMW: RATED_MW,
      thermalMW: THERMAL_MW
    };

    function pushLog(text, type, simHour) {
      state.log.unshift({
        text: text,
        type: type || 'info',
        time: simHour == null ? state.t : simHour
      });
      if (state.log.length > 60) state.log.pop();
    }

    function loadDemandAt(t) {
      let demand = 100;
      events.forEach((e) => {
        if (e.loadDemand != null && t >= e.hour) demand = e.loadDemand;
      });
      return demand;
    }

    function scram(reason) {
      if (state.status === 'failed' || state.status === 'complete' || state.status === 'scram') return false;
      state.decayHeat = 0.06 * THERMAL_MW * clamp(state.power, 3, 130) / 100;
      state.power = Math.min(state.power, 45);
      state.rod = 100;
      state.load = 0;
      state.rodLockUntil = state.t + 0.3;   // 停堆后 18 分钟模拟时间内锁定提棒，防止误操作
      state.scramCount++;
      state.status = 'scram';
      state.safety = Math.max(0, state.safety - 15);
      pushLog('自动/手动停堆：' + reason + '，控制棒全部插入。', 'bad');
      return true;
    }

    function step(dtRealSeconds) {
      if (!Number.isFinite(dtRealSeconds) || dtRealSeconds <= 0) return;
      // 倍速必须推进整个模型；用小步长维持与正常倍速一致的积分精度。
      let remaining = Math.min(dtRealSeconds, 0.12) * state.speed;
      while (remaining > 1e-10 && state.status !== 'failed' && state.status !== 'complete') {
        const dt = Math.min(remaining, 1 / 60, Math.max(0, MISSION_HOURS - state.t) * 3600 / K.timeScale);
        if (dt <= 0) break;
        advance(dt);
        remaining -= dt;
      }
    }

    function advance(dtReal) {
      if (state.status === 'failed' || state.status === 'complete') return;

      const dtSim = dtReal * K.timeScale;           // 模拟秒
      const dtH = dtSim / 3600;                     // 模拟小时
      state.t += dtH;
      state.loadDemand = loadDemandAt(state.t);

      /* ---- 1. 反应性 ---- */
      /* 温度反馈限制在合理运行区间，避免低温工况外推出非物理的正反应性 */
      const fuelDev = clamp(state.fuelTemp - 600, -280, 500);
      const modDev = clamp(state.coolantTemp - 326, -45, 80);
      const rho =
        K.rodWorth * ((50 - state.rod) / 50) +
        K.fuelCoeff * fuelDev +
        K.modCoeff * modDev +
        K.xeCoeff * (state.xenon - 1);
      state.reactivity = rho;

      /* ---- 2. 功率：由反应性驱动（点堆简化） ---- */
      /* rho = 0 时功率保持（临界）；rho > 0 功率上升，rho < 0 功率下降。
         温度负反馈随功率升高自动把 rho 拉回 0，形成稳定的平衡功率。 */
      const dP = (rho / K.powerRate) * dtReal;
      state.power = clamp(state.power + dP, 0, 130);
      if (state.rod >= 99.5 && state.power < 0.05) state.power = 0;

      /* ---- 3. 氙毒（碘坑） ---- */
      const Pn = clamp(state.power / 100, 0, 1.3);
      const dtXe = dtH * K.xeTimeScale;
      state.iodine += (K.lambdaI * Pn - K.lambdaI * state.iodine) * dtXe;
      state.xenon += (
        K.lambdaXe * state.iodine +
        0.0018 * Pn -
        (K.lambdaXe + K.sigmaBurn * Pn) * state.xenon
      ) * dtXe;
      state.iodine = clamp(state.iodine, 0.01, 3);
      state.xenon = clamp(state.xenon, 0.01, 3.2);

      /* ---- 4. 热工：燃料 / 冷却剂 / 蒸汽 ---- */
      const fissionMW = (state.power / 100) * THERMAL_MW;
      const qTransfer = K.xfer * Math.max(0, state.fuelTemp - state.coolantTemp) * (state.pump / 100);
      /* 汽轮机只能带走蒸汽发生器实际产生的热量：负荷再大也无法凭空抽取 */
      const qSteamDemand = K.steam * (state.load / 100) * Math.max(0, state.coolantTemp - 240);
      const heatAvail = (fissionMW + state.decayHeat) * 1.15 + 40;
      const qTurbine = Math.min(qSteamDemand, heatAvail);
      let qExtract = qTurbine;
      /* 低功率 / 停堆时由余热排出系统（RHR）把一回路维持在热停温度（约 285 °C） */
      if (state.power < 5) {
        qExtract = Math.max(qExtract, 14 * Math.max(0, state.coolantTemp - 285));
      }
      state.electricalMW = Math.max(0, qTurbine * K.eff);

      state.fuelTemp += ((fissionMW + state.decayHeat - qTransfer) / K.fuelCap) * dtSim;
      state.coolantTemp += ((qTransfer - qExtract) / K.coolCap) * dtSim;
      state.fuelTemp = clamp(state.fuelTemp, 20, 3200);
      state.coolantTemp = clamp(state.coolantTemp, 20, 520);
      state.decayHeat *= Math.exp(-dtH * 0.462);
      if (state.decayHeat < 0.2) state.decayHeat = 0;

      /* ---- 5. 压力 ---- */
      state.pressure = clamp(15.5 + 0.025 * (state.coolantTemp - 326), 1.5, 20);

      /* ---- 6. 发电量 ---- */
      state.energy += state.electricalMW * dtH;

      /* ---- 7. 安全评分 ---- */
      if (state.fuelTemp > K.fuelWarn) {
        state.safety -= ((state.fuelTemp - K.fuelWarn) / 100) * 1.1 * dtH;
      }
      if (state.pressure > K.pressWarn) {
        state.safety -= (state.pressure - K.pressWarn) * 9 * dtH;
      }
      if (state.power > 112) {
        state.safety -= (state.power - 112) * 0.4 * dtH;
      }
      state.safety = clamp(state.safety, 0, 100);

      /* ---- 8. 保护动作 ---- */
      if (state.status !== 'scram') {
        if (state.power > 122) state.overPowerTimer += dtH;
        else state.overPowerTimer = Math.max(0, state.overPowerTimer - dtH * 2);

        if (state.overPowerTimer > 0.12) {
          scram('超功率保护（功率 > 122%）');
          state.overPowerTimer = 0;
        } else if (state.pressure > K.pressTrip) {
          scram('一回路超压保护');
        }
      }

      if (state.status === 'standby' && state.power >= 1) state.status = 'running';

      /* ---- 9. 事件播报 ---- */
      events.forEach((e, i) => {
        if (!state.eventsFired[i] && state.t >= e.hour) {
          state.eventsFired[i] = true;
          pushLog(e.text, e.type, e.hour);
        }
      });

      /* ---- 10. 失效判定 ---- */
      if (state.fuelTemp >= K.fuelFail) {
        state.status = 'failed';
        state.failureReason = '燃料温度超过 1200 °C，包壳破损、堆芯受损。';
        state.safety = 0;
        pushLog('严重事故：燃料温度超过 1200 °C！', 'bad');
        return;
      }
      if (state.pressure >= K.pressFail) {
        state.status = 'failed';
        state.failureReason = '一回路压力超过安全限值 17.35 MPa。';
        state.safety = 0;
        pushLog('严重事故：一回路超压！', 'bad');
        return;
      }

      /* ---- 11. 班次结束 ---- */
      if (state.t >= MISSION_HOURS - 1e-6) {
        state.t = MISSION_HOURS;
        state.status = 'complete';
        state.success = state.energy >= ENERGY_TARGET && state.safety >= 60;
        if (state.success) {
          state.safety = Math.min(100, state.safety + 5);
          pushLog('班次完成：发电量 ' + Math.round(state.energy) + ' MWh，安全评分 ' + Math.round(state.safety) + '。', 'good');
        } else {
          pushLog('班次结束：未达成全部考核目标。', 'warn');
        }
      }
    }

    function setSpeed(s) {
      state.speed = clamp(Number(s) || 1, 1, 4);
      return state.speed;
    }

    function setControl(name, value) {
      const ranges = { rod: [0, 100], pump: [40, 120], load: [0, 100] };
      if (!Object.prototype.hasOwnProperty.call(ranges, name)) return;
      if (state.status === 'failed' || state.status === 'complete') return;
      if (state.status === 'scram' && name !== 'pump') return; // 停堆后仍须保持冷却
      if (name === 'rod' && state.t < state.rodLockUntil) return;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      state[name] = clamp(numeric, ranges[name][0], ranges[name][1]);
    }

    function applyDecayHeat(watts) {
      if (Number.isFinite(watts)) state.decayHeat = Math.max(state.decayHeat, watts);
    }

    /** 停堆后复位：确认功率已降至极低，允许重新提棒 */
    function resetAfterScram() {
      if (state.status !== 'scram') return false;
      if (state.power > 5) return false;
      if (state.t < state.rodLockUntil) return false;
      state.rod = 100;
      state.load = 0;
      state.rodLockUntil = 0;
      state.status = 'standby';
      pushLog('控制棒复位，反应堆回到次临界；氙毒仍在，重新启动需要更多提棒。', 'warn');
      return true;
    }

    function reset() {
      const fresh = create(o);
      Object.keys(state).forEach((k) => { if (k !== 'speed') delete state[k]; });
      Object.keys(fresh.state).forEach((k) => { state[k] = fresh.state[k]; });
      return state;
    }

    pushLog('反应堆处于热备用状态。提棒至临界后即可并网发电。', 'info', 0);

    return {
      state,
      step,
      scram,
      setSpeed,
      setControl,
      reset,
      resetAfterScram,
      applyDecayHeat,
      config: K,
      constants: { RATED_MW, THERMAL_MW, MISSION_HOURS, ENERGY_TARGET }
    };
  }

  NEG.ReactorModel = { create, constants: { RATED_MW, THERMAL_MW, MISSION_HOURS, ENERGY_TARGET } };
})(window.NEG);
