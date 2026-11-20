# Contributing to svelte-standard-site

Thank you for your interest in contributing! `svelte-standard-site` is a SvelteKit library for building sites from `site.standard.*` AT Protocol records. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package. The rest of this file is specific to this library.

## Getting started

### Prerequisites

- Node.js 24.x
- pnpm ≥ 9

### Setup

1. Clone the monorepo and install dependencies:

```bash
git clone https://github.com/ewanc26/pkgs.git
cd pkgs
pnpm install
```

2. Create a `.env` file (from this package's directory):

```bash
cd packages/svelte-standard-site
cp .env.example .env
# Edit .env and add your PUBLIC_ATPROTO_DID
```

3. Start the development server:

```bash
pnpm dev
```

## Commands

- `pnpm dev` - Start the development server
- `pnpm build` - Build the library
- `pnpm check` - Run type checking
- `pnpm format` - Format code with Prettier
- `pnpm lint` - Check code formatting
- `pnpm prepack` - Prepare the package for publishing

## Development workflow

### Project structure

```
src/
├── lib/                      # Library source code
│   ├── client.ts            # Main client implementation
│   ├── types.ts             # TypeScript type definitions
│   ├── index.ts             # Public API exports
│   ├── components/          # Reusable Svelte components
│   │   ├── PublicationCard.svelte
│   │   └── DocumentCard.svelte
│   ├── config/              # Configuration utilities
│   │   └── env.ts           # Environment variable handling
│   └── utils/               # Utility functions
│       ├── agents.ts        # AT Protocol agent utilities
│       ├── at-uri.ts        # AT URI parsing utilities
│       └── cache.ts         # Caching implementation
└── routes/                  # Demo/showcase pages
    ├── +page.svelte
    └── +page.server.ts
```

### Making changes

- Run `pnpm format` before committing; TypeScript strict mode is enabled.
- Follow the existing code structure and patterns.
- New components belong in `src/lib/components/` with a corresponding usage example in `routes/`.

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/), optionally scoped: `feat: add support for custom PDS endpoints`, `fix: resolve caching issue with blob URLs`, `docs: update README with new examples`.

### Pull request process

1. Create a branch from `main` and make your changes, with examples/tests where applicable.
2. Ensure `pnpm check` and `pnpm format` are clean.
3. Open a Pull Request against `main` with a clear description of what changed and why, plus how you verified it.

Documentation for public API changes lives in [API.md](API.md); new features should land with usage examples in [EXAMPLES.md](EXAMPLES.md) where they're user-facing.

## What to contribute

- **Bug fixes** — report and fix; a failing-then-passing case is ideal.
- **Features** — discuss in an issue first.
- **Documentation and examples** — always welcome.
- **Components and tests** — new reusable components and coverage improvements.

## Reporting bugs

When reporting bugs, please include:

1. A clear description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment details (Node version, OS, etc.)
6. Code samples if applicable

## Code of conduct

Be respectful and inclusive, welcome newcomers, accept constructive criticism gracefully, and focus on what's best for the community. Harassment, discriminatory language, personal attacks, and publishing others' private information are unacceptable.

## Licence

By contributing, you agree that your contributions will be licensed under [LICENSE](LICENSE).

Thank you for contributing to svelte-standard-site! 🎉
