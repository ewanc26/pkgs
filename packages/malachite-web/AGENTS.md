# AGENTS.md

## Purpose
`@ewanc26/malachite-web` is the SvelteKit web frontend for Malachite — a browser-based interface for importing Last.fm and Spotify listening history into AT Protocol, deployed at `malachite.croft.click`.

## Architectural Concepts
- **SvelteKit Application**: Browser-side OAuth via `@atproto/oauth-client-browser`; delegates all import logic to the `@ewanc26/malachite` workspace package.
- **Vercel Deployment**: Uses `@sveltejs/adapter-vercel`.
- **Landing UI**: Shares layout and styling with other `*-web` frontends via `@ewanc26/landing-ui`.

## Core Files
- `src/routes/`: SvelteKit page routes and components.
- `src/app.html`: Root HTML template.
- `svelte.config.js`: SvelteKit and adapter configuration.
- `vite.config.ts`: Vite build configuration.

## Instructions for Agents
- Run `pnpm --filter @ewanc26/tid build && pnpm --filter @ewanc26/malachite build` before building this package (handled by the `prebuild` script).
- Follow Svelte 5 runes patterns throughout.
- No server-side secrets — auth uses the browser OAuth client only.
- Keep styling consistent with Tailwind CSS and the shared `@ewanc26/landing-ui` components.
