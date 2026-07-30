// ==========================================================================
// Mood-based recommendations — ported from smile-plzz/MovieRecommendationBasedOnMood.
//
// OMDb has no genre filter — `s=` only matches title text. To get results
// that are actually mood-relevant (not just titles that happen to contain a
// mood word), we: 1) search a few genre/keyword terms mapped per mood below,
// 2) merge + dedupe candidates, 3) verify each candidate's real Genre via a
// cached detail lookup, 4) rank by genre-match count then rating.
// ==========================================================================
import { searchTitles, getDetails } from './api.js';
import { storage } from './storage.js';

export const MOOD_PALETTE = {
  Happy: { emoji: '😊', label: 'Happy vibes', desc: 'Light-hearted fun and feel-good stories.' },
  Sad: { emoji: '😢', label: 'Emotional depth', desc: 'Films that let you feel it all, deeply.' },
  Excited: { emoji: '🤩', label: 'Pure excitement', desc: 'High-energy films that get your pulse going.' },
  Relaxed: { emoji: '😌', label: 'Calm & peaceful', desc: 'Gentle, easy films for winding down.' },
  Angry: { emoji: '😤', label: 'Fueled by fire', desc: 'Intense stories that channel the rage.' },
  Scared: { emoji: '😱', label: 'Edge-of-seat fear', desc: 'Horror and thrillers for the brave.' },
  Inspired: { emoji: '✨', label: 'Inspired & lifted', desc: 'Films that spark something inside you.' },
  Nostalgic: { emoji: '🕰️', label: 'Throwback feels', desc: 'Classic stories from eras gone by.' },
  Curious: { emoji: '🔍', label: 'Curious mind', desc: 'Mysteries, puzzles and strange worlds.' },
  Romantic: { emoji: '💕', label: 'Love in the air', desc: 'Stories of connection, longing, and love.' },
  Adventurous: { emoji: '🌍', label: 'Adventure calls', desc: 'Epic journeys and far-flung worlds.' },
  Thoughtful: { emoji: '🤔', label: 'Deep thoughts', desc: 'Films that leave you pondering life.' },
  Anxious: { emoji: '😰', label: 'On edge', desc: 'Comforting, gentle picks to ease the feeling.' },
  Hopeful: { emoji: '🌅', label: 'Full of hope', desc: 'Stories that restore your faith in everything.' },
  Playful: { emoji: '🎮', label: 'Playful energy', desc: 'Fun, silly, and wonderfully light.' },
  Adult: { emoji: '🎭', label: 'Mature themes', desc: 'Complex, grown-up cinema for serious viewing.' },
  Wired: { emoji: '⚡', label: 'Wired & buzzed', desc: 'Fast-paced, kinetic, caffeine cinema.' },
  Vengeful: { emoji: '🗡️', label: 'Revenge mode', desc: 'Cold, calculated payback stories.' },
  Goofy: { emoji: '🤪', label: 'Pure goofiness', desc: 'Absurd comedy that makes no apologies.' },
  Eerie: { emoji: '👁️', label: 'Unsettling vibes', desc: 'Slow-burn dread and atmospheric horror.' },
  Empowered: { emoji: '💪', label: 'Feeling powerful', desc: 'Characters who rise, overcome, and win.' },
  Jaded: { emoji: '😒', label: 'Seen it all', desc: 'Cynical, sharp, and darkly funny films.' },
  Awestruck: { emoji: '🤯', label: 'Mind blown', desc: 'Visuals and ideas that defy imagination.' },
  Challenged: { emoji: '🧩', label: 'Brain engaged', desc: 'Films that demand your full attention.' },
  Giddy: { emoji: '🥳', label: 'Giddy and joyful', desc: 'Pure celebration and contagious happiness.' },
  Focused: { emoji: '🎯', label: 'Laser focused', desc: 'Tight, precise, no-fluff storytelling.' },
  Escapist: { emoji: '🚀', label: 'Escape hatch', desc: 'Worlds so good you forget this one.' },
  Intrigued: { emoji: '🕵️', label: 'Deeply intrigued', desc: 'Slow reveals and layered mysteries.' },
  Tense: { emoji: '😬', label: 'Tension maxed', desc: 'Nerve-shredding, palm-sweating cinema.' },
};

