# Contributing to svelte-standard-site

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher

### Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/ewanc26/svelte-standard-site.git
cd svelte-standard-site
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file:

```bash
cp .env.example .env
# Edit .env and add your PUBLIC_ATPROTO_DID
```

4. Start the development server:

```bash
pnpm dev
```

## Development Workflow

### Project Structure

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

### Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build the library
- `pnpm check` - Run type checking
- `pnpm format` - Format code with Prettier
- `pnpm lint` - Check code formatting
- `pnpm prepack` - Prepare package for publishing

## Making Changes

### Code Style

- We use Prettier for code formatting
- Run `pnpm format` before committing
- TypeScript strict mode is enabled
- Follow the existing code structure and patterns

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or tooling changes

Example:

```
feat: add support for custom PDS endpoints
fix: resolve caching issue with blob URLs
docs: update README with new examples
```

### Pull Request Process

1. Create a new branch:

```bash
git checkout -b feat/your-feature-name
```

2. Make your changes and commit them:

```bash
git add .
git commit -m "feat: add your feature"
```

3. Push to your fork:

```bash
git push origin feat/your-feature-name
```

4. Open a Pull Request on GitHub

5. Ensure:
   - Code passes type checking (`pnpm check`)
   - Code is properly formatted (`pnpm format`)
   - Documentation is updated if needed
   - Examples are added for new features

## What to Contribute

### Good First Issues

Look for issues labeled `good first issue` for beginner-friendly tasks.

### Areas for Contribution

- **Bug Fixes**: Report and fix bugs
- **Features**: Implement new features (discuss in an issue first)
- **Documentation**: Improve or expand documentation
- **Examples**: Add new usage examples
- **Components**: Create new reusable components
- **Tests**: Add or improve test coverage
- **Performance**: Optimize existing code

## Reporting Bugs

When reporting bugs, please include:

1. A clear description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment details (Node version, OS, etc.)
6. Code samples if applicable

## Feature Requests

For feature requests:

1. Check if the feature already exists or is planned
2. Open an issue describing:
   - The problem you're trying to solve
   - Your proposed solution
   - Any alternatives you've considered
   - Examples of the desired behavior

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment of any kind
- Discriminatory language or actions
- Personal attacks
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Questions?

Feel free to:

- Open an issue for questions
- Start a discussion in GitHub Discussions
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](./LICENSE).

Thank you for contributing to svelte-standard-site! 🎉
