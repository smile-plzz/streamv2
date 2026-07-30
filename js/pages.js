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
import { MOOD_PALETTE, fetchMoodResults, guessMoodFromText } from './moods.js';

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

  root.appendChild(el('button', { class: 'mood-teaser', onclick: () => navigate('mood') }, [
    el('span', { class: 'mood-teaser-emoji' }, '🎭'),
    el('span', {}, [
      el('strong', {}, 'Not sure what to watch? '),
      'Tell us your mood and we\'ll find precise matches →',
    ]),
  ]));

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

// -------------------------------------------------------------------- MOOD
export function renderMood({ onOpen }) {
  clear();
  const root = mount();

  root.appendChild(pageHeader('How are you feeling?'));
  root.appendChild(el('p', { class: 'mood-desc' },
    "Pick a mood and we'll search several genre/keyword angles, verify each candidate's real genre, and rank the best matches — not just titles that happen to contain the word."));

  const freeText = el('div', { class: 'mood-freetext' }, [
    el('input', { type: 'text', id: 'mood-text-input', placeholder: "Or describe how you're feeling…", 'aria-label': "Describe how you're feeling" }),
    el('button', { class: 'btn-ghost', id: 'mood-text-btn' }, 'Match'),
  ]);
  root.appendChild(freeText);

  const moods = Object.keys(MOOD_PALETTE);
  const grid = el('div', { class: 'mood-grid', id: 'mood-grid' });
  moods.forEach(mood => {
    const p = MOOD_PALETTE[mood];
    grid.appendChild(el('button', {
      class: 'mood-btn',
      'data-mood': mood,
      title: p.desc,
    }, [el('span', { class: 'emoji' }, p.emoji), ' ', mood]));
  });
  root.appendChild(grid);

  const status = el('p', { id: 'mood-status', style: 'color:var(--text-muted);font-size:.85rem;padding:0 var(--sp-6);min-height:1.2em' });
  root.appendChild(status);
  const resultsGrid = el('div', { class: 'movies-grid', id: 'mood-results' });
  root.appendChild(resultsGrid);

  let requestSeq = 0;
  async function selectMood(mood) {
    const seq = ++requestSeq;
    grid.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('active', b.dataset.mood === mood));
    const p = MOOD_PALETTE[mood];
    status.textContent = `Finding precise matches for ${mood.toLowerCase()} (${p.label.toLowerCase()})…`;
    resultsGrid.innerHTML = '';
    resultsGrid.appendChild(makeSkeletons(12));

    const results = await fetchMoodResults(mood);
    if (seq !== requestSeq) return; // superseded by a newer pick
    resultsGrid.innerHTML = '';
    if (!results.length) {
      status.textContent = `No matches found for ${mood.toLowerCase()} right now.`;
      resultsGrid.appendChild(makeEmptyState('film', 'Try another mood, or describe what you want above.'));
      return;
    }
    status.textContent = `Showing movies for: ${mood} — ${p.desc}`;
    results.forEach(m => resultsGrid.appendChild(makeCard(m, { onOpen })));
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn');
    if (btn) selectMood(btn.dataset.mood);
  });

  qs('#mood-surprise-btn').addEventListener('click', () => {
    const random = moods[Math.floor(Math.random() * moods.length)];
    selectMood(random);
  });

  const textInput = qs('#mood-text-input');
  const runTextMatch = () => {
    if (!textInput.value.trim()) return;
    selectMood(guessMoodFromText(textInput.value.trim()));
  };
  qs('#mood-text-btn').addEventListener('click', runTextMatch);
  textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runTextMatch(); });
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
