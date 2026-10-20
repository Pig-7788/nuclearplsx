/* ============================================================
   核纪元 · 交互外壳（整页翻页 / 一屏布局 / 自动滚动）
   ------------------------------------------------------------
   NEG.shell.full()     测量顶栏真实高度，进入「一屏模式」
   NEG.pager.create()   首页滚轮整页翻页（上下页 + 圆点 + 键盘 / 触屏）
   NEG.marquee.create() 中国核电自动循环滚动
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* ==========================================================
     0. 顶栏高度
     ========================================================== */
  function measureHeader() {
    const header = document.getElementById('appHeader');
    const h = header ? Math.round(header.getBoundingClientRect().height) : 66;
    document.documentElement.style.setProperty('--header-live', h + 'px');
    return h;
  }
  NEG.measureHeader = measureHeader;

  /* ==========================================================
     1. 一屏外壳：给 #view / body 加上整页布局所需的类
     ========================================================== */
  const shell = {
    /**
     * @param {string} mode 模式 id（用于 body.mode-full-<id>）
     * @returns {function} cleanup
     */
    full(mode) {
      const view = document.getElementById('view');
      const body = document.body;
      const id = mode || 'page';
      measureHeader();

      view.classList.add('view-full');
      body.classList.add('mode-full', 'mode-full-' + id);
      // 路由会在切换时清空 inline overflow，这里保持干净
      body.style.overflow = '';

      const onResize = () => measureHeader();
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);

      let ro = null;
      const header = document.getElementById('appHeader');
      if (header && 'ResizeObserver' in window) {
        ro = new ResizeObserver(measureHeader);
        ro.observe(header);
      }

      let done = false;
      return function cleanup() {
        if (done) return;
        done = true;
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
        if (ro) { ro.disconnect(); ro = null; }
        view.classList.remove('view-full');
        body.classList.remove('mode-full', 'mode-full-' + id);
      };
    }
  };

  /* ==========================================================
     2. 整页翻页器（首页）
     ========================================================== */
  const pager = {
    create(opts) {
      const o = opts || {};
      const el = o.el;
      const track = o.track;
      if (!el || !track) return null;

      const pages = Array.prototype.slice.call(track.children);
      if (!pages.length) return null;

      const dots = Array.prototype.slice.call(el.querySelectorAll('[data-page-index]'));
      const mq = window.matchMedia('(min-width: 900px)');
      const LOCK_MS = 720;

      let index = 0;
      let locked = false;
      let lockTimer = null;
      let touchX = null;
      let touchY = null;
      let destroyed = false;

      function paint() {
        const wide = mq.matches;
        track.style.transform = wide
          ? 'translate3d(0,' + (-index * 100) + '%,0)'
          : '';
        pages.forEach((p, i) => {
          const on = i === index;
          p.classList.toggle('is-active', on);
          p.setAttribute('aria-hidden', on ? 'false' : 'true');
        });
        dots.forEach((d, i) => {
          const on = i === index;
          d.classList.toggle('is-active', on);
          d.setAttribute('aria-current', on ? 'true' : 'false');
        });
        el.dataset.index = String(index);
        if (typeof o.onChange === 'function') o.onChange(index, pages.length);
      }

      function go(target) {
        if (destroyed) return;
        const next = clamp(target, 0, pages.length - 1);
        if (next === index) return;
        index = next;
        locked = true;
        clearTimeout(lockTimer);
        lockTimer = setTimeout(() => { locked = false; }, LOCK_MS);
        paint();
      }

      function onWheel(e) {
        if (!mq.matches) return;
        e.preventDefault();
        if (locked) return;
        if (Math.abs(e.deltaY) < 3) return;
        go(index + (e.deltaY > 0 ? 1 : -1));
      }

      function onKey(e) {
        if (!mq.matches) return;
        if (NEG.util && NEG.util.isTyping && NEG.util.isTyping(e)) return;
        if (document.querySelector('.overlay')) return;
        const tag = (e.target && e.target.tagName || '').toLowerCase();
        const k = e.key;
        if (k === 'ArrowDown' || k === 'PageDown') {
          e.preventDefault();
          go(index + 1);
        } else if (k === 'ArrowUp' || k === 'PageUp') {
          e.preventDefault();
          go(index - 1);
        } else if (k === ' ' && !e.shiftKey && tag !== 'button' && tag !== 'a') {
          e.preventDefault();
          go(index + 1);
        } else if (k === 'Home') {
          e.preventDefault();
          go(0);
        } else if (k === 'End') {
          e.preventDefault();
          go(pages.length - 1);
        }
      }

      function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
      }

      function onTouchEnd(e) {
        if (touchY == null) return;
        const t = e.changedTouches[0];
        const dy = touchY - t.clientY;
        const dx = touchX - t.clientX;
        touchX = touchY = null;
        if (!mq.matches) return;
        if (Math.abs(dy) > 46 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          go(index + (dy > 0 ? 1 : -1));
        }
      }

      function onDotClick(e) {
        const btn = e.currentTarget;
        go(Number(btn.dataset.pageIndex) || 0);
        if (NEG.audio) NEG.audio.play('click');
      }

      el.addEventListener('wheel', onWheel, { passive: false });
      document.addEventListener('keydown', onKey);
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      dots.forEach((d) => d.addEventListener('click', onDotClick));

      /* 宽度跨越断点：窄屏回到普通滚动，宽屏恢复整页翻页 */
      function onMediaChange() {
        if (!mq.matches) index = 0;
        paint();
      }
      if (mq.addEventListener) mq.addEventListener('change', onMediaChange);
      else if (mq.addListener) mq.addListener(onMediaChange);
      window.addEventListener('resize', paint);

      paint();

      return {
        go,
        next() { go(index + 1); },
        prev() { go(index - 1); },
        get index() { return index; },
        destroy() {
          destroyed = true;
          clearTimeout(lockTimer);
          el.removeEventListener('wheel', onWheel);
          document.removeEventListener('keydown', onKey);
          el.removeEventListener('touchstart', onTouchStart);
          el.removeEventListener('touchend', onTouchEnd);
          dots.forEach((d) => d.removeEventListener('click', onDotClick));
          if (mq.removeEventListener) mq.removeEventListener('change', onMediaChange);
          else if (mq.removeListener) mq.removeListener(onMediaChange);
          window.removeEventListener('resize', paint);
          track.style.transform = '';
        }
      };
    }
  };

  /* ==========================================================
     3. 自动循环滚动（中国核电）
     ========================================================== */
  const marquee = {
    create(opts) {
      const o = opts || {};
      const viewport = o.viewport;
      const track = o.track;
      if (!viewport || !track) return null;
      const chunk = track.querySelector('[data-chunk]');
      if (!chunk) return null;

      const speed0 = typeof o.speed === 'number' ? o.speed : 34;
      let speed = speed0;
      let offset = 0;
      let loopH = 0;
      let rafId = null;
      let last = 0;
      let paused = false;
      let destroyed = false;

      function stripIds(node) {
        if (node.id) node.removeAttribute('id');
        node.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      }

      function fill() {
        const base = Math.round(chunk.getBoundingClientRect().height);
        if (!base) return;
        loopH = base;
        const need = viewport.clientHeight + base;
        let total = track.children.length * base;
        let guard = 0;
        while (total < need && guard++ < 12) {
          const copy = chunk.cloneNode(true);
          stripIds(copy);
          copy.classList.add('is-copy');
          copy.setAttribute('aria-hidden', 'true');
          track.appendChild(copy);
          total += base;
        }
      }

      function apply() {
        track.style.transform = 'translate3d(0,' + (-offset).toFixed(2) + 'px,0)';
      }

      function tick(now) {
        if (destroyed) return;
        rafId = requestAnimationFrame(tick);
        if (!last) { last = now; return; }
        const dt = Math.min(80, now - last);
        last = now;
        if (paused || !loopH) return;
        offset += (speed * dt) / 1000;
        if (offset >= loopH) offset -= loopH;
        apply();
      }

      function onResize() {
        fill();
        if (offset >= loopH) offset = 0;
        apply();
      }

      function onVisibility() {
        if (document.hidden) { last = 0; }
      }

      fill();
      apply();
      rafId = requestAnimationFrame(tick);
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibility);

      let ro = null;
      if ('ResizeObserver' in window) {
        ro = new ResizeObserver(() => { onResize(); });
        ro.observe(viewport);
      }

      return {
        pause() { paused = true; return paused; },
        resume() { paused = false; last = 0; return paused; },
        toggle() { paused = !paused; last = 0; return paused; },
        get paused() { return paused; },
        setSpeed(v) { speed = v; },
        get speed() { return speed; },
        reset() { offset = 0; apply(); },
        destroy() {
          destroyed = true;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          window.removeEventListener('resize', onResize);
          document.removeEventListener('visibilitychange', onVisibility);
          if (ro) { ro.disconnect(); ro = null; }
          track.style.transform = '';
        }
      };
    }
  };

  NEG.shell = shell;
  NEG.pager = pager;
  NEG.marquee = marquee;
})(window.NEG);
