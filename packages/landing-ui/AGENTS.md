# AGENTS.md

## Purpose
The `@ewanc26/landing-ui` package provides the shared landing page layout, UI components, and CSS used across all `@ewanc26/*-web` projects (Malachite, Jasper, Opal, Bismuth, Tourmaline, etc.).

## Architectural Concepts
- **Svelte Component Library**: Compiled with `svelte-package`; exports a `LandingPage` component and supporting primitives consumed via workspace imports.
- **Shared Stylesheet**: `src/lib/landing.css` is exported as a named entry (`./landing.css`) and imported alongside the component tree.
- **Zero App Logic**: This package is purely presentational — no API calls, no ATProto integration, no routing.
- **Utility Dependency**: Depends on `@ewanc26/utils` for shared helper functions.

## Core Files
- `src/lib/index.ts`: Public API — exports all components and types.
- `src/lib/landing.css`: Base stylesheet for the landing page aesthetic.
- `src/lib/LandingPage.svelte`: Root layout component accepted by all web frontends.

## Instructions for Agents
- All public components and types must be re-exported from `src/lib/index.ts`.
- Do not add ATProto, routing, or server-side logic here — keep the package purely UI.
- Run `pnpm build` after changes before consuming apps will pick up updates via workspace resolution.
- Target Svelte 5 component patterns; peer dependency is `svelte >= 5.0.0`.
