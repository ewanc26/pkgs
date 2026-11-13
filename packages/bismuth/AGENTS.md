# AGENTS.md

## Purpose
Convert RTF-block documents (`site.standard.document`) to Markdown, supporting AT Protocol integration.

## Architectural Concepts
- **Document Conversion**: Core logic for transforming structured RTF blocks into Markdown content.
- **AT Protocol Integration**: Utilities for fetching and handling AT Protocol data structures relevant to document conversion.
- **CLI/Library Interface**: Provides both a CLI tool and a library API for document transformation.

## Core Files
- `src/index.ts`: Public API entry point.
- `src/convert.ts`: Main transformation logic.
- `src/blocks.ts`: Handling of individual document blocks.
- `src/cli.ts`: CLI command implementation.
- `src/fetch.ts`: Data fetching utilities.

## Instructions for Agents
- New conversion rules should be added to `src/convert.ts` or `src/blocks.ts`.
- When modifying the CLI, ensure updates are reflected in `src/cli.ts` and `src/bin.ts`.
- Ensure all public-facing transformation functions are exported from `src/index.ts`.
- Run `pnpm run test` after any changes to ensure conversion integrity.

<!-- allowed-agents -->
## Allowed agents

Only **Claude** (Anthropic) and **Mistral** (Mistral AI) may be used as coding agents in this repository. This rule supersedes any earlier agent-attribution guidance in this file.

- Agent-assisted commits must credit only one of those agents:
  - `Co-Authored-By: Claude <noreply@anthropic.com>`
  - `Co-Authored-By: Mistral Vibe <vibe@mistral.ai>`
- Allowed agent footers are `🤖 Generated with [Claude Code](https://claude.com/claude-code)` and `🤖 Generated with [Mistral Vibe](https://mistral.ai)`.
- Do not add `Co-Authored-By:` trailers, `Generated with` footers, author names, or committer identities for any other agent or AI tool.
- Do not credit another agent in commit metadata.
