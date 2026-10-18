/* ============================================================
   核纪元 · 中国核电
   数据速览 · 里程碑时间线 · 堆型 · 电站分布
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

      root.innerHTML =
        ui.pageHead({
          eyebrow: 'CHINA NUCLEAR · 中国核电',
          icon: 'flag',
          title: '中国核电',
          lead: '从 1991 年秦山一期并网，到自主三代“华龙一号”、模块小堆“玲龙一号”和第四代高温气冷堆——这是中国核电的四十余年。',
          tools: '<span class="badge badge-amber">数据截至 ' + U.esc(china.updated || '2025') + '</span>' +
                 '<span class="badge badge-line">里程碑 ' + viewed.size + ' / ' + timeline.length + '</span>'
        }) +

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
      function updateBadge() {
        const badge = ui.qs('.view-head .badge-line', root);
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
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              markViewed(Number(entry.target.dataset.milestone));
              io.unobserve(entry.target);
            }
          });
        }, { rootMargin: '0px 0px -20% 0px', threshold: 0.3 });
        items.forEach((el) => io.observe(el));
        /* 首屏可见的几条立即记录 */
        items.slice(0, 2).forEach((el) => markViewed(Number(el.dataset.milestone)));
      } else {
        items.forEach((el) => markViewed(Number(el.dataset.milestone)));
      }

      /* 点击时间线卡片：轻提示 */
      items.forEach((el) => {
        el.querySelector('.tl-card').addEventListener('click', () => {
          audio.play('click');
          markViewed(Number(el.dataset.milestone));
        });
      });

      const cleanup = () => { /* IntersectionObserver 会在页面卸载时自动释放 */ };
      return cleanup;
    }
  });
})(window.NEG);
