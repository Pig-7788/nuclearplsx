/* ============================================================
   核纪元 · 核电站建造(整页模块)
   ------------------------------------------------------------
   本模块只负责「导航里的一个页面」:
     · 挂上 shell.full 一屏外壳
     · 把建造逻辑交给 NEG.plantBuild(共享核心)
     · 建成后弹本页的结算弹窗

   建造逻辑、剖面图、回路贯通、干扰卡全部在 plant-build.js,
   主线第五章的关卡用的是同一份实现(内嵌外壳)。
   ============================================================ */
(function (NEG) {
  'use strict';

  NEG.registerMode({
    id: 'city',
    order: 2,
    title: '核电站建造',
    nav: '核电站建造',
    icon: 'build',
    accent: '#38e1ff',
    blurb: '按工程顺序拼装压水堆：堆芯、蒸汽发生器、安全壳、汽轮机……',

    progress(s) {
      return Math.min(1, (s.modes.city.completed || 0) > 0 ? 1 : ((s.modes.city.bestSteps || 0) / 12));
    },
    isComplete(s) { return (s.modes.city.completed || 0) > 0; },

    render(root, ctx) {
      const { store, ui, util: U } = ctx;
      const plant = ctx.data.plant || {};
      const loops = plant.loops || [];
      const total = (plant.parts || []).length;

      const st = store.get();
      const bestSteps = (st.modes.city && st.modes.city.bestSteps) || 0;

      const exitShell = NEG.shell.full('city');

      const handle = NEG.plantBuild.mount(root, {
        variant: 'page',
        distractors: true,
        onRestart() {
          ctx.go('city', { force: true });
        },
        onComplete() {
          ui.modal({
            eyebrow: 'CONSTRUCTION COMPLETE · 建成',
            title: '一座压水堆核电站建成！',
            wide: true,
            html:
              '<div class="summary-hero">' +
                '<div class="summary-score">' + total + ' / ' + total + '</div>' +
                '<div class="summary-label">核心部件全部就位</div>' +
              '</div>' +
              '<p>你已经亲手拼出了压水堆的完整能量路径：</p>' +
              '<div class="kpi-row" style="margin-top:14px">' +
                loops.map((l) => '<div class="kpi"><b style="font-size:13px;color:' + l.color + '">' +
                  U.esc(l.name) + '</b><span>' + U.esc(l.temp) + '</span></div>').join('') +
              '</div>' +
              '<p style="margin-top:16px">记住这条主线：<strong>核裂变 → 一回路高压水 → 蒸汽发生器 → ' +
                '二回路蒸汽 → 汽轮机 → 发电机 → 电网</strong>。三回路只负责把余热排给环境，全程不接触放射性。</p>' +
              '<div class="data-note">完成奖励 +40 分。切换「回路状态」可以回看每条回路的走向。</div>',
            actions: [
              { label: '返回首页', kind: 'ghost', onClick: () => ctx.go('home') },
              {
                label: '再建一次',
                kind: 'primary',
                icon: 'refresh',
                onClick: () => ctx.go('city', { force: true })
              }
            ]
          });
        }
      }, ctx);

      if (bestSteps > 0 && bestSteps < total) {
        ui.toast('上次建造到第 ' + bestSteps + ' 步，这次继续完成它', 'info');
      }

      return function cleanup() {
        if (handle) handle.destroy();
        exitShell();
      };
    }
  });
})(window.NEG);
