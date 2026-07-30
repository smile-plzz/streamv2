import { el, qs } from '../store.js';
import { makeCard, makeSkeletons } from './card.js';

/**
 * Renders a titled, horizontally-scrolling row of cards into `mount`.
 * `loader` is an async fn returning an array of OMDb-shaped items.
 */
export async function renderRow(mount, { title, onOpen, loader, seeAll, badge }) {
  const section = el('div', { class: 'section' });
  const header = el('div', { class: 'section-header' }, [
    el('h2', { class: 'section-title' }, title),
    seeAll ? el('button', { class: 'section-link', onclick: seeAll }, 'See all →') : null,
  ]);
  const scroller = el('div', { class: 'row-scroller' });
  scroller.appendChild(makeSkeletons(6));
  section.appendChild(header);
  section.appendChild(scroller);
  mount.appendChild(section);

  const items = await loader();
  scroller.innerHTML = '';
  if (!items.length) {
    section.remove();
    return null;
  }
  items.forEach(item => scroller.appendChild(makeCard(item, { onOpen, badge: typeof badge === 'function' ? badge(item) : badge })));
  return section;
}

/** Enables shift+wheel-free horizontal scrolling via plain vertical wheel input. */
export function enableWheelScroll(root = document) {
  root.addEventListener('wheel', (e) => {
    const scroller = e.target.closest('.row-scroller');
    if (!scroller) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });
}
