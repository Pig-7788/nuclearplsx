/* ============================================================
   核纪元 · 主线玩法注册表
   ------------------------------------------------------------
   主线剧情里的每个关卡都是一个「玩法」,统一在这里注册。
   main.js 只按 gameplay.type 派发,不认识任何具体玩法。

   注册接口:
     NEG.mainPlays.register(type, {
       label,                      // 玩法中文名(用于按钮 / 提示)
       mount(container, payload, ctx, done) → cleanup?
     })

   - payload:该章 gameplay 数据,或剧情 action.payload(外部模块触发)
   - done(result):玩法通关后回调,result 会写进存档 modes.main.games[type]
   - 返回的函数会在切章 / 退出时调用,用于解绑监听

   当前阶段:注册表就位,内置玩法在后续阶段逐个填充。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const plays = Object.create(null);

  const registry = {
    /**
     * @param {string} type gameplay.type 或 action.target_module
     * @param {{label?:string, mount:Function}} def
     */
    register(type, def) {
      if (!type || !def || typeof def.mount !== 'function') {
        console.warn('[mainPlays] 非法玩法定义,已忽略:', type);
        return null;
      }
      plays[type] = {
        type: type,
        label: def.label || type,
        mount: def.mount
      };
      return plays[type];
    },

    get(type) { return plays[type] || null; },
    has(type) { return !!plays[type]; },
    label(type) { return plays[type] ? plays[type].label : type; },
    list() { return Object.keys(plays).map((k) => plays[k]); },

    /**
     * 统一挂载入口。玩法不存在时返回 null,由调用方降级处理。
     * opts.replay === true 表示这一章的这个关卡已通关过,玩法不应再计分。
     * @returns {Function|null} cleanup
     */
    mount(type, container, payload, ctx, done, opts) {
      const def = plays[type];
      if (!def) return null;
      let cleanup = null;
      let active = true;
      let completed = false;
      let mounting = true;
      let pendingResult;
      let hasPendingResult = false;

      function dispose() {
        if (!active) return;
        active = false;
        const release = cleanup;
        cleanup = null;
        if (release) {
          try { release(); } catch (err) { console.warn('[mainPlays] 玩法清理失败:' + type, err); }
        }
      }

      function deliver(result) {
        dispose();
        if (typeof done === 'function') done(result);
      }

      function complete(result) {
        if (!active || completed) return;
        completed = true;
        // 挂载函数可以同步完成；先取得 cleanup，再通知主线切换视图。
        if (mounting) { pendingResult = result; hasPendingResult = true; }
        else deliver(result);
      }

      try {
        const release = def.mount(
          container,
          payload || {},
          ctx,
          complete,
          opts || {}
        );
        cleanup = typeof release === 'function' ? release : null;
        if (release === null && !hasPendingResult) {
          active = false;
          return null;
        }
      } catch (err) {
        active = false;
        console.error('[mainPlays] 玩法挂载失败:' + type, err);
        return null;
      }
      mounting = false;
      if (hasPendingResult) deliver(pendingResult);
      // 无常驻资源的玩法也需要一个句柄，用于退出后忽略迟到的 done。
      return dispose;
    },

    /**
     * 关卡内的自适应字号:内容放不下时把 --game-fs 往下压,
     * 直到整块装进容器(容器需 overflow:hidden,不允许出滚动条)。
     * @param {Element} el   充当测量容器与作用域的元素
     * @param {Element} sample 取基准字号的元素(默认取 el 内第一个 p)
     * @param {number} floor 最小字号
     */
    fit(el, sample, floor) {
      if (!el || !el.clientHeight) return;
      el.style.removeProperty('--game-fs');
      const probe = sample || el.querySelector('p') || el.firstElementChild || el;
      const base = Math.round(parseFloat(getComputedStyle(probe).fontSize)) || 13;
      let size = base;
      let guard = 0;
      const min = floor || 10;
      while (el.scrollHeight > el.clientHeight + 1 && size > min && guard++ < 12) {
        size -= 1;
        el.style.setProperty('--game-fs', size + 'px');
      }
    }
  };

  NEG.mainPlays = registry;
})(window.NEG);
