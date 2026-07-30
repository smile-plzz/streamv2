import { qs, qsa } from '../store.js';
import { icon } from './icons.js';
import { storage } from '../storage.js';

const ROUTES = [
  { id: 'home', label: 'Home' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'continue', label: 'Continue' },
];

export function initNavbar({ onNavigate, onSearch, onToggleAbout }) {
  const nav = qs('#navbar');
  nav.innerHTML = `
    <button class="nav-brand" id="nav-brand">NowShowing</button>
    <ul class="nav-links" id="nav-links">
      ${ROUTES.map(r => `<li><button data-route="${r.id}" id="link-${r.id}">${r.label}</button></li>`).join('')}
    </ul>
    <div class="nav-right">
      <div class="nav-search" id="nav-search">
        <button id="nav-search-toggle" aria-label="Toggle search">${icon('search', { size: 16 })}</button>
        <input type="text" id="nav-search-input" placeholder="Search titles…" aria-label="Search titles">
      </div>
      <button class="icon-btn" id="theme-toggle" title="Toggle theme" aria-label="Toggle theme">${icon('moon', { size: 15 })}</button>
      <button class="icon-btn" id="about-btn" title="About" aria-label="About NowShowing">${icon('info', { size: 15 })}</button>
    </div>
    <button class="hamburger" id="hamburger-btn" aria-label="Open menu">${icon('menu', { size: 20 })}</button>
  `;

  qs('#nav-brand').addEventListener('click', () => onNavigate('home'));
  ROUTES.forEach(r => qs(`#link-${r.id}`).addEventListener('click', () => onNavigate(r.id)));

  const searchWrap = qs('#nav-search');
  const searchInput = qs('#nav-search-input');
  qs('#nav-search-toggle').addEventListener('click', () => {
    const willOpen = !searchWrap.classList.contains('open');
    searchWrap.classList.toggle('open', willOpen);
    if (willOpen) searchInput.focus();
    else if (searchInput.value.trim()) onSearch(searchInput.value.trim());
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      onSearch(searchInput.value.trim());
      searchWrap.classList.remove('open');
      searchInput.blur();
    }
    if (e.key === 'Escape') { searchWrap.classList.remove('open'); searchInput.blur(); }
  });

  qs('#about-btn').addEventListener('click', onToggleAbout);
  qs('#theme-toggle').addEventListener('click', toggleTheme);

  // Mobile menu
  const mobile = qs('#mobile-menu');
  mobile.innerHTML = `
    <button class="mobile-close" id="mobile-close" aria-label="Close menu">${icon('x', { size: 22 })}</button>
    ${ROUTES.map(r => `<button class="link" data-route="${r.id}">${r.label}</button>`).join('')}
  `;
  qs('#hamburger-btn').addEventListener('click', () => mobile.classList.add('open'));
  qs('#mobile-close').addEventListener('click', () => mobile.classList.remove('open'));
  qsa('button[data-route]', mobile).forEach(btn => btn.addEventListener('click', () => {
    mobile.classList.remove('open');
    onNavigate(btn.dataset.route);
  }));

  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  applyStoredTheme();

  return {
    setActive(routeId) {
      ROUTES.forEach(r => qs(`#link-${r.id}`)?.classList.toggle('active', r.id === routeId));
    },
    setSearchValue(v) { searchInput.value = v; },
    closeSearch() { searchWrap.classList.remove('open'); },
  };
}

function applyStoredTheme() {
  const saved = storage.getTheme();
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme')
    || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  storage.setTheme(next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = qs('#theme-toggle');
  if (!btn) return;
  const current = document.documentElement.getAttribute('data-theme')
    || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  btn.innerHTML = icon(current === 'dark' ? 'moon' : 'sun', { size: 15 });
}
