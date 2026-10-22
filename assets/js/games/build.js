import '../main-plays.js';
import '../plant-build.js';

/* ============================================================
   核纪元 · 主线关卡:核电站建造
   ------------------------------------------------------------
   触发来源:章节场景内 action { target_module:'reactor_build_game',
                               payload:{ puzzle_id } }

   这里不重复实现建造玩法 —— 直接复用 NEG.plantBuild,也就是
   导航里「核电站建造」模块用的同一份核心:同一张压水堆剖面图、
   章节版聚焦 7 个核心部件；独立实验室保留完整 12 部件与干扰卡。
   这里是内嵌紧凑版,建成后回填主线进度。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  NEG.mainPlays.register('reactor_build_game', {
    label: '反应堆建造',

    mount(container, payload, ctx, done, opts) {
      if (!NEG.plantBuild) {
        container.innerHTML = '<div class="empty">建造组件未加载,请刷新页面。</div>';
        return null;
      }

      const handle = NEG.plantBuild.mount(container, {
        variant: 'inline',
        /* 章节内聚焦 7 个核心部件；完整 12 部件挑战保留在独立实验室 */
        partIds: ['fuel', 'vessel', 'containment', 'sg', 'turbine', 'generator', 'transformer'],
        intro: '点选部件，再点击“放入”或图中对应位置。需先完成核岛（含安全壳），再完成发电与并网。完整 12 部件挑战在独立实验室。',
        distractors: false,
        /* 重玩不计分,避免刷分 */
        noScore: !!(opts && opts.replay),
        onComplete(result) {
          done(result || { ok: true });
        }
      }, ctx);

      return function cleanup() {
        if (handle) handle.destroy();
        else container.innerHTML = '';
      };
    }
  });
})(window.NEG);
