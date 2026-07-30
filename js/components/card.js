import { el } from '../store.js';
import { icon } from './icons.js';
import { PLACEHOLDER_POSTER } from '../config.js';

export function makeCard(movie, { badge, onOpen, onRemove } = {}) {
  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : PLACEHOLDER_POSTER;
  const typeLabel = movie.Type === 'series' ? 'TV' : movie.Type === 'movie' ? 'Movie' : '';

  const card = el('div', {
    class: 'card',
    role: 'button',
    tabindex: '0',
    'aria-label': `Open ${movie.Title}`,
  }, [
    el('div', { class: 'card-poster-wrap' }, [
      el('img', {
        class: 'card-poster',
        src: poster,
        alt: movie.Title || '',
        loading: 'lazy',
        onerror: (e) => { e.target.src = PLACEHOLDER_POSTER; },
      }),
      el('div', { class: 'card-overlay' }, el('span', { class: 'play-icon', html: icon('play', { size: 30 }) })),
      badge ? el('div', { class: 'card-badge' }, badge) : null,
    ]),
    el('div', { class: 'card-info' }, [
      el('div', { class: 'card-title' }, movie.Title || ''),
      el('div', { class: 'card-meta' }, [movie.Year, typeLabel].filter(Boolean).join(' · ')),
    ]),
  ]);

  const open = () => onOpen && onOpen(movie);
  card.addEventListener('click', (e) => { if (e.target.closest('.card-remove')) return; open(); });
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

  if (onRemove) {
    const rm = el('button', {
      class: 'card-remove', 'aria-label': `Remove ${movie.Title}`, html: icon('x', { size: 12 }),
      onclick: (e) => { e.stopPropagation(); onRemove(movie); },
    });
    card.querySelector('.card-poster-wrap').appendChild(rm);
  }

  return card;
}

export function makeSkeletons(count) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    frag.appendChild(el('div', { class: 'skeleton' }, [
      el('div', { class: 'skeleton-poster' }),
      el('div', { class: 'skeleton-info' }, [
        el('div', { class: 'skeleton-line' }),
        el('div', { class: 'skeleton-line short' }),
      ]),
    ]));
  }
  return frag;
}

export function makeEmptyState(iconName, message) {
  return el('div', { class: 'empty-state' }, [
    el('span', { class: 'glyph', html: icon(iconName, { size: 34 }) }),
    el('p', {}, message),
  ]);
}
