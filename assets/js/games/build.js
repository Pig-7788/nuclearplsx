/* ============================================================
   核纪元 · 主线关卡:核电站建造
   ------------------------------------------------------------
   触发来源:章节场景内 action { target_module:'reactor_build_game',
                               payload:{ puzzle_id } }

   这里不重复实现建造玩法 —— 直接复用 NEG.plantBuild,也就是
   导航里「核电站建造」模块用的同一份核心:同一张压水堆剖面图、
   同样按 order 拼装 12 个部件、同样的一/二/三回路贯通与干扰卡。
   区别只在外壳:这里是内嵌紧凑版,建成后回填主线进度。
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
        distractors: true,
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