// mood -> canonical OMDb genres + descriptive search keywords.
const MOOD_GENRE_MAP = {
  Happy: { genres: ['Comedy', 'Musical', 'Family', 'Adventure'], keywords: ['feel good', 'lighthearted', 'heartwarming', 'joyful', 'uplifting'] },
  Sad: { genres: ['Drama', 'Romance'], keywords: ['poignant', 'tearjerker', 'bittersweet', 'melancholy', 'reflective', 'indie', 'slice of life'] },
  Excited: { genres: ['Action', 'Thriller', 'Sci-Fi', 'Sport'], keywords: ['high octane', 'edge of your seat', 'explosive', 'pulse pounding', 'adrenaline'] },
  Relaxed: { genres: ['Documentary', 'Romance', 'Animation'], keywords: ['calming', 'soothing', 'gentle', 'low stakes', 'peaceful', 'slice of life', 'nature'] },
  Angry: { genres: ['Action', 'Crime', 'Thriller'], keywords: ['vengeful', 'raw', 'intense', 'dark', 'confrontational', 'revenge'] },
  Scared: { genres: ['Horror', 'Mystery', 'Thriller'], keywords: ['spine chilling', 'paranormal', 'haunting', 'tense', 'nightmare', 'supernatural'] },
  Inspired: { genres: ['Biography', 'Drama', 'Musical', 'Fantasy', 'Sci-Fi', 'Documentary'], keywords: ['motivational', 'uplifting', 'triumphant', 'visionary', 'aspirational'] },
  Nostalgic: { genres: ['Romance', 'Family', 'History'], keywords: ['retro', 'vintage', 'memory lane', 'throwback', 'sentimental', 'coming of age', 'classic'] },
  Curious: { genres: ['Mystery', 'Documentary', 'Sci-Fi', 'Thriller'], keywords: ['investigative', 'enigmatic', 'mind bending', 'clue', 'sleuth', 'psychological'] },
  Romantic: { genres: ['Romance', 'Comedy', 'Musical', 'Drama'], keywords: ['love story', 'meet cute', 'tender', 'passionate', 'swoon', 'period romance'] },
  Adventurous: { genres: ['Adventure', 'Action', 'Fantasy', 'Sci-Fi'], keywords: ['journey', 'quest', 'uncharted', 'bold', 'sweeping', 'epic'] },
  Thoughtful: { genres: ['Drama', 'Biography', 'History'], keywords: ['introspective', 'contemplative', 'layered', 'intellectual', 'philosophical', 'indie', 'psychological'] },
  Anxious: { genres: ['Comedy', 'Animation', 'Documentary', 'Family'], keywords: ['comfort', 'gentle', 'uplifting', 'wholesome', 'calming', 'feel good', 'nature'] },
  Hopeful: { genres: ['Drama', 'Sport', 'Family', 'Musical', 'Fantasy'], keywords: ['optimistic', 'triumph', 'feel good', 'against the odds', 'heartening', 'inspirational'] },
  Playful: { genres: ['Comedy', 'Animation', 'Family', 'Musical', 'Adventure'], keywords: ['whimsical', 'imaginative', 'silly', 'joyful', 'colorful'] },
  Adult: { genres: ['Drama', 'Romance', 'Crime', 'Thriller', 'Biography'], keywords: ['mature', 'provocative', 'sensual', 'complex', 'gritty', 'psychological'] },
  Wired: { genres: ['Thriller', 'Action', 'Sci-Fi'], keywords: ['fast-paced', 'high energy', 'intense', 'futuristic', 'complex plot', 'cyberpunk'] },
  Vengeful: { genres: ['Action', 'Crime', 'Thriller', 'Film-Noir'], keywords: ['retribution', 'dark justice', 'unrelenting', 'payback', 'gritty', 'revenge', 'neo-noir'] },
  Goofy: { genres: ['Comedy', 'Animation'], keywords: ['absurd', 'silly', 'zany', 'nonsensical', 'laugh out loud', 'slapstick', 'parody', 'cult'] },
  Eerie: { genres: ['Horror', 'Thriller', 'Mystery'], keywords: ['foreboding', 'unsettling', 'atmospheric', 'suspenseful', 'chilling', 'gothic', 'psychological'] },
  Empowered: { genres: ['Biography', 'Drama', 'Action'], keywords: ['strong female lead', 'triumph', 'courage', 'overcoming obstacles', 'determination', 'inspirational'] },
  Jaded: { genres: ['Crime', 'Thriller', 'Comedy', 'Film-Noir'], keywords: ['skeptical', 'world-weary', 'dark humor', 'pessimistic', 'anti-hero', 'neo-noir', 'cynical'] },
  Awestruck: { genres: ['Sci-Fi', 'Fantasy', 'Documentary'], keywords: ['mind-blowing', 'spectacular', 'grand scale', 'magical', 'immersive', 'epic', 'nature'] },
  Challenged: { genres: ['Thriller', 'Mystery', 'Drama'], keywords: ['puzzle', 'cerebral', 'complex', 'thought-provoking', 'decode', 'psychological', 'mind-bender'] },
  Giddy: { genres: ['Comedy', 'Romance', 'Musical', 'Animation'], keywords: ['euphoric', 'bubbly', 'hilarious', 'excitable', 'charming', 'screwball', 'lighthearted'] },
  Focused: { genres: ['Documentary', 'History', 'Biography', 'Drama'], keywords: ['detailed', 'analytical', 'uninterrupted', 'fact-based', 'in-depth', 'intense'] },
  Escapist: { genres: ['Fantasy', 'Sci-Fi', 'Adventure', 'Musical'], keywords: ['otherworldly', 'distraction', 'pure imagination', 'spectacle', 'immersive world', 'high adventure'] },
  Intrigued: { genres: ['Mystery', 'Thriller'], keywords: ['secrets', 'unraveling', 'hidden agenda', 'investigation', 'whodunit', 'spy', 'conspiracy', 'period mystery'] },
  Tense: { genres: ['Thriller', 'Horror'], keywords: ['high stakes', 'nerve-wracking', 'tight spot', 'pressure', 'suspenseful buildup', 'suspense', 'survival', 'psychological'] },
};

