/* ============================================================
   核纪元 · Task Manager（模块任务管理器）
   ------------------------------------------------------------
   统一管理全部实验模块的注册、排序、挂载 / 卸载、进度与状态。
   - 模块只负责「怎么渲染」，不关心路由、导航、存档
   - 生命周期兜底：渲染异常不会拖垮整页
   - 进度 / 完成度由模块声明，首页、导航、战绩卡统一读取
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const tasks = [];            // 模块定义列表（按 order 排序）
  const state = {
    currentId: null,
    current: null,             // { def, cleanup }
    lastError: null,
    mountedAt: 0
  };

  function normalize(def) {
    if (!def || !def.id || typeof def.render !== 'function') return null;
    return {
      id: def.id,
      title: def.title || def.id,
      nav: def.nav || def.title || def.id,
      icon: def.icon || 'info',
      order: typeof def.order === 'number' ? def.order : 999,
      blurb: def.blurb || '',
      accent: def.accent || 'cyan',
      /* hidden: 注册仍在、代码照跑,只是不出现在导航与首页入口 */
      hidden: !!def.hidden,
      render: def.render,
      progress: typeof def.progress === 'function' ? def.progress : null,
      isComplete: typeof def.isComplete === 'function' ? def.isComplete : null,
      onMount: typeof def.onMount === 'function' ? def.onMount : null
    };
  }

  const TM = {
    /* ---------- 注册 ---------- */
    register(def) {
      const item = normalize(def);
      if (!item) {
        console.warn('[TaskManager] 非法模块定义，已忽略：', def && def.id);
        return null;
      }
      const i = tasks.findIndex((t) => t.id === item.id);
      if (i >= 0) tasks[i] = item;
      else tasks.push(item);
      tasks.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      return item;
    },

    /* ---------- 查询 ---------- */
    get(id) {
      return tasks.find((t) => t.id === id) || null;
    },
    list() {
      return tasks.slice();
    },
    /* 只返回对外展示的模块(导航 / 首页入口用) */
    visible() {
      return tasks.filter((t) => !t.hidden);
    },
    ids() {
      return tasks.map((t) => t.id);
    },
    currentId() {
      return state.currentId;
    },
    current() {
      return state.current ? state.current.def : null;
    },
    find(predicate) {
      return tasks.find(predicate) || null;
    },

    /* ---------- 生命周期 ---------- */
    mount(id, view, ctx) {
      const def = TM.get(id);
      if (!def || !view) return null;

      TM.unmount();
      view.innerHTML = '';

      let cleanup = null;
      state.lastError = null;
      try {
        cleanup = def.render(view, ctx);
      } catch (err) {
        state.lastError = err;
        console.error('[TaskManager] 模块渲染失败：' + id, err);
        view.innerHTML =
          '<div class="empty">' +
          '<p style="font-size:15px;color:var(--text);margin-bottom:6px">「' + def.title + '」加载失败</p>' +
          '<p style="font-size:12px;color:var(--text-3)">请刷新页面重试；如果问题持续出现，请查看控制台错误。</p>' +
          '</div>';
      }

      state.current = { def, cleanup: typeof cleanup === 'function' ? cleanup : null };
      state.currentId = id;
      state.mountedAt = Date.now();

      if (typeof def.onMount === 'function') {
        try { def.onMount(ctx, def); } catch (err) { console.warn('[TaskManager] onMount 失败：' + id, err); }
      }
      return def;
    },

    unmount() {
      if (!state.current) return;
      const prev = state.current;
      if (typeof prev.cleanup === 'function') {
        try { prev.cleanup(); } catch (err) { console.warn('[TaskManager] 模块清理失败：' + prev.def.id, err); }
      }
      state.current = null;
      state.currentId = null;
    },

    /* ---------- 进度 / 状态 ---------- */
    progress(id, appState) {
      const def = TM.get(id);
      const s = appState || (NEG.store && NEG.store.get()) || {};
      if (!def) return 0;
      if (def.progress) {
        try {
          const p = Number(def.progress(s));
          return Math.max(0, Math.min(1, isFinite(p) ? p : 0));
        } catch (e) { return 0; }
      }
      const mode = (s.modes && s.modes[id]) || {};
      return (mode.plays || 0) > 0 ? 1 : 0;
    },

    isComplete(id, appState) {
      const def = TM.get(id);
      const s = appState || (NEG.store && NEG.store.get()) || {};
      if (!def) return false;
      if (def.isComplete) {
        try { return !!def.isComplete(s); } catch (e) { return false; }
      }
      return TM.progress(id, s) >= 1;
    },

    status(id, appState) {
      const s = appState || (NEG.store && NEG.store.get()) || {};
      if (TM.isComplete(id, s)) return 'done';
      if (TM.progress(id, s) > 0) return 'active';
      const mode = (s.modes && s.modes[id]) || {};
      return (mode.plays || 0) > 0 ? 'active' : 'new';
    },

    statusLabel(status) {
      return { done: '已完成', active: '进行中', new: '未开始' }[status] || '未开始';
    },

    /** 全局统计：完成模块数 / 已体验数 / 平均进度 */
    stats(appState) {
      const s = appState || (NEG.store && NEG.store.get()) || {};
      const labTasks = tasks.filter((t) => t.id !== 'home' && t.id !== 'main' && !t.hidden);
      let done = 0;
      let active = 0;
      let sum = 0;
      labTasks.forEach((t) => {
        const p = TM.progress(t.id, s);
        sum += p;
        if (TM.isComplete(t.id, s)) done++;
        else if (p > 0 || ((s.modes && s.modes[t.id] || {}).plays || 0) > 0) active++;
      });
      return {
        total: labTasks.length,
        done,
        active,
        percent: labTasks.length ? Math.round((sum / labTasks.length) * 100) : 0
      };
    },

    /** 供调试：查看已注册模块 */
    debug() {
      return tasks.map((t) => ({ id: t.id, title: t.title, order: t.order, progress: TM.progress(t.id) }));
    }
  };

  NEG.tasks = TM;

  /* 向后兼容：旧 API 仍然可用，内部统一走 TaskManager */
  NEG.registerMode = TM.register;
  NEG.modeById = TM.get;
  Object.defineProperty(NEG, 'modes', {
    get() { return tasks; },
    configurable: true
  });
})(window.NEG);
