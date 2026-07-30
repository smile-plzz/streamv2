// ==========================================================================
// Config — API keys, static catalog seeds, tunables
// ==========================================================================

// Public OMDb demo key (same one shipped in the original app). Swap for your
// own free key from https://www.omdbapi.com/apikey.aspx if you hit rate limits.
export const OMDB_KEY = '1a9ba45f';

export const ROW_SIZE = 14;
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min in-memory cache for OMDb lookups

// Genre rows shown on Home — each maps to an OMDb search term used as a proxy
// for genre browsing (OMDb has no native genre filter on search).
export const GENRE_ROWS = [
  { id: 'action', label: 'Action & Adventure', seed: ['Avengers', 'Mission Impossible', 'John Wick', 'Mad Max', 'Fast Five', 'Extraction', 'The Bourne', 'Gladiator'] },
  { id: 'scifi', label: 'Sci-Fi & Fantasy', seed: ['Dune', 'Interstellar', 'The Matrix', 'Blade Runner', 'Arrival', 'Star Wars', 'Guardians of the Galaxy', 'Edge of Tomorrow'] },
  { id: 'drama', label: 'Acclaimed Drama', seed: ['Oppenheimer', 'Parasite', 'The Godfather', 'Forrest Gump', 'Whiplash', 'Moonlight', 'The Green Mile', '12 Angry Men'] },
  { id: 'comedy', label: 'Comedy', seed: ['Superbad', 'Barbie', 'The Grand Budapest Hotel', 'Knives Out', 'Booksmart', 'Deadpool', 'Free Guy', 'Game Night'] },
  { id: 'thriller', label: 'Thrillers', seed: ['Se7en', 'Gone Girl', 'Prisoners', 'Shutter Island', 'Knives Out', 'Fight Club', 'Zodiac', 'Nightcrawler'] },
];

export const POPULAR_MOVIES = [
  'Inception', 'The Matrix', 'Interstellar', 'The Avengers', 'Avatar',
  'Titanic', 'Jurassic Park', 'Forrest Gump', 'The Lion King', 'Gladiator',
  'Pulp Fiction', 'Fight Club', 'The Lord of the Rings', 'Star Wars', 'Dune',
  'Parasite', 'The Dark Knight', 'Oppenheimer', 'Barbie', 'Top Gun: Maverick',
  'Everything Everywhere All at Once', 'Spider-Man: No Way Home',
  'Black Panther', 'Joker', 'Knives Out', 'Get Out', 'La La Land',
  'The Grand Budapest Hotel', 'Mad Max: Fury Road', 'Whiplash', 'Arrival', 'Coco',
];

export const POPULAR_TV = [
  'Breaking Bad', 'Game of Thrones', 'The Office', 'Friends', 'The Simpsons',
  'Stranger Things', 'The Mandalorian', 'The Crown', 'Westworld', 'Chernobyl',
  'The Witcher', 'Black Mirror', 'Succession', 'The Last of Us', 'House of the Dragon',
  'Squid Game', 'Ozark', 'Better Call Saul', 'Ted Lasso', 'Severance',
  'Andor', 'The Bear', 'White Lotus', 'Peaky Blinders', 'Dark', 'Money Heist', 'Fleabag',
];

export const TRENDING_SEED = [
  'Dune: Part Two', 'Oppenheimer', 'The Bear', 'Fallout', 'Shogun',
  'Godzilla x Kong', 'Civil War', 'Baby Reindeer', 'Ripley', '3 Body Problem',
];

export const VIDEO_SOURCES = [
  { name: 'VidSrc.to', url: 'https://vidsrc.to/embed/movie/', tvUrl: 'https://vidsrc.to/embed/tv/' },
  { name: 'VidSrc.icu', url: 'https://vidsrc.icu/embed/movie/', tvUrl: 'https://vidsrc.icu/embed/tv/' },
  { name: 'VidSrc.me', url: 'https://v2.vidsrc.me/embed/', tvUrl: 'https://v2.vidsrc.me/embed/' },
  { name: 'AutoEmbed', url: 'https://autoembed.co/movie/imdb/', tvUrl: 'https://autoembed.co/tv/imdb/' },
  { name: '2Embed', url: 'https://www.2embed.cc/embed/', tvUrl: 'https://www.2embed.cc/embedtv/' },
  { name: '2Embed.stream', url: 'https://www.2embed.stream/embed/movie/', tvUrl: 'https://www.2embed.stream/embed/tv/' },
  { name: 'VidSrc.xyz', url: 'https://vidsrc.xyz/embed/movie/', tvUrl: 'https://vidsrc.xyz/embed/tv/' },
  { name: 'MoviesAPI', url: 'https://moviesapi.club/movie/', tvUrl: 'https://moviesapi.club/tv/' },
  { name: 'MultiEmbed', url: 'https://multiembed.mov/?video_id=', tvUrl: 'https://multiembed.mov/?video_id=' },
  { name: 'EmbedSu', url: 'https://embed.su/embed/movie/', tvUrl: 'https://embed.su/embed/tv/' },
  { name: 'VidSrc.mov', url: 'https://vidsrc.mov/embed/movie/', tvUrl: 'https://vidsrc.mov/embed/tv/' },
];

export const PLACEHOLDER_POSTER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect width="200" height="300" fill="%2316161c"/%3E%3Ctext x="100" y="155" text-anchor="middle" fill="%23555" font-size="14" font-family="sans-serif"%3ENo Poster%3C/text%3E%3C/svg%3E';
