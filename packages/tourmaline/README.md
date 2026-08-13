# Tourmaline

AT Protocol scrobble analyser. Ingests Teal.fm scrobbles from any public handle or DID, cross-references with free music APIs, and builds a listener profile — genre map, mood profile, personality archetype, diversity/obscurity scores, listening streaks and milestones, a Stories-style yearly recap, and more. No sign-in required to browse; sign-in is only needed to post a share card.

---

## How it works

1. Enter a handle (e.g. `ewancroft.uk`) or DID (`did:plc:...` or `did:web:...`)
2. Resolves identity via [Slingshot](https://slingshot.microcosm.blue) (handles → DIDs), then fetches the DID document for the PDS URL
3. Fetches `fm.teal.feed.play` and legacy `fm.teal.alpha.feed.play` records from the user's PDS
4. Aggregates play counts, timelines, streaks, and listening patterns entirely client-side
5. Enriches artists with MusicBrainz (genres), Last.fm (tags, similar artists, listener counts), and Deezer (art, genre fallback, 30s track previews) — progressively, in the background
6. Builds a listener profile and renders it as soon as the first pass completes, filling in genre/mood/recommendation detail as enrichment continues

Only identity resolution and third-party API calls (scrobble fetch, artist enrichment, track previews) happen server-side, via four small API routes. Aggregation and every derived stat are computed in the browser from the fetched data — see [Project structure](#project-structure).

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
│   ├── server/                     # Server-only: identity resolution, scrobble/artist fetching
│   │   ├── resolve.ts               # Handle/DID resolution via Slingshot
│   │   ├── scrobbles.ts             # CAR-fetches fm.teal.*.feed.play from the user's PDS
│   │   ├── enrich.ts                # MusicBrainz + Last.fm + Deezer artist/track lookups
│   │   └── validate.ts              # Request validation (SSRF guards, etc.)
│   ├── client/                     # Client-only orchestration
│   │   ├── load-profile.ts          # Shared fetch→compute→enrich pipeline (profile + compare both use this)
│   │   └── visit-history.ts         # "Since your last visit" delta (localStorage)
│   ├── analysis/                   # Pure functions: AggregatedData/ListenerProfile → derived stats
│   │   ├── aggregator.ts            # Raw scrobble aggregation (play counts, streaks, milestones, ...)
│   │   ├── genres.ts, mood.ts, era.ts, timeline.ts, diversity.ts, obscurity.ts
│   │   ├── personality.ts           # Listener archetype ("The Curator", etc.)
│   │   ├── story-recap.ts           # Narrative card sequence for the Stories-style recap
│   │   ├── comparison.ts            # Two-listener compatibility (cosine similarity, shared/unique artists)
│   │   ├── recommendations.ts       # "You might like" from already-fetched similar-artist data
│   │   ├── listening-context.ts     # Diversity/obscurity/pace framed against documented reference bands
│   │   ├── discovery.ts, on-this-day.ts, remarkable-days.ts, phases.ts, sessions.ts, streaks.ts, zscore.ts, eddington.ts, date-range.ts
│   │   └── ...
│   ├── share/                      # Share-card SVG generation + Bluesky posting
│   │   ├── theme.ts                 # Shared palette/fonts/esc() for every card renderer
│   │   ├── personality-svg.ts, receipt-svg.ts, festival-svg.ts, story-svg.ts
│   │   ├── registry.ts              # {type, data} → {render, share} dispatch used by /share
│   │   ├── post.ts                  # SVG → PNG → blob upload → Bluesky post → toolkit-use record
│   │   └── svg-to-png.ts
│   ├── components/                  # Shared UI: BaseChart, TrackPreview, Skeleton, ...
│   ├── atproto/oauth.ts             # Browser OAuth client (only used by /share)
│   └── types.ts
├── routes/
│   ├── +page.svelte                 # Handle/DID input form
│   ├── profile/[did]/
│   │   ├── +page.server.ts          # Resolves identity only — no scrobble fetching server-side
│   │   ├── +page.svelte             # Orchestrates loadProfile(), renders every tab
│   │   └── *.svelte                 # ~30 presentational components (GenreChart, PersonalityCard, StoryRecap, Recommendations, ListeningContext, ...)
│   ├── compare/
│   │   ├── +page.svelte             # Two-handle input form (prefillable via ?with=)
│   │   └── [did1]/[did2]/           # Resolves both identities, runs loadProfile() for each in parallel
│   ├── share/+page.svelte           # OAuth sign-in + post any registered card type
│   └── api/
│       ├── resolve/[identifier]/    # Identity resolution
│       ├── scrobbles/[did]/         # Paginated CAR-export scrobble fetch
│       ├── enrich/[did]/            # Batched artist enrichment
│       └── track-preview/           # On-demand Deezer track-preview lookup
└── app.html
```

---

## APIs used

| API         | Purpose                                          | Auth       | Rate limit   |
| ----------- | ------------------------------------------------- | ---------- | ------------ |
| Slingshot   | Handle → DID resolution                           | None       | None         |
| MusicBrainz | Genres, MBIDs, release dates                      | User-Agent | 1 req/sec    |
| Last.fm     | Tags, similar artists, listener counts            | API key    | Undocumented |
| Deezer      | Artist images, genre fallback, 30s track previews | None       | Undocumented |

**Caching is two-layer, both non-persistent — there's no database:**

- **Server**: an in-memory `Map`, scoped to one warm serverless instance, 7-day TTL for artist enrichment and 24h for track previews. Helps when two requests hit the same warm instance close together; gone on a cold start.
- **Client**: `localStorage`, 30-day TTL, keyed per artist name. Once your browser has enriched an artist, repeat visits (and other profiles that share artists with yours) skip the API calls entirely.

If you're looking for a persisted cross-session cache: it doesn't exist yet. See [Listening context](#listening-context--comparisons) for what that constraint rules out.

---

## Listener profile

- **Genre map** — weighted by play count, from MusicBrainz + Last.fm tags
- **Mood profile** — radar chart from tag keywords (Energetic, Melancholic, Chill, etc.)
- **Diversity score** — Shannon entropy normalised to 0–100
- **Obscurity index** — log-scaled Last.fm listener counts, 0 (mainstream) to 100 (deep cuts)
- **Era preference** — decade distribution from MusicBrainz release dates
- **Timeline heatmap** — hour × day listening patterns from scrobble timestamps
- **Personality archetype** — a listener "type" (The Curator, The Explorer, ...) derived from diversity, obscurity, mood, and genre range
- **Streaks & milestones** — longest scrobble/artist/track streaks, biggest listening gap, round-number milestones (1,000th scrobble, etc.)
- **Listening phases & sessions** — detects distinct eras in your taste over time and groups scrobbles into discrete listening sessions
- **On this day / remarkable days** — surfaces standout or unusual days from your history
- **Discovery** — first-listen dates for every artist, track, and album
- **Recommendations** — "You might like" artists, built entirely from Last.fm similar-artist data already fetched during enrichment (no extra API calls), filtered to artists not already in your library
- **Yearly Wrapped & Story recap** — a Spotify-Wrapped-style summary and a Stories-style narrative card sequence, each exportable as a share image (see below)

### Listening context & comparisons

"You're more diverse than most listeners" needs a live distribution of *other* listeners' stats to back it up — and because tourmaline has no database (see [Caching](#apis-used)), it doesn't track one. Two features handle this honestly instead:

- **Listening context** frames your diversity/obscurity scores against their own documented 0–100 scale, plus one externally-referenced band for daily listening pace, clearly labelled as illustrative rather than a live ranking.
- **[/compare](#compare)** sidesteps the whole problem: every teal.fm scrobbler already has a public DID and public PDS records, so comparing two *specific* listeners needs no tracked distribution at all — just fetching both profiles the same way one is already fetched.

---

## Compare

`/compare` computes music-taste compatibility between any two teal.fm listeners — no account linking needed on either side, unlike Last.fm-with-Friends or Spotify Blend. Enter two handles or DIDs (prefillable via `?with=`, e.g. from a profile page's "Compare with…" link), and it:

- Fetches and enriches both profiles in parallel (same `loadProfile` pipeline as a single profile)
- Computes a 0–100 compatibility score — cosine similarity over each listener's top-50 artists (60% weight) and genre distribution (40%)
- Lists shared artists/genres, each listener's unique top artists, and artists both discovered within 30 days of each other

---

## Share cards

Every card renders as an SVG (embedded fonts, so it converts cleanly to PNG for upload), goes through the same OAuth sign-in + post flow at `/share`, and logs a `click.croft.toolkit.use` record. Adding a new card type is a matter of adding an entry to `share/registry.ts` — the posting page itself is card-agnostic.

| Card | Trigger | Description |
| ---- | ------- | ----------- |
| Personality | "Share to Bluesky" on the personality card | Archetype, traits, genre/mood bars |
| Receipt | "Receipt" next to Top Tracks | Receiptify-style till receipt of your top 10 tracks |
| Festival lineup | "Lineup" next to Top Artists | Instafest-style poster, top artists sized by rank tier |
| Story recap | "Share" on the story recap card | Whichever recap card you're currently viewing, as a portrait Stories-shaped image |

---

## Track previews

Deezer's track-search API (already used for artist images, no auth needed) also returns a 30-second preview clip per track. Every entry in Top Tracks has a play button that fetches and plays it — one preview plays at a time.

---

## Since your last visit

A full recurring digest (a scheduled email or Bluesky post) needs infrastructure this stateless app doesn't have — a scheduler, an email provider, a subscriber list. Instead, each completed profile load snapshots your scrobble/artist counts to `localStorage`; on your next visit, tourmaline diffs against that snapshot before overwriting it and shows what's new (scrobble count, newly-discovered artists) since you last checked.

---

License: AGPL-3.0-only
