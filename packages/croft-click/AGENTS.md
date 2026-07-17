# AGENTS.md

## Purpose

The `@ewanc26/croft-click` package acts as a web directory for AT Protocol import tools developed by Ewan Croft.

## Architectural Concepts

- **SvelteKit Application**: Provides a web-based directory interface.
- **Project Cataloging**: Serves as a central hub or directory for various AT Protocol-related import utilities.

## Core Files

- `src/routes/`: Main application routing.
- `src/routes/api/toolkit-usage/+server.ts`: Cached, server-side network-wide toolkit usage summary.
- `src/lib/toolkit-usage.ts`: Pure validation, historical duplicate suppression, and aggregation.
- `src/lib/server/toolkit-usage.ts`: Relay discovery, identity/PDS resolution, bounded pagination, and SSRF checks.
- `src/lib/data/projects.ts`: Canonical project cards used by the page, stats, and relationship graph.
- `lexicons/`: Source schemas for `click.croft.toolkit.use` and each tool union member.
- `src/app.html`: Root HTML template.
- `vite.config.ts`: Vite configuration for the web build.
- `svelte.config.js`: SvelteKit configuration.

## Instructions for Agents

- When updating the directory, ensure content follows the established UI/UX patterns.
- This is a Svelte 5 application.
- Maintain consistent branding and styling using Tailwind CSS.
- Toolkit usage records are authored in each user's repository. Never regress the stats card to reading only the operator repository. Discover repositories with `com.atproto.sync.listReposByCollection`, then read and validate each authoritative PDS with strict concurrency, pagination, timeout, and SSRF bounds.
- Keep usage publication owned by the tool's core success path. Route UIs must not repeat a write already performed by their core function. The aggregator retains a narrow two-second compatibility dedupe for historical Jasper/Tourmaline double-writes.
- Keep `click.croft.toolkit.use`, every `click.croft.tools.*` union member, `src/lib/toolkit-usage.ts`, OAuth scopes, writers, tests, and user-facing descriptions synchronized.
- The public summary endpoint must return aggregates rather than raw user records and use shared-cache headers to avoid turning page traffic into unbounded relay/PDS traffic.
- New catalogue entries need a `projects.ts` record, checked-in logo, `llms.txt` entry, and relationship-graph placement when applicable. Verify the linked production origin rather than adding placeholder URLs.
