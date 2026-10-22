window.__jsErrors = [];
window.addEventListener('error', event => {
  window.__jsErrors.push((event.message || '') + ' @ ' + (event.filename || '').split('/').pop());
  document.documentElement.dataset.jsErrors = window.__jsErrors.join(' || ');
});
import('./core.js').then(({ start }) => start()).catch(error => {
  console.error('[App] Startup failed', error);
  const view = document.getElementById('view');
  view.innerHTML = '<div class="route-message" role="alert"><h2>页面暂时无法打开</h2>' +
    '<p>请检查连接后重新加载。</p><button type="button" class="btn btn-primary">重新加载</button></div>';
  view.querySelector('button').addEventListener('click', () => location.reload());
});
