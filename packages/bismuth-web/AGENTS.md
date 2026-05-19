# AGENTS.md

## Purpose
The `@ewanc26/bismuth-web` package is a SvelteKit-based web interface for `bismuth`. It allows users to convert AT Protocol Richtext-block documents to Markdown directly in the browser.

## Architectural Concepts
- **SvelteKit Application**: Built using SvelteKit for frontend rendering and routing.
- **Bismuth Integration**: Utilizes the `@ewanc26/bismuth` library (via monorepo workspace) to perform document parsing and conversion.
- **UI Components**: Leverages `@ewanc26/landing-ui` for common UI components and styling.

## Core Files
- `src/routes/`: SvelteKit route definitions.
- `src/app.html`: Root HTML template.
- `vite.config.ts`: Vite configuration for the web build.
- `svelte.config.js`: SvelteKit configuration.

## Instructions for Agents
- When making UI changes, ensure consistent styling using Tailwind CSS as configured in the project.
- This package relies on `pnpm` workspaces; ensure local `@ewanc26/bismuth` changes are built before running the web app if needed.
- Follow Svelte 5 component patterns as specified in the dependencies.
