// ==========================================================================
// LocalStorage-backed persistence — watchlist, continue-watching, theme,
// recent searches.
// ==========================================================================

function get(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getWatchlist() { return get('ns_wl', []); },
  setWatchlist(v) { set('ns_wl', v); },
  isInWatchlist(id) { return this.getWatchlist().some(x => x.imdbID === id); },
  addToWatchlist(item) {
    if (this.isInWatchlist(item.imdbID)) return;
    const list = this.getWatchlist();
    list.unshift(item);
    this.setWatchlist(list);
  },
  removeFromWatchlist(id) {
    this.setWatchlist(this.getWatchlist().filter(x => x.imdbID !== id));
  },

  getContinue() { return get('ns_cw', []); },
  upsertContinue(entry) {
    const list = this.getContinue().filter(x => x.imdbID !== entry.imdbID);
    list.unshift({ ...entry, updatedAt: Date.now() });
    set('ns_cw', list.slice(0, 20));
  },
  removeFromContinue(id) {
    set('ns_cw', this.getContinue().filter(x => x.imdbID !== id));
  },

  getTheme() { return get('ns_theme', null); },
  setTheme(v) { set('ns_theme', v); },

  getRecentSearches() { return get('ns_recent', []); },
  addRecentSearch(q) {
    const list = this.getRecentSearches().filter(x => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    set('ns_recent', list.slice(0, 8));
  },
};
