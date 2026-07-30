// ==========================================================================
// App bootstrap
// ==========================================================================
import { qs } from './store.js';
import { initNavbar } from './components/navbar.js';
import { initHero } from './components/hero.js';
import { initModal, openModal } from './components/modal.js';
import { initAbout } from './components/about.js';
import { enableWheelScroll } from './components/row.js';
import { initRouter, navigate } from './router.js';
import {
  renderHome, renderBrowse, renderGenre, renderSearch, renderWatchlist, renderContinue, renderMood,
} from './pages.js';

const onOpen = (movie) => openModal(movie.imdbID, movie.Type || 'movie');

const about = initAbout();
const hero = initHero({
  onSearch: (q, type) => navigate('search', { query: type ? { q, type } : { q } }),
  onTypeChange: () => {},
});
const nav = initNavbar({
  onNavigate: (route) => navigate(route),
  onSearch: (q) => navigate('search', { query: { q } }),
  onToggleAbout: () => about.open(),
});
initModal();
enableWheelScroll();

initRouter(async ({ route, param, query }) => {
  nav.setActive(route);

  if (route === 'home') {
    hero.show();
    await renderHome({ onOpen, navigate: (r, opts) => navigate(r, opts) });
    return;
  }

  hero.hide();

  if (route === 'movies') return renderBrowse('movies', { onOpen });
  if (route === 'tv') return renderBrowse('tv', { onOpen });
  if (route === 'genre') return renderGenre(param, { onOpen });
  if (route === 'mood') return renderMood({ onOpen });
  if (route === 'watchlist') return renderWatchlist({ onOpen });
  if (route === 'continue') return renderContinue({ onOpen });
  if (route === 'search') {
    nav.setSearchValue(query.q || '');
    hero.setValue(query.q || '');
    return renderSearch(query.q || '', query.type || '', { onOpen });
  }

  // Unknown route — fall back home
  navigate('home');
});

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
  if (e.key === '/' && !typing) {
    e.preventDefault();
    hero.focusSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
