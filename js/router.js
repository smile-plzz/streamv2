// ==========================================================================
// Tiny hash router — no history-API deploy config needed for static hosting.
// ==========================================================================

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, queryStr] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
  return { route: segments[0] || 'home', param: segments[1], query };
}

export function initRouter(onChange) {
  const handle = () => onChange(parseHash());
  window.addEventListener('hashchange', handle);
  handle();
}

export function navigate(route, opts = {}) {
  let hash = `#/${route === 'home' ? '' : route}`;
  if (opts.param) hash += `/${opts.param}`;
  if (opts.query) {
    const qs = new URLSearchParams(opts.query).toString();
    if (qs) hash += `?${qs}`;
  }
  if (location.hash === hash) {
    // force a re-render even if the hash is unchanged (e.g. re-search)
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
