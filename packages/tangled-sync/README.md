# @ewanc26/tangled-sync

CLI tool that clones all repositories under a GitHub user, pushes them to [Tangled](https://tangled.sh) mirrors, injects a Tangled mirror link into each README, and publishes `sh.tangled.repo` records to AT Protocol.

Part of the [`@ewanc26/pkgs`](https://github.com/ewanc26/pkgs) monorepo.

## Installation

```bash
npm install -g @ewanc26/tangled-sync
# or
pnpm add -g @ewanc26/tangled-sync
```

Or run without installing:

```bash
npx @ewanc26/tangled-sync
```

## Setup

Create a `.env` file in your working directory:

```env
BASE_DIR=/path/to/local/clone/directory
GITHUB_USER=your-github-username
ATPROTO_DID=did:plc:your-did
BLUESKY_PDS=https://your-pds.example.com
BLUESKY_USERNAME=you.bsky.social
BLUESKY_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Ensure your Tangled SSH key is configured — the script will attempt to create Tangled remotes, which requires valid SSH authentication.

## Usage

Test your AT Protocol connection first:

```bash
tangled-sync-test-atproto
```

Run the health check:

```bash
tangled-sync-check
```

Run the sync:

```bash
tangled-sync          # sync new repos only
tangled-sync --force  # force sync all repos
```

What happens:

1. Authenticates with Bluesky
2. Clones all GitHub repos under `GITHUB_USER` (skips the `<username>/<username>` profile repo)
3. Adds a `tangled` remote to each repo if missing
4. Pushes the `main` branch to Tangled
5. Injects a Tangled mirror link into each README if not already present
6. Creates `sh.tangled.repo` ATProto records for each repo

The sync is idempotent — existing remotes and ATProto records are checked before creation.

## Notes

- Record keys use TIDs (Timestamp Identifiers) to ensure uniqueness
- Repos that fail to push to Tangled are logged and skipped; the rest continue
- `BASE_DIR` is created automatically if it doesn't exist

## Licence

AGPL-3.0-only.
