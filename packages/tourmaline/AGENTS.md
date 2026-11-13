# AGENTS.md

## Purpose

The `tourmaline` package is the core statistical engine and web frontend for the Last.fm stats migration project. It aggregates scrobble data from ATProto PDS (teal.fm) and computes detailed listening insights.

## Architectural Concepts

- **Functional Analysis Engine**: Uses utility modules in `src/lib/analysis/` to process raw scrobble data into meaningful stats (milestones, streaks, genres, etc.).
- **Chart.js Abstraction**: `src/lib/components/BaseChart.svelte` serves as the primary wrapper for consistent visualization across the dashboard.
- **Sequential Enrichment**: Employs a strict fetch-compute-enrich cycle to maintain data integrity and avoid UI race conditions.
- **Svelte 5 / Tailwind**: Uses Svelte 5 runes for reactive state management and Tailwind CSS for styling.

## Core Files

- `src/lib/analysis/statsBuilder.ts`: Handles aggregation and statistical calculations.
- `src/lib/server/enrich.ts`: Logic for API enrichment via MusicBrainz/Last.fm.
- `src/lib/components/BaseChart.svelte`: Reusable Chart.js component.
- `src/routes/profile/[did]/+page.svelte`: Main dashboard orchestrator.
- `src/routes/api/enrich/[did]/+server.ts`: Enrichment batch processing endpoint.

## Instructions for Agents

- When modifying analysis logic, update tests to ensure statistical accuracy.
- Enrichment follows a sequential batch approach to stay under Vercel execution limits; maintain this constraint when modifying enrichment logic.
- All new visualizations should utilize `BaseChart.svelte` where possible to keep styles consistent.

<!-- allowed-agents -->
## Allowed agents

Only **Claude** (Anthropic) and **Mistral** (Mistral AI) may be used as coding agents in this repository. This rule supersedes any earlier agent-attribution guidance in this file.

- Agent-assisted commits must credit only one of those agents:
  - `Co-Authored-By: Claude <noreply@anthropic.com>`
  - `Co-Authored-By: Mistral Vibe <vibe@mistral.ai>`
- Allowed agent footers are `🤖 Generated with [Claude Code](https://claude.com/claude-code)` and `🤖 Generated with [Mistral Vibe](https://mistral.ai)`.
- Do not add `Co-Authored-By:` trailers, `Generated with` footers, author names, or committer identities for any other agent or AI tool.
- Do not credit another agent in commit metadata.
