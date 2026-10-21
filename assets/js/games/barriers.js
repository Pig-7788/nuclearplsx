/* 将四重屏障接入主线第六章，宿主统一记档并处理重玩。 */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';
  NEG.mainPlays.register('multi_barrier_sort', {
    label: '四重屏障组装',
    mount(container, payload, ctx, done) {
      if (!NEG.WasteBarriers) return null;
      let completed = false;
      let closed = false;
      container.classList.add('wb-inline-host');
      const handle = NEG.WasteBarriers.mount(container, {
        onComplete() {
          if (closed || completed) return;
          completed = true;
          const finish = document.createElement('button');
          finish.className = 'btn btn-primary wb-finish';
          finish.type = 'button';
          finish.textContent = '完成本节，返回正文';
          finish.addEventListener('click', () => {
            if (closed) return;
            closed = true;
            done({ ok: true, barriers: 4 });
          }, { once: true });
          container.querySelector('.wb-feedback').insertAdjacentElement('afterend', finish);
          finish.focus();
        },
        onProgress(progress) {
          if (progress < 4) {
            completed = false;
            const finish = container.querySelector('.wb-finish');
            if (finish) finish.remove();
          }
        }
      });
      return function cleanup() {
        closed = true;
        handle.destroy();
        container.classList.remove('wb-inline-host');
      };
    }
  });
})(window.NEG);
