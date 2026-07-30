// ==========================================================================
// Page renderers — each fully repaints #main-content for its route.
// ==========================================================================
import { el, qs } from './store.js';
import { makeCard, makeSkeletons, makeEmptyState } from './components/card.js';
import { renderRow } from './components/row.js';
import { lookupTitles, searchTitles } from './api.js';
import { storage } from './storage.js';
import { icon } from './components/icons.js';
import {
  POPULAR_MOVIES, POPULAR_TV, TRENDING_SEED, GENRE_ROWS, ROW_SIZE,
} from './config.js';

function mount() { return qs('#main-content'); }
function clear() { mount().innerHTML = ''; }

// ---------------------------------------------------------------------- HOME
export async function renderHome({ onOpen, navigate }) {
  clear();
  const root = mount();

  const cw = storage.getContinue();
  if (cw.length) {
    const section = buildGridSection('Continue Watching', cw, { onOpen, onRemove: (m) => { storage.removeFromContinue(m.imdbID); renderHome({ onOpen, navigate }); }, badge: () => 'Resume', asRow: true });
    root.appendChild(section);
  }

  await renderRow(root, {
    title: 'Trending Now',
    onOpen,
    loader: () => lookupTitles(TRENDING_SEED),
  });

  for (const g of GENRE_ROWS) {
    await renderRow(root, {
      title: g.label,
      onOpen,
      loader: () => lookupTitles(g.seed),
      seeAll: () => navigate('genre', { id: g.id }),
    });
  }

  await renderRow(root, {
    title: 'Popular Movies',
    onOpen,
    loader: () => lookupTitles(POPULAR_MOVIES.slice(0, ROW_SIZE), 'movie'),
    seeAll: () => navigate('movies'),
  });

  await renderRow(root, {
    title: 'Popular TV Shows',
    onOpen,
    loader: () => lookupTitles(POPULAR_TV.slice(0, ROW_SIZE), 'series'),
    seeAll: () => navigate('tv'),
  });
}

// ------------------------------------------------------------------- GENRE
export async function renderGenre(genreId, { onOpen }) {
  clear();
  const genre = GENRE_ROWS.find(g => g.id === genreId) || GENRE_ROWS[0];
  const root = mount();
  root.appendChild(pageHeader(genre.label));
  const grid = el('div', { class: 'movies-grid' });
  grid.appendChild(makeSkeletons(genre.seed.length));
  root.appendChild(grid);
  const items = await lookupTitles(genre.seed);
  grid.innerHTML = '';
  if (!items.length) { grid.appendChild(makeEmptyState('film', 'No titles found for this genre right now.')); return; }
  items.forEach(m => grid.appendChild(makeCard(m, { onOpen })));
}

// ------------------------------------------------------------------ BROWSE
export async function renderBrowse(kind, { onOpen }) {
  clear();
  const root = mount();
  const isMovies = kind === 'movies';
  const titles = isMovies ? POPULAR_MOVIES : POPULAR_TV;
  const type = isMovies ? 'movie' : 'series';

  const header = pageHeader(isMovies ? 'Popular Movies' : 'Popular TV Shows');
  const sortWrap = el('div', {}, [
    el('label', { style: 'font-size:.78rem;color:var(--text-muted);margin-right:.5rem' }, 'Sort'),
    el('select', {
      id: 'sort-select',
      style: 'background:var(--surface);border:1px solid var(--border);color:var(--text);padding:.4rem .7rem;border-radius:6px;font-size:.82rem',
    }, [
      el('option', { value: 'default' }, 'Featured'),
      el('option', { value: 'title' }, 'Title A–Z'),
      el('option', { value: 'year-desc' }, 'Newest'),
      el('option', { value: 'year-asc' }, 'Oldest'),
      el('option', { value: 'rating' }, 'Top Rated'),
    ]),
  ]);
  header.appendChild(sortWrap);
  root.appendChild(header);

  const grid = el('div', { class: 'movies-grid' });
  grid.appendChild(makeSkeletons(12));
  root.appendChild(grid);

  const items = await lookupTitles(titles, type);
  // enrich with rating for sorting (best-effort, already cached from lookup where available)
  let sorted = items.slice();
  const applySort = (mode) => {
    sorted = items.slice();
    if (mode === 'title') sorted.sort((a, b) => a.Title.localeCompare(b.Title));
    else if (mode === 'year-desc') sorted.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
    else if (mode === 'year-asc') sorted.sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
    else if (mode === 'rating') sorted.sort((a, b) => (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0));
    renderGridItems(grid, sorted, onOpen);
  };

  if (!items.length) { grid.innerHTML = ''; grid.appendChild(makeEmptyState('film', 'Nothing to show right now.')); return; }
  renderGridItems(grid, sorted, onOpen);
  qs('#sort-select').addEventListener('change', (e) => applySort(e.target.value));
}

