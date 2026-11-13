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

<!-- allowed-agents -->
## Allowed agents

Only **Claude** (Anthropic) and **Mistral** (Mistral AI) may be used as coding agents in this repository. This rule supersedes any earlier agent-attribution guidance in this file.

- Agent-assisted commits must credit only one of those agents:
  - `Co-Authored-By: Claude <noreply@anthropic.com>`
  - `Co-Authored-By: Mistral Vibe <vibe@mistral.ai>`
- Allowed agent footers are `🤖 Generated with [Claude Code](https://claude.com/claude-code)` and `🤖 Generated with [Mistral Vibe](https://mistral.ai)`.
- Do not add `Co-Authored-By:` trailers, `Generated with` footers, author names, or committer identities for any other agent or AI tool.
- Do not credit another agent in commit metadata.
