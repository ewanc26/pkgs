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