function renderGridItems(grid, items, onOpen) {
  grid.innerHTML = '';
  items.forEach(m => grid.appendChild(makeCard(m, { onOpen })));
}

// ------------------------------------------------------------------- SEARCH
let searchState = { query: '', type: '', page: 1 };

export async function renderSearch(query, type, { onOpen }) {
  clear();
  storage.addRecentSearch(query);
  searchState = { query, type, page: 1 };
  const root = mount();
  root.appendChild(pageHeader(`Results for "${query}"`));
  const grid = el('div', { class: 'movies-grid', id: 'search-grid' });
  grid.appendChild(makeSkeletons(8));
  const loadMoreBtn = el('button', { class: 'load-more', id: 'search-load-more', style: 'display:none' }, 'Load More');
  root.appendChild(grid);
  root.appendChild(loadMoreBtn);

  await loadSearchPage({ onOpen, append: false });
  loadMoreBtn.addEventListener('click', async () => {
    searchState.page++;
    await loadSearchPage({ onOpen, append: true });
  });
}

async function loadSearchPage({ onOpen, append }) {
  const grid = qs('#search-grid');
  const loadMoreBtn = qs('#search-load-more');
  const data = await searchTitles(searchState.query, { page: searchState.page, type: searchState.type });
  if (!append) grid.innerHTML = '';
  if (data.Response === 'False' || !data.Search) {
    if (!append) grid.appendChild(makeEmptyState('search', 'No results found. Try a different search.'));
    loadMoreBtn.style.display = 'none';
    return;
  }
  data.Search.forEach(m => grid.appendChild(makeCard(m, { onOpen })));
  const total = parseInt(data.totalResults) || 0;
  loadMoreBtn.style.display = searchState.page * 10 < total ? 'block' : 'none';
}

// ---------------------------------------------------------------- WATCHLIST
export function renderWatchlist({ onOpen }) {
  clear();
  const root = mount();
  root.appendChild(pageHeader('Your Watchlist'));
  const grid = el('div', { class: 'movies-grid' });
  root.appendChild(grid);
  const list = storage.getWatchlist();
  if (!list.length) {
    grid.appendChild(makeEmptyState('bookmark', 'Your watchlist is empty. Browse and bookmark titles to save them here.'));
    return;
  }
  list.forEach(m => grid.appendChild(makeCard(m, {
    onOpen,
    onRemove: (movie) => { storage.removeFromWatchlist(movie.imdbID); renderWatchlist({ onOpen }); },
  })));
}

// ---------------------------------------------------------------- CONTINUE
export function renderContinue({ onOpen }) {
  clear();
  const root = mount();
  root.appendChild(pageHeader('Continue Watching'));
  const grid = el('div', { class: 'movies-grid' });
  root.appendChild(grid);
  const list = storage.getContinue();
  if (!list.length) {
    grid.appendChild(makeEmptyState('history', 'No watch history yet. Titles you open will show up here.'));
    return;
  }
  list.forEach(m => grid.appendChild(makeCard(m, {
    onOpen,
    badge: 'Resume',
    onRemove: (movie) => { storage.removeFromContinue(movie.imdbID); renderContinue({ onOpen }); },
  })));
}

// ---------------------------------------------------------------- HELPERS
function pageHeader(title) {
  return el('div', { class: 'section-header', style: 'margin-top:calc(var(--nav-h) + var(--sp-6))' }, [
    el('h2', { class: 'section-title' }, title),
  ]);
}

function buildGridSection(title, items, { onOpen, onRemove, badge, asRow }) {
  const section = el('div', { class: 'section' });
  section.appendChild(el('div', { class: 'section-header' }, el('h2', { class: 'section-title' }, title)));
  const container = el('div', { class: asRow ? 'row-scroller' : 'movies-grid' });
  items.forEach(m => container.appendChild(makeCard(m, { onOpen, onRemove, badge: typeof badge === 'function' ? badge(m) : badge })));
  section.appendChild(container);
  return section;
}
