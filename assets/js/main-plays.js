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

   defineLoader(type, loader, { label }) 只声明入口，不执行加载。
   load(type) 在首次进入时加载并复用同一个进行中的 Promise。
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const plays = Object.create(null);
  const loaders = Object.create(null);
  const owners = new WeakMap();
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

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

    defineLoader(type, loader, options) {
      if (!type || typeof loader !== 'function') return null;
      const label = typeof options === 'string' ? options : options && options.label;
      const metadata = { type, label: label || type, lazy: true };
      loaders[type] = { loader, metadata, promise: null, ready: !!plays[type] };
      return metadata;
    },

    get(type) { return plays[type] || (loaders[type] && loaders[type].metadata) || null; },
    has(type) { return !!(plays[type] || loaders[type]); },
    label(type) { const def = registry.get(type); return def ? def.label : type; },
    list() { return Array.from(new Set(Object.keys(plays).concat(Object.keys(loaders)))).map((k) => registry.get(k)); },

    load(type) {
      const record = loaders[type];
      if (!record) return plays[type] ? Promise.resolve(plays[type]) : Promise.reject(new Error('未知关卡：' + type));
      if (record.promise) return record.promise;
      if (record.ready && plays[type]) return Promise.resolve(plays[type]);
      const pending = Promise.resolve().then(() => record.loader()).then(() => {
        if (!plays[type]) throw new Error('关卡未注册：' + type);
        record.ready = true;
        return plays[type];
      }).catch((error) => {
        if (record.promise === pending) record.promise = null;
        record.ready = false;
        throw error;
      });
      record.promise = pending;
      return pending;
    },

    /**
     * 统一挂载入口。玩法不存在时返回 null,由调用方降级处理。
     * opts.replay === true 表示这一章的这个关卡已通关过,玩法不应再计分。
     * @returns {Function|null} cleanup
     */
    mount(type, container, payload, ctx, done, opts) {
      if (!registry.has(type) || !container || (typeof container !== 'object' && typeof container !== 'function')) return null;
      const previous = owners.get(container);
      if (previous) previous();
      let cleanup = null;
      let active = true;
      let attempt = 0;
      let loading = false;
      let retryCleanup = null;

      function clearRetry() {
        if (retryCleanup) retryCleanup();
        retryCleanup = null;
      }

      function busy(value) {
        if (typeof container.setAttribute === 'function') container.setAttribute('aria-busy', String(value));
      }

      function dispose() {
        if (!active) return;
        active = false;
        attempt++;
        clearRetry();
        if (owners.get(container) === dispose) {
          owners.delete(container);
          busy(false);
        }
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

      function launch(def) {
        const version = ++attempt;
        let mounting = true;
        let completed = false;
        let pendingResult;
        let hasPendingResult = false;
        function complete(result) {
          if (!active || version !== attempt || completed) return;
          completed = true;
          // 挂载函数可以同步完成；先取得 cleanup，再通知主线切换视图。
          if (mounting) { pendingResult = result; hasPendingResult = true; }
          else deliver(result);
        }
        try {
          const release = def.mount(container, payload || {}, ctx, complete, opts || {});
          cleanup = typeof release === 'function' ? release : null;
          if (release === null && !hasPendingResult) { attempt++; return false; }
        } catch (err) {
          attempt++;
          console.error('[mainPlays] 玩法挂载失败:' + type, err);
          return false;
        }
        mounting = false;
        if (hasPendingResult) deliver(pendingResult);
        return true;
      }

      function showFailure() {
        if (!active) return;
        busy(false);
        container.innerHTML = '<div class="empty" role="alert"><p>关卡暂时无法加载，请重试。</p>' +
          '<button class="btn btn-primary" type="button" data-game-retry>重新加载关卡</button>' +
          '<button class="btn btn-quiet" type="button" data-game-reload>刷新页面</button></div>';
        const button = typeof container.querySelector === 'function' ? container.querySelector('[data-game-retry]') : null;
        const reload = typeof container.querySelector === 'function' ? container.querySelector('[data-game-reload]') : null;
        const reloadPage = () => {
          if (NEG.store && typeof NEG.store.flush === 'function') NEG.store.flush();
          window.location.reload();
        };
        if (reload) reload.addEventListener('click', reloadPage);
        if (button) {
          button.addEventListener('click', startLoad);
        }
        retryCleanup = () => {
          if (button) button.removeEventListener('click', startLoad);
          if (reload) reload.removeEventListener('click', reloadPage);
        };
      }

      function startLoad() {
        if (!active || loading) return;
        clearRetry();
        loading = true;
        const version = ++attempt;
        busy(true);
        container.innerHTML = '<div class="empty" role="status" aria-live="polite">正在准备' +
          escape(registry.label(type)) + '…</div>';
        registry.load(type).then((def) => {
          if (!active || version !== attempt) return;
          loading = false;
          busy(false);
          if (!launch(def)) showFailure();
        }).catch(() => {
          if (!active || version !== attempt) return;
          loading = false;
          showFailure();
        });
      }

      owners.set(container, dispose);
      if (plays[type] && (!loaders[type] || loaders[type].ready)) {
        if (!launch(plays[type])) { dispose(); return null; }
      } else startLoad();
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
