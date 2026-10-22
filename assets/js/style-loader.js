const pending = new Map();
const order = ['modes/home.css', 'modes/rumor.css', 'modes/city.css', 'modes/console.css',
  'modes/dose.css', 'modes/china.css', 'modes/repository.css', 'modes/main.css',
  'history-exhibit.css', 'waste-barriers.css', 'modes/fullpage.css'];

export function loadStyle(path) {
  if (pending.has(path)) return pending.get(path);
  const promise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../css/' + path, import.meta.url).href;
    const priority = order.indexOf(path);
    link.dataset.styleOrder = String(priority);
    const timer = setTimeout(() => fail(new Error('Stylesheet timed out: ' + path)), 15000);
    function fail(error) {
      clearTimeout(timer);
      link.remove();
      reject(error);
    }
    link.onload = () => { clearTimeout(timer); resolve(); };
    link.onerror = () => fail(new Error('Stylesheet could not load: ' + path));
    // Keep the original CSS cascade regardless of the order routes are visited.
    const next = Array.from(document.head.querySelectorAll('link[data-style-order]'))
      .find(node => Number(node.dataset.styleOrder) > priority);
    document.head.insertBefore(link, next || null);
  }).catch(error => { pending.delete(path); throw error; });
  pending.set(path, promise);
  return promise;
}