// Cheap client-only mood guess from free text — no AI/serverless required.
const KEYWORD_MOOD_MAP = {
  Happy: ['happy', 'great', 'good mood', 'joy', 'glad', 'cheerful'],
  Sad: ['sad', 'down', 'blue', 'crying', 'lonely', 'heartbroken'],
  Angry: ['angry', 'mad', 'furious', 'annoyed', 'pissed'],
  Scared: ['scared', 'afraid', 'anxious', 'nervous', 'terrified'],
  Excited: ['excited', 'pumped', 'thrilled', 'hyped'],
  Relaxed: ['relaxed', 'calm', 'chill', 'tired', 'sleepy', 'exhausted'],
  Romantic: ['love', 'romantic', 'crush', 'in love'],
  Nostalgic: ['nostalgic', 'miss the old days', 'reminisc'],
  Focused: ['stressed', 'overwhelmed', 'long week', 'burnt out'],
};

export function guessMoodFromText(text) {
  const t = text.toLowerCase();
  for (const [mood, words] of Object.entries(KEYWORD_MOOD_MAP)) {
    if (words.some(w => t.includes(w))) return mood;
  }
  return 'Happy';
}

function getMoodTerms(mood) {
  const cfg = MOOD_GENRE_MAP[mood];
  if (!cfg) return [mood];
  return [...cfg.genres, ...cfg.keywords];
}
function getMoodGenres(mood) {
  return (MOOD_GENRE_MAP[mood]?.genres || []).map(g => g.toLowerCase());
}
function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < n) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

// Durable (localStorage) Genre/rating cache, separate from api.js's in-memory
// TTL cache — this one persists across sessions to stay frugal against the
// shared OMDb demo key's daily request cap.
async function fetchDetailsCached(imdbID) {
  const cache = storage.getMoodDetailCache();
  if (cache[imdbID]) return cache[imdbID];
  const d = await getDetails(imdbID);
  if (d && d.Response !== 'False') {
    const entry = { Genre: d.Genre || '', imdbRating: d.imdbRating || '' };
    storage.setMoodDetailCache(imdbID, entry);
    return entry;
  }
  return null;
}

/**
 * Precision mood recommendation engine: search a handful of mapped
 * genre/keyword terms, merge+dedupe, verify real genre via cached detail
 * lookups, rank by genre-match count then rating.
 */
export async function fetchMoodResults(mood, { type = '' } = {}) {
  const terms = [...pickRandom(getMoodTerms(mood), 3)];
  if (!terms.length) terms.push(mood);

  const batches = await Promise.all(terms.map(t => searchTitles(t, { type })));
  const merged = new Map();
  batches.forEach(r => (r?.Search || []).forEach(m => { if (!merged.has(m.imdbID)) merged.set(m.imdbID, m); }));
  let candidates = Array.from(merged.values());

  const genres = getMoodGenres(mood);
  if (genres.length && candidates.length) {
    const scoped = candidates.slice(0, 24);
    const rest = candidates.slice(24);
    const details = await Promise.all(scoped.map(m => fetchDetailsCached(m.imdbID)));
    scoped.forEach((m, i) => {
      const d = details[i];
      const movieGenres = (d?.Genre || '').toLowerCase();
      m._matchScore = genres.reduce((acc, g) => acc + (movieGenres.includes(g) ? 1 : 0), 0);
      m._rating = parseFloat(d?.imdbRating) || 0;
      if (d?.imdbRating) m.imdbRating = d.imdbRating;
    });
    scoped.sort((a, b) => (b._matchScore - a._matchScore) || (b._rating - a._rating));
    candidates = [...scoped, ...rest];
  }
  return candidates;
}
