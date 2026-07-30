# NowShowing

A minimalist movie & TV discovery app. Search titles via [OMDb](https://www.omdbapi.com/), browse trending/genre rows, and stream from multiple free third-party embed sources with one-click switching if a source is blank or blocked.

**[No build step required](#architecture) — open `index.html` or serve the folder statically.**

## Features

- **Discovery** — home page with Continue Watching, Trending, genre rows (Action, Sci-Fi, Drama, Comedy, Thriller), Popular Movies/TV
- **Mood-based recommendations** — pick from 29 moods (or describe how you're feeling in a few words); searches several genre/keyword angles per mood, verifies each candidate's real OMDb genre via a cached detail lookup, and ranks by genre-match count + rating — not just titles whose name happens to contain the word. Ported from [MovieRecommendationBasedOnMood](https://github.com/smile-plzz/MovieRecommendationBasedOnMood)'s client-only recommendation engine (`js/moods.js`); results open directly in this app's streaming player rather than linking out.
- **Search** — hero + nav search (submit on Enter or click), movie/TV type filter, paginated results
- **Streaming** — multi-source iframe player with instant source switching, season/episode selector for TV, "open in new tab" fallback, and the last working source is remembered
- **Watchlist & Continue Watching** — stored locally in `localStorage`, never leaves the device
- **Light/dark theme** toggle (persisted, respects system preference by default)
- **Keyboard shortcuts** — `/` focuses search, `Esc` closes modals
- Responsive, accessible (keyboard-navigable cards, focus management in modals), PWA-ready manifest

## Architecture

Rebuilt from a single 1,046-line HTML file into modular, dependency-free **vanilla JS (ES modules) + CSS** — no React/Vite/npm required, so it deploys exactly like before (push static files to GitHub Pages or any static host).

```
index.html            Shell — mount points populated by JS, no inline markup for pages
css/
  tokens.css           Design tokens (color, type, spacing, motion) incl. light theme
  base.css              Reset + base element styles
  layout.css            Nav, hero, section/page layout, footer
  components.css         Cards, rows, modal, player, sources bar, toasts, etc.
js/
  config.js             API key, catalog seed lists, video source registry
  api.js                 OMDb client with in-memory TTL cache + request de-dupe
  sources.js              Embed URL builder per provider quirk + "last used source" memory
  moods.js                 Mood → genre/keyword map + the precision recommendation engine
  storage.js                 localStorage: watchlist, continue-watching, theme, recent searches, mood detail cache
  store.js                  DOM helpers (`qs`, `qsa`, `el`)
  router.js                 Hash-based router
  pages.js                   Page renderers (home, browse, genre, mood, search, watchlist, continue)
  main.js                     Bootstrap — wires router → pages, global keyboard shortcuts
  components/
    icons.js                  Inline SVG icon set (no icon-font/CDN dependency)
    toast.js, card.js, row.js  Small reusable UI pieces
    navbar.js, hero.js          Nav + mobile menu + theme toggle; hero search
    modal.js                     Detail modal: player, source switcher, season/episode, recs
    about.js                      About dialog
```

## Local development

No Node.js needed — any static file server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Data source

Uses OMDb's public demo API key by default. If you hit rate limits, get a free key from [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) and swap it into `js/config.js` (`OMDB_KEY`).

## Streaming sources

Playback is provided by embedding third-party free streaming aggregators (vidsrc, 2embed, etc.) — this app does not host or proxy any video itself. Source availability varies by provider and region; if a player stays blank, switch sources or use **Open in Tab**.

## Deploying

Since there's no build step, deployment is just publishing the repo's static files — e.g. GitHub Pages pointed at the repo root/`main` branch.

---

Built by Ismail Hossain. Contact: ismailhossain013@gmail.com
