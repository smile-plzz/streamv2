import { qs } from '../store.js';
import { icon } from './icons.js';

export function initAbout() {
  const modal = qs('#info-modal');
  modal.innerHTML = `
    <div class="info-box">
      <button class="info-close" id="info-close" aria-label="Close">${icon('x', { size: 18 })}</button>
      <h2>About NowShowing</h2>
      <p>Built by <strong>Ismail Hossain</strong>, developer &amp; media tinkerer from Dhaka, Bangladesh.</p>
      <p style="margin-top:.8rem">NowShowing pulls streams from multiple free third-party sources. If a source is blank or blocked by your browser's security settings, pick a different one — or use <strong>Open in Tab</strong> for a full-browser fallback.</p>
      <ul style="margin-top:.6rem">
        <li>Search movies &amp; TV shows via OMDb</li>
        <li>Multiple stream sources — switch anytime, last pick remembered</li>
        <li>Watchlist &amp; continue watching (stored locally, never leaves your device)</li>
        <li>Light &amp; dark themes</li>
      </ul>
      <p style="margin-top:1rem;font-size:.8rem">Contact: <a href="mailto:ismailhossain013@gmail.com">ismailhossain013@gmail.com</a> · <a href="https://github.com/smile-plzz" target="_blank" rel="noopener">GitHub</a></p>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  qs('#info-close').addEventListener('click', () => modal.classList.remove('open'));

  return { open: () => modal.classList.add('open') };
}
