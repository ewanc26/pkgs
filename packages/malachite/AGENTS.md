# AGENTS.md

## Purpose
`@ewanc26/malachite` is a CLI tool and library for importing listening history from Last.fm (CSV), Spotify (JSON), and YouTube Music (Google Takeout) into AT Protocol as `fm.teal.alpha.feed.play` records. It handles OAuth authentication, deduplication via CAR-based record fetching, and rate limiting.

## Architectural Concepts
- **Dual Interface**: Ships both a CLI (`bin: malachite`) and a library entry point (`./core`) for use by other packages (e.g. `malachite-web`, `jasper`).
- **OAuth**: Uses `@atproto/oauth-client-node` for authenticated PDS writes; supports `did:web` resolution.
- **TID Generation**: Depends on `@ewanc26/tid` for synchronous AT Protocol TID generation.
- **Deduplication**: Fetches existing records via CAR bundles (`@ipld/car`, `@ipld/dag-cbor`) before posting to avoid duplicates.
- **Source Parsers**: Separate parsers for Last.fm CSV, Spotify JSON, and YouTube Music Takeout (handles the `Watched ` prefix and ` - Topic` artist suffix).

## Core Files
- `src/index.ts`: CLI entry point.
- `src/core/index.ts`: Library API — importable by other packages.
- `src/parsers/`: Source-specific import parsers (lastfm, spotify, youtube-music).
- `src/atproto/`: ATProto write and deduplication logic.

## Instructions for Agents
- Run `pnpm run build` after changes; `malachite-web` and `jasper-web` depend on the compiled `dist/`.
- Run `pnpm test` to execute the Node.js test suite after any parser or deduplication changes.
- Keep `src/core/index.ts` exports stable — it is the public library API consumed by web frontends.
- The YouTube Music parser must handle: the `Watched ` title prefix, `header: "YouTube Music"` CSV filtering, and the ` - Topic` artist suffix.
