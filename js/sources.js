// ==========================================================================
// Streaming source registry — builds embed URLs per-provider and quirk.
// ==========================================================================
import { VIDEO_SOURCES } from './config.js';

export { VIDEO_SOURCES };

export function buildVideoUrl(source, imdbID, season, episode, type) {
  if (type === 'series') {
    if (!source.tvUrl) return null;
    const base = source.tvUrl;
    if (base.includes('vidsrc.me')) return `${base}${imdbID}/${season}-${episode}/`;
    if (base.includes('multiembed.mov')) return `${base}${imdbID}&s=${season}&e=${episode}`;
    if (base.includes('2embed.cc')) return `${base}${imdbID}&s=${season}&e=${episode}`;
    if (base.includes('autoembed')) return `${base}${imdbID}/${season}/${episode}`;
    if (base.includes('moviesapi')) return `${base}${imdbID}/${season}/${episode}`;
    return `${base}${imdbID}/${season}/${episode}`;
  }
  if (!source.url) return null;
  const base = source.url;
  if (base.includes('vidsrc.me')) return `${base}${imdbID}/`;
  if (base.includes('multiembed.mov')) return `${base}${imdbID}`;
  return `${base}${imdbID}`;
}

/** Remembers which source last worked for a given title so we can preselect it. */
const LAST_SOURCE_KEY = 'ns_last_source';

export function getPreferredSourceIndex() {
  const name = localStorage.getItem(LAST_SOURCE_KEY);
  if (!name) return 0;
  const idx = VIDEO_SOURCES.findIndex(s => s.name === name);
  return idx === -1 ? 0 : idx;
}

export function setPreferredSource(name) {
  localStorage.setItem(LAST_SOURCE_KEY, name);
}
