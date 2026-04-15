# Jasper

Convert Instagram data exports into posts on [Grain.social](https://grain.social) — a photo-sharing platform.

## What it does

Jasper imports your Instagram photos to Grain while preserving original timestamps. Your memories appear with their original dates, not the import date.

### Features

- **Preserves timestamps** — Photos appear with their original Instagram dates
- **Handles all export formats** — Works with 2022, 2023, 2024, and 2025 Instagram exports
- **Skips duplicates** — Already-imported photos are detected and skipped
- **Dry run mode** — Preview what would be imported before committing
- **OAuth authentication** — Secure login via your existing AT Protocol identity

## Installation

```bash
pnpm install -g @ewanc26/jasper
```

Or use directly with npx:

```bash
npx @ewanc26/jasper -i instagram-export.zip --dry-run
```

## Usage

### Interactive Mode

Run without arguments for guided prompts:

```bash
jasper
```

### Command Line

```bash
# Import from ZIP
jasper -i instagram-export.zip

# Import from extracted directory
jasper -i instagram-export/

# Preview without posting (dry run)
jasper -i instagram-export.zip --dry-run

# Limit to first 50 posts
jasper -i instagram-export.zip --limit 50

# Skip confirmation prompts
jasper -i instagram-export.zip -y

# More verbose output
jasper -i instagram-export.zip -v
```

### Authentication

#### OAuth (Recommended)

```bash
# Sign in via browser
jasper --oauth-login

# Sessions are stored in ~/.jasper/oauth.json
```

#### App Password

If OAuth isn't available, you can use an app password:

```bash
jasper -i export.zip --handle your.handle --password your-app-password
```

Generate an app password at [bsky.app/settings/app-passwords](https://bsky.app/settings/app-passwords).

## Getting Your Instagram Export

1. Go to [Instagram's download page](https://accountscenter.instagram.com/info_and_permissions/dgp/)
2. Request a download of your information
3. Select "Some of your information" → "Posts" and "Archived posts"
4. Choose JSON format
5. Download the ZIP file when ready

Jasper will locate `posts_1.json` automatically, handling all export format variations.

## What Gets Imported

- ✅ Photos (JPEG, PNG, WebP, GIF)
- ✅ Original timestamps
- ✅ Captions (as alt text)
- ✅ Carousel posts (multiple photos)

What's **not** imported:

- ❌ Videos (Grain doesn't support video posts yet)
- ❌ Stories
- ❌ Reels

## Options

| Option               | Description                                        |
| -------------------- | -------------------------------------------------- |
| `-i, --input <path>` | Path to Instagram export ZIP or directory          |
| `--dry-run`          | Preview posts without importing                    |
| `--limit <N>`        | Import at most N posts                             |
| `--reverse`          | Process newest posts first (default: oldest first) |
| `-v, --verbose`      | Enable debug logging                               |
| `-q, --quiet`        | Suppress non-essential output                      |
| `-y, --yes`          | Skip confirmation prompts                          |
| `--oauth-login`      | Sign in via OAuth                                  |
| `--logout [DID]`     | Sign out (removes stored session)                  |
| `--list-sessions`    | List stored OAuth sessions                         |

## Data Storage

All data stays on your machine:

| Location                   | Content              |
| -------------------------- | -------------------- |
| `~/.jasper/oauth.json`     | OAuth session tokens |
| `~/.jasper/logs/`          | Debug log files      |
| `~/.jasper/oauth-session/` | OAuth session cache  |

No data is sent to any server except your chosen Grain account.

## Requirements

- Node.js 18+
- A [Grain.social](https://grain.social) account (use your existing AT Protocol identity)

## References

- [Grain.social](https://grain.social) — Target platform
- [Instagram Export Help](https://help.instagram.com/181231772500920) — Downloading your data
- [Pixelfed AccountImport.vue](https://github.com/pixelfed/pixelfed/blob/dev/resources/assets/components/AccountImport.vue) — Reference implementation for parsing Instagram exports

## License

AGPL-3.0-only — See [LICENCE](./LICENCE)

## Privacy

See [PRIVACY.md](./PRIVACY.md) for privacy policy.
