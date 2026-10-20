/* ============================================================
   核纪元 · 中国核电
   数据速览 · 里程碑时间线 · 堆型 · 电站分布
   本页为「自动循环滚动」阅读：内容无缝向上滚动，可以暂停
   ============================================================ */
(function (NEG) {
  'use strict';

  NEG.registerMode({
    id: 'china',
    order: 5,
    title: '中国核电',
    nav: '中国核电',
    icon: 'flag',
    accent: '#ffc857',
    blurb: '从秦山一期到华龙一号、玲龙一号与「人造太阳」的里程碑。',
    progress(s) {
      const total = ((NEG.data.china && NEG.data.china.timeline) || []).length || 1;
      return Math.min(1, (s.modes.china.viewed || []).length / total);
    },
    isComplete(s) {
      const total = ((NEG.data.china && NEG.data.china.timeline) || []).length;
      return total > 0 && (s.modes.china.viewed || []).length >= total;
    },

    render(root, ctx) {
      const { store, data, ui, audio, util: U } = ctx;
      const china = data.china;
      if (!china) {
        root.innerHTML = '<div class="empty">数据加载失败，请刷新页面。</div>';
        return;
      }
      const viewed = new Set(store.get().modes.china.viewed || []);
      const timeline = china.timeline || [];

      /* ---------- 滚动内容（一节，复制后首尾相接）---------- */
      const chunkHTML =
        /* 核心数据 */
        '<section class="china-stats anim-fade-up">' +
          (china.stats || []).map((st) => (
            '<div class="china-stat">' +
              '<b><span class="stat-num" data-num="' + U.esc(st.value) + '">' + U.esc(st.value) + '</span><small>' + U.esc(st.unit || '') + '</small></b>' +
              '<span>' + U.esc(st.label) + '</span>' +
              '<em>' + U.esc(st.note || '') + '</em>' +
            '</div>'
          )).join('') +
        '</section>' +

        /* 时间线 */
        '<section class="china-section anim-fade-up d1">' +
          '<h2>' + NEG.icon('clock') + '里程碑时间线</h2>' +
          '<div class="timeline" id="timeline">' +
            timeline.map((ev, i) => (
              '<article class="timeline-item ' + (i === timeline.length - 1 ? 'is-new' : '') + '" data-milestone="' + i + '">' +
                '<span class="tl-dot"></span>' +
                '<div class="tl-card">' +
                  '<span class="tl-year">' + U.esc(ev.date || ev.year) +
                    (ev.tag ? ' <span class="tl-tag">' + U.esc(ev.tag) + '</span>' : '') + '</span>' +
                  '<h3>' + U.esc(ev.title) + '</h3>' +
                  '<p>' + U.esc(ev.desc) + '</p>' +
                '</div>' +
              '</article>'
            )).join('') +
          '</div>' +
        '</section>' +

        /* 堆型 */
        '<section class="china-section anim-fade-up d2">' +
          '<h2>' + NEG.icon('radiation') + '主力堆型与技术路线</h2>' +
          '<div class="reactor-grid">' +
            (china.reactors || []).map((r) => (
              '<article class="reactor-card">' +
                '<div class="reactor-head">' +
                  '<div><h3>' + U.esc(r.name) + '</h3>' +
                    '<div class="r-sub">' + U.esc(r.sub || '') + ' · ' + U.esc(r.type || '') + '</div></div>' +
                  '<div class="reactor-power">' + U.esc(r.power || '') + '<small>电功率</small></div>' +
                '</div>' +
                '<ul>' + (r.bullets || []).map((b) => '<li>' + U.esc(b) + '</li>').join('') + '</ul>' +
                (r.note ? '<p class="r-note">' + U.esc(r.note) + '</p>' : '') +
              '</article>'
            )).join('') +
          '</div>' +
        '</section>' +

        /* 电站 */
        '<section class="china-section anim-fade-up d3">' +
          '<h2>' + NEG.icon('build') + '主要核电基地</h2>' +
          '<div class="plant-grid">' +
            (china.plants || []).map((p) => (
              '<article class="plant-card">' +
                '<div class="pc-top">' +
                  '<b>' + U.esc(p.name) + '</b>' +
                  '<span class="pc-province">' + U.esc(p.province || '') + '</span>' +
                '</div>' +
                '<span class="pc-units">' + (p.units != null ? p.units + ' 台机组' : '') + '</span>' +
                (p.note ? '<p>' + U.esc(p.note) + '</p>' : '') +
              '</article>'
            )).join('') +
          '</div>' +
        '</section>' +

        '<div class="data-note">' +
          U.esc(china.updatedNote || ('数据截至 ' + (china.updated || '2025') + ' 年，来自国家能源局、中国核能行业协会等公开资料。')) +
          ' 核电装机与发电量数据随新机组投运持续变化，请以最新官方发布为准。' +
        '</div>';

      root.innerHTML =
        '<div class="mode-page china-page">' +
          '<header class="page-top china-top">' +
            '<div class="pt-brand">' +
              '<span class="eyebrow">CHINA NUCLEAR · 中国核电</span>' +
              '<h2>' + NEG.icon('flag') + '中国核电</h2>' +
            '</div>' +
            '<span class="lead-inline">从 1991 年秦山一期并网，到自主三代「华龙一号」与「人造太阳」——四十余年，页面自动循环播放。</span>' +
            '<div class="pt-tools">' +
              '<span class="badge badge-amber">数据截至 ' + U.esc(china.updated || '2025') + '</span>' +
              '<span class="badge badge-line" id="milestoneBadge">里程碑 ' + viewed.size + ' / ' + timeline.length + '</span>' +
              '<button class="btn btn-quiet btn-sm" data-action="pause" aria-pressed="false">' +
                NEG.icon('clock', 14) + '<span>暂停滚动</span>' +
              '</button>' +
            '</div>' +
          '</header>' +
          '<div class="china-viewport" id="chinaViewport">' +
            '<div class="china-track" id="chinaTrack">' +
              '<div class="china-chunk" data-chunk>' + chunkHTML + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      const exitShell = NEG.shell.full('china');
      const viewport = root.querySelector('#chinaViewport');
      const track = root.querySelector('#chinaTrack');

      /* ---------- 自动循环滚动 ---------- */
      const marquee = NEG.marquee.create({
        viewport,
        track,
        speed: 32
      });

      /* 暂停 / 继续 */
      const pauseBtn = root.querySelector('[data-action="pause"]');
      if (pauseBtn && marquee) {
        pauseBtn.addEventListener('click', () => {
          const paused = marquee.toggle();
          pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
          pauseBtn.querySelector('span').textContent = paused ? '继续滚动' : '暂停滚动';
          pauseBtn.classList.toggle('is-off', paused);
          audio.play('click');
        });
      }

      /* ---------- 数字滚动 ---------- */
      ui.qsa('.stat-num', root).forEach((el) => {
        const raw = el.dataset.num || '';
        const num = parseFloat(raw.replace(/,/g, ''));
        if (!isFinite(num)) return;
        const decimals = (raw.split('.')[1] || '').length;
        ui.countUp(el, num, {
          duration: 1100,
          decimals,
          format: (v) => (decimals ? v.toFixed(decimals) : U.fmtNum(v))
        });
      });

      /* ---------- 时间线浏览记录 ---------- */
      const seenNow = new Set();
      const badge = root.querySelector('#milestoneBadge');
      function updateBadge() {
        if (badge) badge.textContent = '里程碑 ' + viewed.size + ' / ' + timeline.length;
      }
      function markViewed(index) {
        if (seenNow.has(index)) return;
        seenNow.add(index);
        if (viewed.has(index)) return;
        viewed.add(index);
        store.addScore(1, 'china');
        store.set((st) => {
          st.modes.china.viewed = Array.from(viewed);
        }, 'china');
        updateBadge();
        ctx.achievements.checkAll();
      }

      const items = ui.qsa('.timeline-item', root);
      let io = null;
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              markViewed(Number(entry.target.dataset.milestone));
            }
          });
        }, { root: viewport, rootMargin: '0px 0px -10% 0px', threshold: 0.3 });
        items.forEach((el) => io.observe(el));
        /* 首屏可见的几条立即记录 */
        items.slice(0, 2).forEach((el) => markViewed(Number(el.dataset.milestone)));
      } else {
        items.forEach((el) => markViewed(Number(el.dataset.milestone)));
      }

      /* 点击时间线卡片：轻提示 */
      items.forEach((el) => {
        const card = el.querySelector('.tl-card');
        if (!card) return;
        card.addEventListener('click', () => {
          audio.play('click');
          markViewed(Number(el.dataset.milestone));
        });
      });

      return function cleanup() {
        if (marquee) marquee.destroy();
        if (io) { io.disconnect(); io = null; }
        exitShell();
      };
    }
  });
})(window.NEG);
