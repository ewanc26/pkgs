# AGENTS.md

## Purpose
The `@ewanc26/jasper-web` package is the SvelteKit web frontend for Jasper — a tool for importing Instagram photos, stories, and videos into AT Protocol platforms (Grain or Spark).

## Architectural Concepts
- **SvelteKit Application**: Browser-side OAuth flow using `@atproto/oauth-client-browser`; no server-side secrets required.
- **Jasper Integration**: Delegates all parsing and migration logic to the `@ewanc26/jasper` workspace package; the web layer is purely UI and auth.
- **Landing UI**: Uses `@ewanc26/landing-ui` for shared layout components and styling.
- **Vercel Deployment**: Deployed via `@sveltejs/adapter-vercel`.

## Core Files
- `src/routes/`: SvelteKit route definitions and page components.
- `src/app.html`: Root HTML template.
- `svelte.config.js`: SvelteKit and adapter configuration.
- `vite.config.ts`: Vite build configuration.

## Instructions for Agents
- Run `pnpm --filter @ewanc26/tid build && pnpm --filter @ewanc26/malachite build && pnpm --filter @ewanc26/jasper build` before building this package (handled by the `prebuild` script).
- Follow Svelte 5 runes patterns; do not use legacy Svelte 4 reactive syntax.
- Keep auth handling consistent with the browser OAuth client — no app passwords.
- Maintain consistent styling with Tailwind CSS as configured in the project.
