# Tourmaline

AT Protocol scrobble analyser. Ingests Teal.fm scrobbles from any handle or DID, cross-references with free music APIs, and builds a listener profile.

---

## How it works

1. Enter a handle (e.g. `ewancroft.uk`) or DID (`did:plc:...` or `did:web:...`)
2. Resolves identity via [Slingshot](https://slingshot.microcosm.blue) (handles → DIDs), then fetches the DID document for the PDS URL
3. Fetches `fm.teal.alpha.feed.play` records from the user's PDS
4. Aggregates play counts, timelines, and listening patterns
5. Enriches artist data with MusicBrainz (genres), Last.fm (tags, similar artists), and Deezer (art, genres)
6. Builds a listener profile: genre map, mood profile, diversity score, obscurity index, era preference, timeline heatmap

---

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and add your Last.fm API key (optional):

```bash
cp .env.example .env
```

Get a Last.fm API key at [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create).

---

## Development

```bash
pnpm dev
```

---

## Project structure

```
src/
├── lib/
│   ├── atproto/
│   │   └── resolve.ts        # Handle/DID resolution via Slingshot + scrobble fetching
│   ├── enrich/
│   │   ├── cache.ts           # SQLite cache layer
│   │   ├── musicbrainz.ts     # Genre + MBID enrichment
│   │   ├── lastfm.ts          # Tag + similar artist enrichment
│   │   └── deezer.ts           # Image + genre fallback
│   ├── analysis/
│   │   ├── aggregator.ts      # Raw scrobble aggregation
│   │   ├── genres.ts          # Genre classification
│   │   ├── timeline.ts        # Time-of-day analysis
│   │   ├── era.ts             # Release decade distribution
│   │   ├── diversity.ts       # Shannon entropy + Gini coefficient
│   │   ├── obscurity.ts       # Mainstream vs niche scoring
│   │   └── mood.ts            # Mood extraction from tags
│   └── types.ts
├── routes/
│   ├── +page.svelte           # Handle/DID input form
│   └── profile/[did]/
│       ├── +page.server.ts    # Fetch + analyse + render
│       ├── +page.svelte       # Profile display
│       ├── GenreChart.svelte
│       ├── TimelineHeatmap.svelte
│       ├── MoodRadar.svelte
│       └── EraBarChart.svelte
└── app.html
```

---

## APIs used

| API         | Purpose                                | Auth       | Rate limit   |
| ----------- | -------------------------------------- | ---------- | ------------ |
| Slingshot   | Handle → DID resolution                | None       | None         |
| MusicBrainz | Genres, MBIDs, release dates           | User-Agent | 1 req/sec    |
| Last.fm     | Tags, similar artists, listener counts | API key    | Undocumented |
| Deezer      | Artist images, genre fallback          | None       | Undocumented |

All responses cached in `.cache/tourmaline.db` (SQLite). Cache TTL: 30 days.

---

## Listener profile

- **Genre map** — weighted by play count, from MusicBrainz + Last.fm tags
- **Mood profile** — radar chart from tag keywords (Energetic, Melancholic, Chill, etc.)
- **Diversity score** — Shannon entropy normalised to 0–100
- **Obscurity index** — log-scaled Last.fm listener counts, 0 (mainstream) to 100 (deep cuts)
- **Era preference** — decade distribution from MusicBrainz release dates
- **Timeline heatmap** — hour × day listening patterns from scrobble timestamps

---

License: AGPL-3.0-only
