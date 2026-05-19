# AGENTS.md

## Purpose
The `@ewanc26/atproto` package provides a service layer for AT Protocol, specifically tailored to the infrastructure needs extracted from Ewan Croft's personal site.

## Architectural Concepts
- **Service Layer Abstraction**: Provides modular utility functions for interacting with AT Protocol, abstracting away lower-level complexities.
- **Modularity**: Logic is separated into specific domains like `fetch.ts`, `posts.ts`, `media.ts`, and `engagement.ts` to manage the complexity of AT Protocol interactions.
- **Typescript-First**: Strongly typed definitions for data structures and service responses.

## Core Files
- `src/index.ts`: Public API entry point.
- `src/fetch.ts`: Centralized fetch logic for AT Protocol endpoints.
- `src/posts.ts`: Utilities for interacting with user posts.
- `src/media.ts`: Utilities for media/image handling within AT Protocol.
- `src/engagement.ts`: Utilities for likes, reposts, etc.
- `src/documents.ts`: Handling of specific AT Protocol documents.

## Instructions for Agents
- When adding new functionality, try to follow the established pattern of creating specific domain files (e.g., `src/foo.ts`).
- Ensure all new public methods are exported from `src/index.ts`.
- This package depends on `@atproto/api`; ensure changes remain compatible with the peer dependency version requirements.
- Always check `src/types.ts` for existing interfaces before introducing new types.
