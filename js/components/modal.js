import { qs, qsa, el } from '../store.js';
import { icon } from './icons.js';
import { getDetails, getSeason, searchTitles } from '../api.js';
import { VIDEO_SOURCES, buildVideoUrl, getPreferredSourceIndex, setPreferredSource } from '../sources.js';
import { storage } from '../storage.js';
import { toast } from './toast.js';
import { makeCard } from './card.js';

let current = null; // { imdbID, type, season, episode, source }
let currentIframeUrl = '';
let lastFocused = null;
let openToken = 0; // bumped on every openModal/closeModal to invalidate stale in-flight async work

export function initModal() {
  const overlay = qs('#modal-overlay');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  qs('#modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') trapFocus(e);
  });
}

/** Keeps Tab/Shift+Tab cycling within the open modal instead of leaking to the page behind it. */
function trapFocus(e) {
  const modalEl = qs('#modal');
  const focusable = qsa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalEl)
    .filter(node => !node.disabled && node.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export async function openModal(imdbID, type = 'movie') {
  const token = ++openToken;
  current = { imdbID, type, season: '1', episode: '1', source: VIDEO_SOURCES[getPreferredSourceIndex()] };
  storage.upsertContinue({ imdbID, Title: 'Loading…', Poster: '', Type: type });

  lastFocused = document.activeElement;
  const overlay = qs('#modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  qs('#modal-title').textContent = 'Loading…';
  qs('#modal-plot').textContent = '';
  qs('#modal-tags').innerHTML = '';
  qs('#modal-meta').innerHTML = '';
  qs('#modal-poster').src = '';
  qs('#recs-section').style.display = 'none';
  qs('#sources-bar').innerHTML = '<span style="color:var(--text-muted);font-size:.8rem;padding:.3rem .5rem">Loading sources…</span>';
  qs('#se-bar').style.display = 'none';
  showPlayerBlank();
  qs('#modal-close').focus();

  const details = await getDetails(imdbID);
  if (token !== openToken) return; // modal closed/changed while awaiting
  if (!details || details.Response === 'False') {
    qs('#modal-title').textContent = 'Could not load details';
    return;
  }

  storage.upsertContinue({ imdbID, Title: details.Title, Poster: details.Poster, Type: details.Type || type, Year: details.Year });

  const poster = details.Poster && details.Poster !== 'N/A' ? details.Poster : '';
  qs('#modal-poster').src = poster;
  qs('#modal-poster').alt = details.Title;
  qs('#modal-title').textContent = details.Title;
  qs('#modal-plot').textContent = details.Plot !== 'N/A' ? details.Plot : '';

  const tags = qs('#modal-tags');
  tags.innerHTML = '';
  if (details.Year && details.Year !== 'N/A') addTag(tags, details.Year);
  if (details.Genre && details.Genre !== 'N/A') details.Genre.split(',').slice(0, 3).forEach(g => addTag(tags, g.trim()));
  if (details.imdbRating && details.imdbRating !== 'N/A') addTag(tags, `${icon('star', { size: 11 })} ${details.imdbRating}`, 'rating', true);
  if (details.Rated && details.Rated !== 'N/A') addTag(tags, details.Rated);
  if (details.Runtime && details.Runtime !== 'N/A') addTag(tags, details.Runtime);

  const meta = qs('#modal-meta');
  meta.innerHTML = '';
  [['Director', details.Director], ['Actors', details.Actors], ['Country', details.Country],
   ['Language', details.Language], ['Box Office', details.BoxOffice], ['Awards', details.Awards]]
    .forEach(([k, v]) => {
      if (v && v !== 'N/A' && v !== 'undefined') {
        meta.appendChild(el('p', { html: `<strong>${k}:</strong> ${v}` }));
      }
    });

  updateWatchlistButton(imdbID);

  const isSeries = details.Type === 'series' || type === 'series';
  current.type = isSeries ? 'series' : 'movie';

  if (isSeries && details.totalSeasons) {
    const seasons = parseInt(details.totalSeasons) || 1;
    const sSelect = qs('#season-select');
    sSelect.innerHTML = '';
    for (let i = 1; i <= seasons; i++) sSelect.appendChild(el('option', { value: i }, `Season ${i}`));
    sSelect.onchange = onSeasonChange;
    qs('#episode-select').onchange = loadCurrentEpisode;
    qs('#se-bar').style.display = 'flex';
    await populateEpisodes();
    if (token !== openToken) return; // modal closed/changed while season data was loading
  }

  buildSourceButtons();
  loadSource(current.source);
  loadRecommendations(details);
}

function addTag(container, html, cls = '', isHtml = false) {
  const t = el('span', { class: `tag${cls ? ' ' + cls : ''}` });
  if (isHtml) t.innerHTML = html; else t.textContent = html;
  container.appendChild(t);
}

function updateWatchlistButton(imdbID) {
  const inList = storage.isInWatchlist(imdbID);
  const btn = qs('#wl-btn');
  btn.className = 'wl-btn btn-ghost' + (inList ? ' in-list' : '');
  btn.innerHTML = `${icon('bookmark', { size: 14 })} <span>${inList ? 'In Watchlist' : 'Add to Watchlist'}</span>`;
  btn.onclick = toggleWatchlist;
}

function toggleWatchlist() {
  if (!current) return;
  const id = current.imdbID;
  if (storage.isInWatchlist(id)) {
    storage.removeFromWatchlist(id);
    toast('Removed from watchlist', { iconName: 'x' });
  } else {
    storage.addToWatchlist({
      imdbID: id,
      Title: qs('#modal-title').textContent,
      Poster: qs('#modal-poster').src,
      Type: current.type,
      Year: '',
    });
    toast('Added to watchlist', { type: 'success' });
  }
  updateWatchlistButton(id);
}

async function populateEpisodes() {
  const token = openToken;
  const season = qs('#season-select').value;
  current.season = season;
  const eSelect = qs('#episode-select');
  eSelect.innerHTML = '<option>Loading…</option>';
  const data = await getSeason(current.imdbID, season);
  if (token !== openToken || !current) return; // modal closed/reopened while season data was loading
  eSelect.innerHTML = '';
  if (data && data.Episodes) {
    data.Episodes.forEach(ep => {
      const label = `Ep ${ep.Episode}: ${ep.Title.length > 40 ? ep.Title.slice(0, 40) + '…' : ep.Title}`;
      eSelect.appendChild(el('option', { value: ep.Episode }, label));
    });
    current.episode = eSelect.value;
  } else {
    eSelect.appendChild(el('option', { value: '1' }, 'Episode 1'));
  }
}

async function onSeasonChange() {
  const token = openToken;
  await populateEpisodes();
  if (token !== openToken || !current) return; // modal closed/reopened while season data was loading
  loadCurrentEpisode();
}

function loadCurrentEpisode() {
  if (!current) return;
  current.episode = qs('#episode-select').value;
  loadSource(current.source);
}

function buildSourceButtons() {
  const bar = qs('#sources-bar');
  bar.innerHTML = '';
  VIDEO_SOURCES.forEach((src, i) => {
    const url = buildVideoUrl(src, current.imdbID, current.season, current.episode, current.type);
    if (!url) return;
    const btn = el('button', {
      class: 'src-btn' + (src.name === current.source.name ? ' active' : ''),
      onclick: () => {
        bar.querySelectorAll('.src-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        current.source = src;
        setPreferredSource(src.name);
        loadSource(src);
      },
    }, src.name);
    bar.appendChild(btn);
  });
  bar.appendChild(el('button', {
    class: 'src-btn tab-btn',
    html: `${icon('external-link', { size: 12 })} Open in Tab`,
    title: 'Open current source in a new tab (bypasses iframe blocking)',
    onclick: openCurrentInTab,
  }));
}

function showPlayerBlank(src) {
  const wrapper = qs('#player-wrapper');
  wrapper.querySelector('iframe')?.remove();
  const blank = qs('#player-blank');
  blank.style.display = 'flex';
  if (src) {
    blank.innerHTML = `
      <span class="glyph" style="font-size:0">${icon('play', { size: 40 })}</span>
      <h3>Source: ${src.name}</h3>
      <p>Click below to load the player. If it stays blank or is blocked, try another source, or open it in a new tab.</p>
      <button class="btn-primary" id="load-player-btn">${icon('play', { size: 14 })} Load Player</button>
      <button class="btn-ghost" id="open-tab-btn2">${icon('external-link', { size: 13 })} Open in New Tab</button>
    `;
    qs('#load-player-btn').addEventListener('click', loadIframe);
    qs('#open-tab-btn2').addEventListener('click', openCurrentInTab);
  } else {
    blank.innerHTML = `
      <span class="glyph" style="font-size:0">${icon('film', { size: 40 })}</span>
      <h3>Choose a source to start watching</h3>
      <p>Click a source button below to load the player. If a source is blocked or blank, just pick another.</p>
    `;
  }
}

function loadSource(src) {
  current.source = src;
  const url = buildVideoUrl(src, current.imdbID, current.season, current.episode, current.type);
  if (!url) { showPlayerBlank(src); return; }
  currentIframeUrl = url;
  showPlayerBlank(src);
}

function loadIframe() {
  if (!currentIframeUrl) return;
  const wrapper = qs('#player-wrapper');
  qs('#player-blank').style.display = 'none';
  wrapper.querySelector('iframe')?.remove();

  const iframe = el('iframe', {
    style: 'width:100%;height:100%;border:none;display:block;position:absolute;inset:0',
    allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope',
    allowfullscreen: 'true',
    referrerpolicy: 'no-referrer',
  });
  wrapper.style.position = 'relative';
  wrapper.appendChild(iframe);
  iframe.src = currentIframeUrl;

  clearTimeout(loadIframe._t);
  loadIframe._t = setTimeout(showBlankedHint, 12000);
}

function showBlankedHint() {
  if (qs('#blank-hint')) return;
  const hint = el('div', {
    id: 'blank-hint',
    style: 'position:absolute;bottom:.5rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#aaa;font-size:.78rem;padding:.5rem 1rem;border-radius:1rem;z-index:5;pointer-events:none;white-space:nowrap;border:1px solid rgba(255,255,255,.1)',
  }, 'Screen blank? Try another source below ↓');
  qs('#player-wrapper').appendChild(hint);
  setTimeout(() => hint.remove(), 6000);
}

function openCurrentInTab() {
  if (currentIframeUrl) window.open(currentIframeUrl, '_blank', 'noopener,noreferrer');
}

async function loadRecommendations(details) {
  if (!details.Genre || details.Genre === 'N/A') return;
  const genre = details.Genre.split(',')[0].trim();
  const data = await searchTitles(genre, { type: details.Type === 'series' ? 'series' : 'movie' });
  if (!current || current.imdbID !== details.imdbID) return;
  if (!data || data.Response === 'False' || !data.Search) return;
  const filtered = data.Search.filter(m => m.imdbID !== details.imdbID).slice(0, 6);
  if (!filtered.length) return;
  const grid = qs('#recs-grid');
  grid.innerHTML = '';
  filtered.forEach(m => grid.appendChild(makeCard(m, { onOpen: (mv) => openModal(mv.imdbID, mv.Type || 'movie') })));
  qs('#recs-section').style.display = 'block';
}

export function closeModal() {
  openToken++; // invalidate any in-flight fetches from the closing modal (getDetails/getSeason)
  qs('#modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  const wrapper = qs('#player-wrapper');
  const iframe = wrapper.querySelector('iframe');
  if (iframe) { iframe.src = ''; iframe.remove(); }
  currentIframeUrl = '';
  current = null;
  qs('#sources-bar').innerHTML = '';
  lastFocused?.focus?.();
}
