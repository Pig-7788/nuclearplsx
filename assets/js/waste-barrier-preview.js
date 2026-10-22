import './waste-barrier-scene.js';
import './waste-barriers.js';

(function () {
  'use strict';
  const key = 'nuclear-epoch:waste-barriers:v1';
  let progress = 0;
  try { progress = JSON.parse(localStorage.getItem(key)) || 0; } catch (error) { /* 保留内存体验 */ }
  const component = window.NEG.WasteBarriers.mount(document.getElementById('wasteBarrierRoot'), {
    progress,
    onProgress(value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* 私密/离线浏览仍可完成 */ }
    }
  });
  // 离开时释放资源；从浏览器的往返缓存恢复时重新初始化。
  window.addEventListener('pagehide', () => component.destroy(), { once: true });
  window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
})();
