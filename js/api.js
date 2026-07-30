// ==========================================================================
// OMDb API client — thin fetch wrapper with an in-memory TTL cache and
// request de-duplication so rapid re-renders don't fan out duplicate calls.
// ==========================================================================
import { OMDB_KEY, CACHE_TTL_MS } from './config.js';

const cache = new Map(); // key -> { data, expires }
const inflight = new Map(); // key -> Promise

function cacheKey(params) {
  return Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
}

export async function omdb(params) {
  const key = cacheKey(params);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  if (inflight.has(key)) return inflight.get(key);

  const url = 'https://www.omdbapi.com/?apikey=' + OMDB_KEY + '&' + new URLSearchParams(params);
  const promise = fetch(url)
    .then(r => (r.ok ? r.json() : { Response: 'False', Error: 'Network error' }))
    .catch(() => ({ Response: 'False', Error: 'Network error' }))
    .then(data => {
      cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
      inflight.delete(key);
      return data;
    });

  inflight.set(key, promise);
  return promise;
}

export async function searchTitles(query, { page = 1, type = '' } = {}) {
  const params = { s: query, page };
  if (type) params.type = type;
  return omdb(params);
}

export async function getDetails(imdbID) {
  return omdb({ i: imdbID, plot: 'full' });
}

export async function getSeason(imdbID, season) {
  return omdb({ i: imdbID, Season: season });
}

/** Look up many titles by name in parallel, silently dropping misses. */
export async function lookupTitles(titles, type = '') {
  const params = t => (type ? { t, type } : { t });
  const results = await Promise.all(titles.map(t => omdb(params(t))));
  return results.filter(m => m && m.Response !== 'False');
}
