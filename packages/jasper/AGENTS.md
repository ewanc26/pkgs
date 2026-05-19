# AGENTS.md

## Purpose
The `@ewanc26/jasper` package is a tool for migrating data from Instagram exports to AT Protocol platforms like Grain or Spark.

## Architectural Concepts
- **Data Import Tooling**: Handles parsing of Instagram export formats (JSON, media files).
- **AT Protocol Migration**: Utilizes `@atproto/api` and `@atproto/oauth-client-node` to interact with AT Protocol servers and post migrated content.
- **Dependency Integration**: Heavy reliance on local packages like `@ewanc26/malachite` and `@ewanc26/tid`.

## Core Files
- `src/index.ts`: Main entry point and CLI runner.
- `src/core/`: Core migration logic.
- `src/lib/`: Library support including browser-specific logic.
- `src/utils/`: General utilities for processing export data.

## Instructions for Agents
- When updating migration logic, ensure `src/core/` is updated appropriately.
- Maintain compatibility with `@atproto/api`.
- This package supports both CLI usage and potential browser-side migration (see `src/lib/browser.js` export).
- Always ensure `PRIVACY.md` is respected when handling user export data.
