import { qs } from '../store.js';
import { icon } from './icons.js';

export function initHero({ onSearch, onTypeChange }) {
  const hero = qs('#hero-section');
  hero.innerHTML = `
    <div class="hero-inner">
      <h1>Find Something<br><em>to Watch</em> Tonight</h1>
      <p>Search movies &amp; shows, then stream from multiple free sources. If one's blank or blocked, just try another — they're all listed under the player.</p>
      <div class="search-box">
        <input type="text" id="hero-search-input" placeholder="Search for a movie or TV show…" aria-label="Search for a movie or TV show">
        <button id="hero-search-btn">${icon('search', { size: 16 })} Search</button>
      </div>
      <div class="type-filters" id="hero-type-filters">
        <button class="type-btn active" data-type="">All</button>
        <button class="type-btn" data-type="movie">Movies</button>
        <button class="type-btn" data-type="series">TV Shows</button>
      </div>
    </div>
  `;

  const input = qs('#hero-search-input');
  let currentType = '';
  const fire = () => { if (input.value.trim()) onSearch(input.value.trim(), currentType); };
  qs('#hero-search-btn').addEventListener('click', fire);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') fire(); });

  qs('#hero-type-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.type-btn');
    if (!btn) return;
    qs('#hero-type-filters').querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    onTypeChange(currentType);
  });

  return {
    show() { hero.style.display = 'flex'; },
    hide() { hero.style.display = 'none'; },
    focusSearch() { input.focus(); },
    setValue(v) { input.value = v; },
  };
}
