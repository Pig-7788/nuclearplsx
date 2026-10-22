// A successful import is shared for the lifetime of the page; failed attempts may retry.
export function createRouteLoader(entries, loadStyle = async () => {}) {
  const pending = new Map();
  return function loadRoute(id) {
    if (!Object.hasOwn(entries, id)) return Promise.reject(new Error('Unknown route: ' + id));
    if (pending.has(id)) return pending.get(id);
    const entry = entries[id];
    const promise = Promise.resolve().then(() => Promise.all([
      entry.load(),
      ...entry.styles.map(style => loadStyle(style))
    ])).then(([module]) => module).catch(error => {
      pending.delete(id);
      throw error;
    });
    pending.set(id, promise);
    return promise;
  };
}
