/* ============================================================
   核纪元 · 核心运行时
   - 状态与本地存档
   - 音效引擎（Web Audio 实时合成）
   - 路由与模块注册
   - 弹窗 / Toast / 分享卡 / 成就
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  NEG.data = NEG.data || {};
  NEG.version = '1.0.0';

  /* ==========================================================
     1. 图标库
     ========================================================== */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    build: '<path d="M12 2.5 2.5 7.2 12 12l9.5-4.8L12 2.5Z"/><path d="m2.5 12 9.5 4.8L21.5 12"/><path d="m2.5 16.8 9.5 4.7 9.5-4.7"/>',
    gauge: '<path d="M20.5 15.5a9 9 0 1 0-17 0"/><path d="M12 13.5 16 9"/><circle cx="12" cy="14.5" r="1.6"/>',
    radiation:
      '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/>' +
      '<path d="M12 3.2A8.8 8.8 0 0 1 19.62 7.6l-5.5 3.18a2.6 2.6 0 0 0-2.36-1.36Z" fill="currentColor" stroke="none"/>' +
      '<path d="M19.62 16.4A8.8 8.8 0 0 1 4.38 16.4l5.5-3.18a2.6 2.6 0 0 0 4.24.06Z" fill="currentColor" stroke="none"/>' +
      '<path d="M4.38 7.6A8.8 8.8 0 0 1 12 3.2l0 6.7a2.6 2.6 0 0 0-2.36 1.36Z" fill="currentColor" stroke="none"/>',
    flag: '<path d="M5 21V3.5"/><path d="M5 4.5h13l-1.8 4.2L18 13H5"/>',
    sound: '<path d="M11 5 6.5 8.5H3.5v7h3L11 19V5Z"/><path d="M15.4 8.6a5 5 0 0 1 0 6.8"/><path d="M18.2 5.8a9 9 0 0 1 0 12.4"/>',
    mute: '<path d="M11 5 6.5 8.5H3.5v7h3L11 19V5Z"/><path d="m15.5 9.5 5 5"/><path d="m20.5 9.5-5 5"/>',
    trophy: '<path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H4.8v1.6A3.4 3.4 0 0 0 8 10"/><path d="M16 5h3.2v1.6A3.4 3.4 0 0 1 16 10"/><path d="M12 12.5V17"/><path d="M8 21h8"/><path d="M9.5 21c0-2.2 1-4 2.5-4s2.5 1.8 2.5 4"/>',
    close: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="m7 7 10 10"/><path d="M17 7 7 17"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>',
    arrowRight: '<path d="M4 12h15"/><path d="m14 6.5 5.5 5.5-5.5 5.5"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.5 4v4.5H16"/>',
    share: '<path d="M12 16V3.5"/><path d="m8 7 4-3.5L16 7"/><path d="M5 12.5V20h14v-7.5"/>',
    play: '<path d="M7.5 5 19 12 7.5 19V5Z"/>',
    bolt: '<path d="M13.5 2 4 14h6.5L9.5 22 20 9.5h-6.5L13.5 2Z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
    shield: '<path d="M12 2.8 4.8 5.7v5.5c0 4.4 2.9 7.9 7.2 9.5 4.3-1.6 7.2-5.1 7.2-9.5V5.7L12 2.8Z"/><path d="m8.8 11.8 2.3 2.3 4.3-4.6"/>',
    keyboard: '<rect x="2.8" y="6" width="18.4" height="12" rx="2.4"/><path d="M6.8 10h.01M10 10h.01M13.2 10h.01M16.4 10h.01M8 14h8"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.4l3.4 2"/>',
    alert: '<path d="M12 3.5 22 20.5H2L12 3.5Z"/><path d="M12 9.5v4.6"/><circle cx="12" cy="17.4" r="0.9" fill="currentColor" stroke="none"/>',
    trend: '<path d="M3 17.5 9 11l3.6 3.6L21 6.5"/><path d="M15 6.5h6v6"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    sparkles: '<path d="M12 3.5 13.6 8.4 18.5 10l-4.9 1.6L12 16.5l-1.6-4.9L5.5 10l4.9-1.6L12 3.5Z"/><path d="M18.5 15.5 19.2 17.8 21.5 18.5 19.2 19.2 18.5 21.5 17.8 19.2 15.5 18.5 17.8 17.8 18.5 15.5Z"/>'
  };

  NEG.icon = function (name, size) {
    const body = ICONS[name] || ICONS.info;
    const s = size || 18;
    return (
      '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body + '</svg>'
    );
  };

  /* ==========================================================
     2. 工具函数
     ========================================================== */
  const U = {
    esc(str) {
      return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },
    clamp(v, min, max) { return Math.min(max, Math.max(min, v)); },
    lerp(a, b, t) { return a + (b - a) * t; },
    rand(min, max) { return min + Math.random() * (max - min); },
    randInt(min, max) { return Math.floor(U.rand(min, max + 1)); },
    choice(arr) { return arr[U.randInt(0, arr.length - 1)]; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    sum(arr, fn) { return arr.reduce((acc, x) => acc + (fn ? fn(x) : x), 0); },
    pad(n, len) { return String(n).padStart(len || 2, '0'); },
    clampNum(v, d) {
      const p = Math.pow(10, d == null ? 2 : d);
      return Math.round(v * p) / p;
    },
    fmtNum(n) {
      if (!isFinite(n)) return '—';
      return Math.round(n).toLocaleString('zh-CN');
    },
    trimNum(n) {
      if (!isFinite(n)) return '—';
      return String(Math.round(n * 100) / 100);
    },
    formatDose(mSv) {
      if (!isFinite(mSv)) return '—';
      if (mSv >= 1000) return U.trimNum(mSv / 1000) + ' Sv';
      if (mSv >= 1) return U.trimNum(mSv) + ' mSv';
      if (mSv >= 0.01) return U.trimNum(mSv) + ' mSv';
      return U.trimNum(mSv * 1000) + ' µSv';
    },
    todayKey(date) {
      const d = date || new Date();
      return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
    },
    hashString(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return Math.abs(h >>> 0);
    },
    debounce(fn, wait) {
      let t = null;
      return function () {
        const args = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(() => fn.apply(self, args), wait);
      };
    },
    raf(fn) { return requestAnimationFrame(fn); },
    on(el, type, fn, opts) {
      if (!el) return () => {};
      el.addEventListener(type, fn, opts);
      return () => el.removeEventListener(type, fn, opts);
    },
    isTyping(e) {
      const t = e.target;
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
    },
    vibrate(ms) {
      try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* noop */ }
    },
    cssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
  };
  NEG.util = U;

  /* ==========================================================
     3. 状态 / 存档
     ========================================================== */
  const STORAGE_KEY = 'nuclear-epoch:v1';

  function defaults() {
    return {
      v: 1,
      score: 0,
      bestScore: 0,
      modes: {
        home: { plays: 0 },
        main: {
          plays: 0,
          current: null,
          panelIndex: 0,
          completed: [],
          cards: [],
          games: {},
          rumors: { debunked: 0, correct: 0 },
          attitude_baseline: null,
          certificate: false
        },
        rumor: { plays: 0, sessions: 0, answered: 0, correct: 0, bestSession: 0, seen: [] },
        city: { plays: 0, completed: 0, bestSteps: 0 },
        console: { plays: 0, completed: 0, bestEnergy: 0, bestSafety: 0 },
        dose: { plays: 0, viewed: [] },
        china: { plays: 0, viewed: [] }
      },
      achievements: {},
      flags: {},
      settings: { sound: true },
      daily: { date: '', done: false, correct: false },
      lastMode: 'home',
      updatedAt: 0
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function mergeDeep(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    Object.keys(patch).forEach((k) => {
      const pv = patch[k];
      if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
        if (!base[k] || typeof base[k] !== 'object' || Array.isArray(base[k])) base[k] = {};
        mergeDeep(base[k], pv);
      } else if (pv !== undefined) {
        base[k] = pv;
      }
    });
    return base;
  }

  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          mergeDeep(d, parsed);
          // 清理非法值
          d.score = Math.max(0, Number(d.score) || 0);
          d.bestScore = Math.max(d.score, Number(d.bestScore) || 0);
          d.modes.rumor.seen = Array.isArray(d.modes.rumor.seen) ? d.modes.rumor.seen : [];
          d.modes.dose.viewed = Array.isArray(d.modes.dose.viewed) ? d.modes.dose.viewed : [];
          d.modes.china.viewed = Array.isArray(d.modes.china.viewed) ? d.modes.china.viewed : [];
        }
      }
    } catch (e) { /* 隐私模式 / file:// 限制时静默降级 */ }
    return d;
  }

  const listeners = [];
  let data = load();
  let saveTimer = null;

  function persist() {
    data.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
    }, 120);
  }

  function notify(reason) {
    listeners.forEach((fn) => {
      try { fn(data, reason); } catch (e) { /* 防止单个订阅者影响全局 */ }
    });
    NEG.updateHeader();
  }

  const store = {
    get() { return data; },
    subscribe(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    set(mutator, reason) {
      if (typeof mutator === 'function') mutator(data);
      persist();
      notify(reason || 'set');
      return data;
    },
    addScore(n, reason) {
      if (!n) return 0;
      data.score = Math.max(0, Math.round(data.score + n));
      data.bestScore = Math.max(data.bestScore, data.score);
      persist();
      notify(reason || 'score');
      return n;
    },
    reset() {
      data = defaults();
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
      persist();
      notify('reset');
    },
    save: persist,
    defaults
  };
  NEG.store = store;

  /* ==========================================================
     4. 音效引擎
     ========================================================== */
  const Sound = (function () {
    let ctx = null;
    let master = null;

    function ensure() {
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.55;
          master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      } catch (e) { return null; }
    }

    function enabled() {
      return !!(data.settings && data.settings.sound);
    }

    function tone(freq, startAt, dur, opts) {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      const o0 = opts || {};
      o.type = o0.type || 'sine';
      o.frequency.setValueAtTime(freq, startAt);
      if (o0.to) o.frequency.exponentialRampToValueAtTime(Math.max(30, o0.to), startAt + dur);
      const peak = o0.gain == null ? 0.2 : o0.gain;
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
      o.connect(g);
      g.connect(master);
      o.start(startAt);
      o.stop(startAt + dur + 0.02);
    }

    const bank = {
      click(c, now) { tone(920, now, 0.07, { type: 'sine', to: 760, gain: 0.14 }); },
      drop(c, now) { tone(420, now, 0.09, { type: 'sine', to: 260, gain: 0.16 }); },
      hover(c, now) { tone(520, now, 0.035, { type: 'sine', to: 480, gain: 0.05 }); },
      correct(c, now) {
        [523.25, 659.25, 783.99].forEach((f, i) => {
          tone(f, now + i * 0.09, 0.28, { type: 'triangle', gain: 0.16 });
        });
      },
      wrong(c, now) {
        tone(196, now, 0.32, { type: 'sawtooth', to: 120, gain: 0.1 });
        tone(146.8, now + 0.05, 0.3, { type: 'square', to: 110, gain: 0.05 });
      },
      build(c, now) {
        [392, 523.25, 659.25, 783.99].forEach((f, i) => {
          tone(f, now + i * 0.07, 0.22, { type: 'triangle', gain: 0.13 });
        });
      },
      fanfare(c, now) {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          tone(f, now + i * 0.13, 0.55, { type: 'triangle', gain: 0.17 });
        });
        tone(1567.98, now + 0.55, 0.7, { type: 'sine', gain: 0.08 });
      },
      unlock(c, now) {
        [880, 1174.66, 1567.98].forEach((f, i) => {
          tone(f, now + i * 0.1, 0.5, { type: 'sine', gain: 0.1 });
        });
      },
      alarm(c, now) {
        [880, 660].forEach((f, i) => {
          tone(f, now + i * 0.16, 0.16, { type: 'square', gain: 0.045 });
        });
      },
      scram(c, now) {
        tone(320, now, 0.5, { type: 'sawtooth', to: 70, gain: 0.09 });
      }
    };

    return {
      play(name) {
        if (!enabled()) return false;
        const c = ensure();
        if (!c) return false;
        const fn = bank[name] || bank.click;
        try { fn(c, c.currentTime + 0.005); return true; } catch (e) { return false; }
      },
      ensure,
      toggle() {
        data.settings.sound = !enabled();
        store.save();
        if (enabled()) this.play('click');
        notify('sound');
        return enabled();
      },
      isEnabled: enabled
    };
  })();
  NEG.audio = Sound;

  /* ==========================================================
     5. UI：Toast / Modal / 辅助
     ========================================================== */
  const ui = {};

  ui.el = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  ui.qs = (sel, root) => (root || document).querySelector(sel);
  ui.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  ui.toast = function (message, type, opts) {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const o = opts || {};
    const icons = { success: 'check', error: 'x', info: 'info', achievement: 'trophy' };
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="toast-icon">' + NEG.icon(icons[type] || 'info') + '</span>' +
      '<span class="toast-body">' + (o.title ? '<b>' + U.esc(o.title) + '</b><br>' : '') + U.esc(message) + '</span>';
    root.appendChild(el);
    const duration = o.duration || (type === 'achievement' ? 4200 : 2600);
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 260);
    }, duration);
  };

  ui.toastAchievement = function (achv) {
    ui.toast(achv.desc, 'achievement', { title: '成就解锁 · ' + achv.title });
  };

  ui.modal = function (opts) {
    const o = opts || {};
    const root = document.getElementById('overlayRoot');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const actions = (o.actions || []).map((a, i) =>
      '<button class="btn ' + (a.kind || 'ghost') + '" data-action="' + i + '" type="button">' +
      (a.icon ? NEG.icon(a.icon) : '') + U.esc(a.label) + '</button>'
    ).join('');

    overlay.innerHTML =
      '<div class="modal' + (o.wide ? ' is-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + U.esc(o.title || '对话框') + '">' +
        '<div class="modal-head">' +
          '<div class="modal-head-text">' +
            (o.eyebrow ? '<span class="modal-eyebrow">' + U.esc(o.eyebrow) + '</span>' : '') +
            '<h2 class="modal-title">' + U.esc(o.title || '') + '</h2>' +
          '</div>' +
          '<button class="modal-close" type="button" aria-label="关闭">' + NEG.icon('close') + '</button>' +
        '</div>' +
        '<div class="modal-body">' + (o.html || '') + '</div>' +
        (actions ? '<div class="modal-actions">' + actions + '</div>' : '') +
      '</div>';

    root.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const modalEl = overlay.querySelector('.modal');
    const lastFocus = document.activeElement;
    let closed = false;

    function close() {
      if (closed) return;
      closed = true;
      document.body.style.overflow = '';
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* noop */ } }
      if (typeof o.onClose === 'function') o.onClose();
    }

    function onKey(e) {
      if (e.key === 'Escape' && o.closable !== false) {
        e.stopPropagation();
        close();
      }
      if (e.key === 'Tab') {
        const focusables = ui.qsa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalEl)
          .filter((el) => !el.disabled && el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay && o.closable !== false) close();
    });
    modalEl.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);

    (o.actions || []).forEach((a, i) => {
      const btn = modalEl.querySelector('[data-action="' + i + '"]');
      if (!btn) return;
      btn.addEventListener('click', () => {
        Sound.play('click');
        if (typeof a.onClick === 'function') a.onClick(handle);
        if (!a.keepOpen) close();
      });
    });

    const handle = { el: overlay, modal: modalEl, close, body: modalEl.querySelector('.modal-body') };
    setTimeout(() => {
      const focusTarget = modalEl.querySelector('[data-autofocus]') || modalEl.querySelector('.modal-actions .btn') || modalEl.querySelector('.modal-close');
      if (focusTarget) focusTarget.focus();
    }, 30);
    return handle;
  };

  ui.confirm = function (opts) {
    return new Promise((resolve) => {
      ui.modal({
        eyebrow: opts.eyebrow || '确认',
        title: opts.title || '确定吗？',
        html: '<p>' + U.esc(opts.message || '') + '</p>',
        actions: [
          { label: opts.cancelLabel || '取消', kind: 'ghost', onClick: () => resolve(false) },
          { label: opts.confirmLabel || '确定', kind: opts.danger ? 'danger' : 'primary', onClick: () => resolve(true) }
        ],
        onClose: () => resolve(false)
      });
    });
  };

  ui.countUp = function (el, to, opts) {
    if (!el) return;
    const o = opts || {};
    const from = Number(o.from || 0);
    const dur = o.duration || 900;
    const start = performance.now();
    const dec = o.decimals || 0;
    const fmt = o.format || ((v) => U.fmtNum(v));
    function frame(t) {
      const p = U.clamp((t - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(frame);
      else { el.textContent = fmt(to); el.dataset.dec = dec; }
    }
    requestAnimationFrame(frame);
  };

  ui.pageHead = function (opts) {
    const o = opts || {};
    return (
      '<div class="view-head anim-fade-up">' +
        '<div class="view-title">' +
          (o.eyebrow ? '<span class="eyebrow">' + U.esc(o.eyebrow) + '</span>' : '') +
          '<h2>' + (o.icon ? NEG.icon(o.icon, 26) : '') + U.esc(o.title || '') + '</h2>' +
          (o.lead ? '<p class="lead">' + o.lead + '</p>' : '') +
        '</div>' +
        (o.tools ? '<div class="view-tools">' + o.tools + '</div>' : '') +
      '</div>'
    );
  };

  /* ==========================================================
     6. 成就系统
     ========================================================== */
  const ACHIEVEMENTS = [
    { id: 'first_steps', title: '初次临界', desc: '进入任意一个实验室模块', icon: 'bolt', check: (s) => ['rumor', 'city', 'console', 'dose', 'china'].some((k) => (s.modes[k] || {}).plays > 0) },
    { id: 'debunk_10', title: '火眼金睛', desc: '累计答对 10 条谣言', icon: 'search', check: (s) => (s.modes.rumor.correct || 0) >= 10 },
    { id: 'debunk_perfect', title: '零误判', desc: '单组辟谣全部答对', icon: 'check', check: (s) => !!s.flags.perfectSession },
    { id: 'streak_5', title: '连胜五题', desc: '辟谣连续答对 5 题', icon: 'bolt', check: (s) => (s.flags.bestStreak || 0) >= 5 },
    { id: 'debunk_all', title: '题库猎手', desc: '答遍全部 32 条谣言', icon: 'trophy', check: (s) => (s.modes.rumor.seen || []).length >= 32 },
    { id: 'plant_built', title: '总工程师', desc: '建成一座完整的压水堆', icon: 'build', check: (s) => (s.modes.city.completed || 0) >= 1 },
    { id: 'steady_run', title: '金牌运行员', desc: '完成 12 小时并网发电任务', icon: 'gauge', check: (s) => (s.modes.console.completed || 0) >= 1 },
    { id: 'no_scram', title: '稳如磐石', desc: '零停堆完成一次运行任务', icon: 'shield', check: (s) => !!s.flags.noScramRun },
    { id: 'dose_explorer', title: '剂量雷达', desc: '查看 20 种辐射剂量', icon: 'info', check: (s) => (s.modes.dose.viewed || []).length >= 20 },
    { id: 'china_scholar', title: '核电通', desc: '浏览全部中国核电里程碑', icon: 'flag', check: (s) => {
      const total = (NEG.data.china && NEG.data.china.timeline || []).length;
      return total > 0 && (s.modes.china.viewed || []).length >= total;
    } },
    { id: 'explorer', title: '全栈体验', desc: '体验全部 5 个实验室', icon: 'home', check: (s) => ['rumor', 'city', 'console', 'dose', 'china']
      .filter((k) => { const d = NEG.tasks && NEG.tasks.get(k); return d && !d.hidden; })
      .every((k) => (s.modes[k] || {}).plays > 0) },
    { id: 'score_1000', title: '千分达成', desc: '累计得分达到 1000', icon: 'trophy', check: (s) => Math.max(s.score || 0, s.bestScore || 0) >= 1000 },
    { id: 'daily_truth', title: '每日一谣', desc: '揭晓今日谣言的真相', icon: 'book', check: (s) => !!s.flags.dailyDone }
  ];

  const achievements = {
    list: ACHIEVEMENTS,
    get(id) { return ACHIEVEMENTS.find((a) => a.id === id); },
    unlocked(id) { return !!data.achievements[id]; },
    count() { return Object.keys(data.achievements || {}).length; },
    unlock(id, opts) {
      const achv = achievements.get(id);
      if (!achv || data.achievements[id]) return false;
      data.achievements[id] = Date.now();
      persist();
      notify('achievement');
      if (!opts || opts.silent !== true) {
        ui.toastAchievement(achv);
        Sound.play('unlock');
      }
      return true;
    },
    checkAll(opts) {
      const found = [];
      ACHIEVEMENTS.forEach((a) => {
        if (!data.achievements[a.id]) {
          let ok = false;
          try { ok = !!a.check(data); } catch (e) { ok = false; }
          if (ok) { data.achievements[a.id] = Date.now(); found.push(a); }
        }
      });
      if (found.length) {
        persist();
        notify('achievement');
        if (!opts || opts.silent !== true) {
          found.forEach((a, i) => {
            setTimeout(() => { ui.toastAchievement(a); Sound.play('unlock'); }, i * 700);
          });
        }
      }
      return found;
    }
  };
  NEG.achievements = achievements;

  /* ==========================================================
     7. 分享卡（Canvas）
     ========================================================== */
  NEG.share = {
    build() {
      const W = 1200, H = 630;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      if (!g) return c;

      // 背景
      const bg = g.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#071524');
      bg.addColorStop(0.55, '#040d18');
      bg.addColorStop(1, '#02070d');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      // 光晕
      let rg = g.createRadialGradient(950, 80, 20, 950, 80, 520);
      rg.addColorStop(0, 'rgba(56,225,255,0.26)');
      rg.addColorStop(1, 'rgba(56,225,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
      rg = g.createRadialGradient(120, 600, 10, 120, 600, 460);
      rg.addColorStop(0, 'rgba(62,240,162,0.16)');
      rg.addColorStop(1, 'rgba(62,240,162,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);

      // 蓝图网格
      g.strokeStyle = 'rgba(120,190,255,0.07)';
      g.lineWidth = 1;
      for (let x = 0; x <= W; x += 48) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
      }
      for (let y = 0; y <= H; y += 48) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      }

      // 原子 / 轨道装饰（右上角）
      g.save();
      g.translate(1030, 178);
      g.strokeStyle = 'rgba(56,225,255,0.28)';
      g.lineWidth = 1.2;
      [1, 0.7, 0.44].forEach((k, i) => {
        g.save();
        g.rotate((i * Math.PI) / 3);
        g.beginPath();
        g.ellipse(0, 0, 150 * k, 58 * k, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      });
      const core = g.createRadialGradient(-10, -12, 2, 0, 0, 46);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.35, '#38e1ff');
      core.addColorStop(1, '#0a5c78');
      g.fillStyle = core;
      g.beginPath();
      g.arc(0, 0, 32, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(56,225,255,0.4)';
      g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 56, 0, Math.PI * 2); g.stroke();
      g.restore();

      // 顶栏
      g.fillStyle = '#38e1ff';
      g.font = '600 19px "PingFang SC", "Microsoft YaHei", sans-serif';
      g.fillText('NUCLEAR EPOCH · 交互式核能实验室', 72, 88);
      g.fillStyle = 'rgba(120,190,255,0.35)';
      g.fillRect(72, 108, 210, 2);

      // 主标题
      const titleGrad = g.createLinearGradient(72, 0, 560, 0);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.6, '#8ceeff');
      titleGrad.addColorStop(1, '#3ef0a2');
      g.fillStyle = titleGrad;
      g.font = '900 78px "PingFang SC", "Microsoft YaHei", sans-serif';
      g.fillText('核纪元', 72, 206);

      g.fillStyle = 'rgba(200,220,240,0.72)';
      g.font = '400 22px "PingFang SC", "Microsoft YaHei", sans-serif';
      g.fillText('我的核能探索战绩', 76, 250);

      // 分数
      const score = Math.round(data.bestScore || data.score || 0);
      g.fillStyle = '#ffc857';
      g.font = '800 118px "SF Mono", Menlo, monospace';
      g.fillText(String(score), 72, 400);
      g.fillStyle = 'rgba(160,185,210,0.8)';
      g.font = '400 20px "PingFang SC", sans-serif';
      g.fillText('累计得分', 76, 438);
      g.fillStyle = 'rgba(56,225,255,0.55)';
      g.fillRect(72, 454, 88, 3);

      // 统计（底部一行）
      const achvCount = achievements.count();
      const totalAchv = ACHIEVEMENTS.length;
      const stats = [
        ['成就解锁', achvCount + ' / ' + totalAchv],
        ['辟谣答对', String(data.modes.rumor.correct || 0)],
        ['核电站建成', String(data.modes.city.completed || 0) + ' 座'],
        ['中国核电', data.modes.china.plays ? '已探索' : '未解锁']
      ];
      stats.forEach((st2, i) => {
        const x = 470 + i * 182;
        g.fillStyle = 'rgba(120,190,255,0.26)';
        g.fillRect(x, 330, 160, 1);
        g.fillStyle = 'rgba(150,175,200,0.72)';
        g.font = '400 15px "PingFang SC", sans-serif';
        g.fillText(st2[0], x, 358);
        g.fillStyle = '#e9f2ff';
        g.font = '700 26px "SF Mono", Menlo, monospace';
        g.fillText(st2[1], x, 398);
      });

      // 底部
      g.fillStyle = 'rgba(120,190,255,0.22)';
      g.fillRect(72, 512, W - 144, 1);
      g.fillStyle = 'rgba(140,165,190,0.62)';
      g.font = '400 18px "PingFang SC", sans-serif';
      g.fillText('科学不是吓人的理由，而是不害怕的底气。', 72, 562);
      g.textAlign = 'right';
      g.fillStyle = 'rgba(120,190,255,0.55)';
      g.font = '400 16px "SF Mono", Menlo, monospace';
      const d = new Date();
      g.fillText(d.getFullYear() + '.' + U.pad(d.getMonth() + 1) + '.' + U.pad(d.getDate()), W - 72, 562);
      g.textAlign = 'left';

      return c;
    },
    open() {
      const canvas = NEG.share.build();
      const dataUrl = canvas.toDataURL('image/png');
      const h = ui.modal({
        eyebrow: '分享 · 战绩卡',
        title: '我的核能探索战绩',
        html: '<div style="text-align:center"><img src="' + dataUrl + '" alt="核纪元战绩卡" style="width:100%;border-radius:14px;border:1px solid rgba(120,190,255,.2);box-shadow:0 18px 50px rgba(0,0,0,.45)"></div>' +
              '<p style="margin-top:12px;font-size:12px;color:var(--text-3);text-align:center">保存图片，分享你的核能成绩。</p>',
        wide: true,
        actions: [
          { label: '关闭', kind: 'ghost' },
          {
            label: '下载战绩卡',
            kind: 'primary',
            icon: 'share',
            keepOpen: false,
            onClick() {
              try {
                const a = document.createElement('a');
                a.download = '核纪元-战绩卡-' + U.todayKey() + '.png';
                a.href = dataUrl;
                document.body.appendChild(a);
                a.click();
                a.remove();
                ui.toast('战绩卡已开始下载', 'success');
              } catch (e) {
                ui.toast('当前浏览器不支持直接下载，请长按图片保存', 'info');
              }
            }
          }
        ]
      });
      return h;
    }
  };

  /* ==========================================================
     8. 路由（模块注册 / 挂载由 task-manager.js 统一管理）
     ========================================================== */
  let suppressHash = false;

  const router = {
    currentId: null,
    go(id, opts) {
      const o = opts || {};
      const def = NEG.tasks.get(id) || NEG.tasks.get('home');
      if (!def) return;
      if (!o.force && !o.reload && router.currentId === def.id) {
        // 同模块重复点击：回到顶部即可
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 防止上一步残留的弹窗 / 提示阻挡交互
      document.querySelectorAll('.overlay').forEach((n) => n.remove());
      const toastRoot = document.getElementById('toastRoot');
      if (toastRoot) toastRoot.innerHTML = '';
      document.body.style.overflow = '';

      const view = document.getElementById('view');
      view.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });

      const ctx = {
        go: (nid, nopts) => router.go(nid, nopts),
        store,
        data: NEG.data,
        ui,
        audio: Sound,
        util: U,
        icon: NEG.icon,
        achievements,
        tasks: NEG.tasks
      };

      // TaskManager：卸载上一模块 -> 清空视图 -> 渲染新模块（含异常兜底）
      NEG.tasks.mount(def.id, view, ctx);
      view.classList.remove('is-entering');
      void view.offsetWidth;
      view.classList.add('is-entering');
      router.currentId = def.id;
      NEG.router.currentId = def.id;

      // 导航高亮 + 小屏时把当前项滚入可视区
      let activeLink = null;
      ui.qsa('.nav-link').forEach((a) => {
        const active = a.dataset.mode === def.id;
        a.classList.toggle('is-active', active);
        if (active) { a.setAttribute('aria-current', 'page'); activeLink = a; }
        else a.removeAttribute('aria-current');
      });
      const navEl = document.getElementById('modeNav');
      if (activeLink && navEl && navEl.scrollWidth > navEl.clientWidth + 4) {
        const left = activeLink.offsetLeft - (navEl.clientWidth - activeLink.offsetWidth) / 2;
        navEl.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }

      document.title = def.id === 'home' ? '核纪元 · 交互式核能实验室' : def.title + ' · 核纪元';
      view.focus({ preventScroll: true });

      // 记录
      if (def.id !== 'home') {
        store.set((s) => {
          if (!s.modes[def.id]) s.modes[def.id] = { plays: 0 };
          s.modes[def.id].plays = (s.modes[def.id].plays || 0) + 1;
        }, 'route');
        setTimeout(() => achievements.checkAll(), 400);
      }
      store.set((s) => { s.lastMode = def.id; }, 'lastMode');

      // url
      if (!suppressHash) {
        try { history.replaceState(null, '', '#/' + def.id); } catch (e) { /* file:// */ }
      } else {
        suppressHash = false;
      }
    },
    refresh() {
      if (router.currentId) router.go(router.currentId, { reload: true });
    }
  };
  NEG.router = router;

  /* ==========================================================
     9. 顶栏 / 导航 / 帮助
     ========================================================== */
  const NAV_LABELS = {
    home: '首页',
    rumor: '辟谣实验室',
    city: '核电站建造',
    console: '反应堆控制台',
    dose: '剂量实验室',
    china: '中国核电'
  };

  NEG.updateHeader = function () {
    const scoreEl = document.getElementById('scoreValue');
    if (scoreEl) {
      const next = String(data.score | 0);
      if (scoreEl.textContent !== next) {
        scoreEl.textContent = next;
        const pill = document.getElementById('scorePill');
        if (pill) {
          pill.classList.remove('bump');
          void pill.offsetWidth;
          pill.classList.add('bump');
        }
      }
    }
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
      const on = Sound.isEnabled();
      soundBtn.innerHTML = NEG.icon(on ? 'sound' : 'mute');
      soundBtn.classList.toggle('is-off', !on);
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      soundBtn.setAttribute('aria-label', on ? '关闭音效' : '开启音效');
    }
  };

  function buildNav() {
    const nav = document.getElementById('modeNav');
    if (!nav) return;
    nav.innerHTML = NEG.tasks.visible().map((m) =>
      '<a class="nav-link" href="#/' + m.id + '" data-mode="' + m.id + '" title="' + U.esc(m.title) + '">' +
      NEG.icon(m.icon || 'info', 15) + '<span>' + U.esc(NAV_LABELS[m.id] || m.title) + '</span></a>'
    ).join('');
    ui.qsa('.nav-link', nav).forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        Sound.play('click');
        router.go(a.dataset.mode);
      });
    });
  }

  /* ==========================================================
     启动自检 / 资源恢复
     ========================================================== */
  const REQUIRED_MODES = ['home', 'main', 'rumor', 'city', 'console', 'dose', 'china'];
  const MODE_TITLES = {
    home: '首页', main: '认知档案', rumor: '辟谣实验室', city: '核电站建造',
    console: '反应堆控制台', dose: '剂量实验室', china: '中国核电'
  };
  const MODE_SRCS = {
    home: 'assets/js/modes/home.js',
    main: 'assets/js/modes/main.js',
    rumor: 'assets/js/modes/rumor.js',
    city: 'assets/js/modes/city.js',
    console: 'assets/js/modes/console.js',
    dose: 'assets/js/modes/dose.js',
    china: 'assets/js/modes/china.js'
  };
  const DATA_RES = [
    { id: 'rumors', label: '辟谣题库', src: 'assets/js/data/rumors.js', check: () => Array.isArray(NEG.data.rumors) && NEG.data.rumors.length > 0 },
    { id: 'doses', label: '剂量数据', src: 'assets/js/data/doses.js', check: () => Array.isArray(NEG.data.doses) && NEG.data.doses.length > 0 },
    { id: 'china', label: '中国核电数据', src: 'assets/js/data/china.js', check: () => !!(NEG.data.china && NEG.data.china.timeline) },
    { id: 'reactor', label: '压水堆数据', src: 'assets/js/data/reactor.js', check: () => !!(NEG.data.plant && NEG.data.plant.parts && NEG.data.plant.parts.length === 12) },
    { id: 'svg', label: '工程图', src: 'assets/js/svg.js', check: () => !!(NEG.svg && typeof NEG.svg.plant === 'function') },
    { id: 'model', label: '反应堆模型', src: 'assets/js/console-model.js', check: () => !!(NEG.ReactorModel && typeof NEG.ReactorModel.create === 'function') }
  ];
  let bootGuardEl = null;
  let recovering = false;
  let pendingMode = null;

  function ensureBootGuard() {
    if (!bootGuardEl) {
      bootGuardEl = document.createElement('div');
      bootGuardEl.id = 'bootGuard';
      bootGuardEl.className = 'boot-guard';
      document.body.appendChild(bootGuardEl);
    }
    bootGuardEl.hidden = false;
    return bootGuardEl;
  }

  function resourceProblems() {
    if (!NEG.tasks || typeof NEG.tasks.get !== 'function') {
      return [{ id: 'core', label: '模块管理器', src: 'assets/js/task-manager.js', fatal: true }];
    }
    const problems = [];
    DATA_RES.forEach((r) => {
      let ok = false;
      try { ok = !!r.check(); } catch (e) { ok = false; }
      if (!ok) problems.push(r);
    });
    REQUIRED_MODES.forEach((id) => {
      if (!NEG.tasks.get(id)) problems.push({ id: 'mode-' + id, label: '实验室模块', src: MODE_SRCS[id] });
    });
    return problems;
  }

  function renderBootGuard(problems) {
    const el = ensureBootGuard();
    const fatal = problems.some((p) => p.fatal);
    const names = problems.filter((p) => !p.fatal).map((p) => {
      if (p.id.indexOf('mode-') === 0) return MODE_TITLES[p.id.slice(5)] || '模块';
      return p.label;
    });
    const detail = names.length ? '（缺少：' + Array.from(new Set(names)).join('、') + '）' : '';
    el.innerHTML =
      '<span class="boot-guard-text">' + NEG.icon('alert', 15) +
        '<span>部分资源未加载成功' + (fatal ? '（核心模块缺失，请刷新页面）' : detail + '，可能缺少部分功能。') + '</span></span>' +
      '<span class="boot-guard-actions">' +
        (fatal ? '' : '<button class="btn btn-sm btn-primary" type="button" data-bg-retry>重试加载</button>') +
        '<button class="btn btn-sm btn-ghost" type="button" data-bg-reload>刷新页面</button>' +
      '</span>';
    const retry = el.querySelector('[data-bg-retry]');
    if (retry) retry.addEventListener('click', retryMissingResources);
    el.querySelector('[data-bg-reload]').addEventListener('click', () => location.reload());
  }

  function checkBootHealth() {
    const problems = resourceProblems();
    if (!problems.length) {
      if (bootGuardEl) { bootGuardEl.hidden = true; bootGuardEl.innerHTML = ''; }
      return;
    }
    renderBootGuard(problems);
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'retry=' + Date.now();
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('加载失败：' + src));
      document.head.appendChild(s);
    });
  }

  async function retryMissingResources() {
    if (recovering) return;
    recovering = true;
    const btn = bootGuardEl && bootGuardEl.querySelector('[data-bg-retry]');
    if (btn) { btn.disabled = true; btn.textContent = '正在重试…'; }
    const before = resourceProblems().filter((p) => !p.fatal);
    for (const item of before) {
      try { await loadScriptOnce(item.src); } catch (e) { /* 继续尝试下一个 */ }
    }
    try { buildNav(); } catch (e) { /* noop */ }
    const still = resourceProblems();
    if (!still.length) {
      if (bootGuardEl) { bootGuardEl.hidden = true; bootGuardEl.innerHTML = ''; }
      try {
        const hashId = (location.hash || '').replace(/^#\/?/, '');
        const target = (pendingMode && NEG.tasks.get(pendingMode)) ? pendingMode
          : ((hashId && NEG.tasks.get(hashId)) ? hashId : (router.currentId || 'home'));
        pendingMode = null;
        router.go(target, { force: true });
        ui.toast('资源已恢复，功能正常', 'success');
      } catch (e) { location.reload(); }
    } else {
      renderBootGuard(still);
      ui.toast('仍有资源加载失败，请检查网络后刷新', 'error');
    }
    recovering = false;
  }

  // 捕获脚本资源加载错误（资源错误不冒泡，用捕获阶段）
  window.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'SCRIPT') {
      setTimeout(checkBootHealth, 300);
    }
  }, true);

  function helpContent() {
    return (
      '<p>「核纪元」是一座可以亲手拆解、建造、运行的核能科普实验室。所有内容基于 IAEA、ICRP、WHO、UNSCEAR 等机构的公开资料整理。</p>' +
      '<h3>主线学习 · 认知档案</h3>' +
      '<p><strong>📖 八章主线</strong>：从核科学的历史沿革一路走到结业答辩。沿途会进入六种互动关卡——结构复原、前沿匹配、屏障排序、核谣言粉碎机、反应堆建造、结业答辩；读完本页会自动进入关卡。进度自动保存，随时可以接着读。</p>' +
      '<h3>五个实验室</h3>' +
      '<p><strong>🔍 辟谣实验室</strong>：判断社交媒体上的辐射谣言，查看事实核查与权威来源。<br>' +
      '<strong>🏗️ 核电站建造</strong>：按工程顺序拼装压水堆，观察一、二、三回路如何传递热量。<br>' +
      '<strong>⚡ 反应堆控制台</strong>：调节控制棒、主泵与汽轮机组，在 12 小时班次中稳定发电。<br>' +
      '<strong>📊 剂量实验室</strong>：对数刻度对比 20+ 种辐射剂量，理解「多少剂量有风险」。<br>' +
      '<strong>🇨🇳 中国核电</strong>：从秦山一期到华龙一号、玲龙一号与「人造太阳」的里程碑。</p>' +
      '<h3>操作方式</h3>' +
      '<p>支持鼠标、触屏与键盘。辟谣题可用 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 选择答案，<kbd>Enter</kbd> 继续；建造与控制台可直接拖拽或点击。</p>' +
      '<h3>快捷键</h3>' +
      '<p><kbd>Esc</kbd> 关闭弹窗 · <kbd>?</kbd> 打开本说明 · 数字键在题目中作答</p>' +
      '<h3>数据与免责声明</h3>' +
      '<p class="dim" style="font-size:12px">本项目为科普教育作品，不构成医疗建议或专业辐射防护指导。剂量数值为公开资料中的典型量级，个体与实际场景可能存在差异；中国核电数据以文中标注年份为准。若发现内容错误，欢迎指正。</p>' +
      '<h3>技术</h3>' +
      '<p class="dim" style="font-size:12px">零依赖 · 原生 HTML / CSS / JavaScript · Web Audio 实时合成音效 · Canvas 战绩卡 · localStorage 存档。无需联网，双击 index.html 即可运行。</p>'
    );
  }

  function bindHeader() {
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const on = Sound.toggle();
        if (on) ui.toast('音效已开启', 'info');
        else ui.toast('音效已关闭', 'info');
      });
    }
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.innerHTML = NEG.icon('info');
      helpBtn.addEventListener('click', () => {
        Sound.play('click');
        ui.modal({
          eyebrow: '帮助 · ABOUT',
          title: '欢迎来到核纪元',
          wide: true,
          html: helpContent(),
          actions: [{ label: '知道了', kind: 'primary' }]
        });
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        if (U.isTyping(e)) return;
        e.preventDefault();
        ui.modal({ eyebrow: '帮助', title: '操作说明', wide: true, html: helpContent(), actions: [{ label: '知道了', kind: 'primary' }] });
      }
      if (e.key === 'Escape') {
        // 弹窗自行处理；这里兜底清理
        document.querySelectorAll('.overlay').forEach((n) => {
          if (!n.querySelector('.modal')) n.remove();
        });
      }
    });

    window.addEventListener('hashchange', () => {
      const id = (location.hash || '').replace(/^#\/?/, '');
      if (id && NEG.tasks.get(id) && id !== router.currentId) {
        suppressHash = true;
        router.go(id);
      }
    });
  }

  /* ==========================================================
     10. 启动
     ========================================================== */
  function boot() {
    if (document.body) {
      document.body.classList.toggle('reduce-motion', !!(data.settings && data.settings.reduceMotion));
    }
    if (!NEG.tasks || typeof NEG.tasks.list !== 'function') {
      renderBootGuard([{ id: 'core', label: '模块管理器', src: 'assets/js/task-manager.js', fatal: true }]);
      return;
    }
    buildNav();
    bindHeader();
    NEG.updateHeader();
    achievements.checkAll({ silent: false });

    const hashId = (location.hash || '').replace(/^#\/?/, '');
    if (hashId && !NEG.tasks.get(hashId)) pendingMode = hashId;
    const startId = (hashId && NEG.tasks.get(hashId)) ? hashId : (NEG.tasks.get(data.lastMode) ? data.lastMode : 'home');
    router.go(startId, { force: true });

    setTimeout(checkBootHealth, 1200);

    // 首次音频解锁
    const unlockAudio = () => {
      Sound.ensure();
      document.removeEventListener('pointerdown', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
    };
    document.addEventListener('pointerdown', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);
  }

  /* 注意：脚本加了 defer 后，core.js 可能在 DOMContentLoaded 之前执行，
     此时模式脚本尚未注册。必须等所有 defer 脚本执行完（DCL 或 load）再启动。 */
  let booted = false;
  function bootOnce() {
    if (booted) return;
    booted = true;
    boot();
  }
  if (document.readyState === 'complete') {
    bootOnce();
  } else {
    document.addEventListener('DOMContentLoaded', bootOnce, { once: true });
    window.addEventListener('load', bootOnce, { once: true });
  }

  /* 对外工具挂载 */
  NEG.ui = ui;
})(window.NEG);
